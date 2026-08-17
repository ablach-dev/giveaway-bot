import { NextRequest, NextResponse } from "next/server";

const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID || "";
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET || "";

/**
 * Gets an OAuth App Access Token for enriching metadata from the official API.
 */
async function getOAuthToken(): Promise<string | null> {
  if (!KICK_CLIENT_ID || !KICK_CLIENT_SECRET) return null;
  try {
    const res = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: KICK_CLIENT_ID,
        client_secret: KICK_CLIENT_SECRET,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.access_token || null;
    }
  } catch (err: any) {
    console.warn("[OAuth] Error:", err.message);
  }
  return null;
}

/**
 * Resolves the chatroom ID using a CORS proxy.
 * 
 * WHY THIS IS THE PRIMARY STRATEGY:
 * - Kick's v1/v2 API endpoints return 403 from Node.js (Cloudflare WAF)
 * - Kick's HTML pages return 403 from Node.js (Cloudflare WAF)
 * - The official API (/public/v1/channels) does NOT expose chatroom_id
 * - allorigins.win proxies the request through their servers which have
 *   different TLS fingerprints and can bypass Cloudflare
 * 
 * Verified working: returns chatroom.id (e.g. 715 for trainwreckstv)
 * vs broadcaster_user_id (e.g. 723) - these are DIFFERENT numbers.
 */
async function resolveViaCorsProxy(slug: string): Promise<any | null> {
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://kick.com/api/v2/channels/${slug}`)}`,
  ];

  try {
    // Race all proxies; the first one to resolve with a valid chatroom.id wins.
    const result = await Promise.any(
      proxies.map(async (proxyUrl) => {
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`Proxy ${proxyUrl} returned ${res.status}`);

        const raw = await res.text();
        let channelData: any;

        try {
          const parsed = JSON.parse(raw);
          if (parsed.contents) {
            channelData = JSON.parse(parsed.contents);
          } else if (parsed.chatroom) {
            channelData = parsed;
          }
        } catch {
          throw new Error(`Failed to parse proxy response from ${proxyUrl}`);
        }

        if (channelData?.chatroom?.id) {
          console.log(`[Resolver] ✅ Proxy resolved chatroom.id = ${channelData.chatroom.id} via ${proxyUrl.split('?')[0]}`);
          return channelData;
        }
        
        throw new Error(`Valid chatroom.id not found in response from ${proxyUrl}`);
      })
    );
    return result;
  } catch (err: any) {
    // console.warn(`[Resolver] All proxies failed: ${err.message || "AggregateError"}`);
  }

  return null;
}

/**
 * Fallback: try direct v2 API call (usually blocked by Cloudflare, but worth attempting)
 */
async function resolveDirectV2(slug: string): Promise<any | null> {
  const endpoints = [
    `https://kick.com/api/v2/channels/${slug}`,
    `https://kick.com/api/v1/channels/${slug}`,
  ];

  for (const url of endpoints) {
    try {
      // console.log(`[Resolver] Trying direct: ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: `https://kick.com/${slug}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.chatroom?.id) {
          // console.log(`[Resolver] ✅ Direct resolved chatroom.id = ${data.chatroom.id}`);
          return data;
        }
      } else {
        // console.warn(`[Resolver] Direct ${url} returned ${res.status}`);
      }
    } catch (err: any) {
      // console.warn(`[Resolver] Direct error: ${err.message}`);
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase();
    // console.log(`\n[Resolver] ======= Resolving: ${cleanUsername} =======`);

    // Try CORS proxy first (proven working strategy), then direct API as fallback
    let channelData = await resolveViaCorsProxy(cleanUsername);
    
    if (!channelData) {
      channelData = await resolveDirectV2(cleanUsername);
    }

    if (channelData?.chatroom?.id) {
      const chatroomId = channelData.chatroom.id;

      // Optionally enrich with official API for live status
      let isLive = !!channelData.livestream;
      let title = channelData.livestream?.session_title || null;
      let viewers = channelData.livestream?.viewer_count || 0;

      // Quick check via official API if we have credentials
      const token = await getOAuthToken();
      if (token) {
        try {
          const offRes = await fetch(`https://api.kick.com/public/v1/channels?slug=${cleanUsername}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            signal: AbortSignal.timeout(3000),
          });
          if (offRes.ok) {
            const offData = await offRes.json();
            if (offData?.data?.[0]) {
              isLive = offData.data[0].is_live ?? isLive;
            }
          }
        } catch {
          // Non-critical, ignore
        }
      }

      // console.log(`[Resolver] ✅ Final: chatroomId=${chatroomId}, slug=${channelData.slug}`);

      return NextResponse.json({
        success: true,
        chatroomId,
        slug: channelData.slug || cleanUsername,
        username: channelData.user?.username || channelData.slug || cleanUsername,
        profilePic: channelData.user?.profile_pic || null,
        followersCount: channelData.followers_count || 0,
        isLive,
        title,
        viewers,
      });
    }

    // All strategies failed
    // console.warn(`[Resolver] ❌ All strategies failed for: ${cleanUsername}`);
    return NextResponse.json({
      error: "Could not resolve channel. All lookup strategies were blocked.",
      blocked: true,
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Resolver] Critical error:", error);
    return NextResponse.json({
      error: "Internal server error.",
      details: error.message,
    }, { status: 500 });
  }
}
