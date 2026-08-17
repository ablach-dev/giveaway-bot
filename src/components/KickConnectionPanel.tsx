import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Key } from "lucide-react";

interface KickConnectionPanelProps {
  onConnect: (chatroomId: number, channelData: any) => void;
  onDisconnect: () => void;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  connectionError: string;
  channelData: any;
}

export default function KickConnectionPanel({
  onConnect,
  onDisconnect,
  connectionStatus,
  connectionError,
  channelData
}: KickConnectionPanelProps) {
  const [username, setUsername] = useState("");
  const [manualId, setManualId] = useState("");
  const [isManualMode, setIsManualMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    
    const chatroomId = parseInt(manualId.trim(), 10);
    if (isNaN(chatroomId)) {
      setErrorMessage("Chatroom ID must be a number");
      return;
    }

    setErrorMessage("");
    const fallbackData = {
      chatroomId,
      slug: username || "manual-connection",
      username: username || "Manual Connection",
      profilePic: null,
      followersCount: 0,
      isLive: false,
      title: "Manual ID Connection",
      viewers: 0
    };
    
    onConnect(chatroomId, fallbackData);
  };

  const handleResolveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setErrorMessage("");

    const cleanUsername = username.trim().toLowerCase();

    try {
      // PRIMARY: Use our server-side resolver
      console.log(`[Panel] Resolving channel via server API: ${cleanUsername}`);
      const response = await fetch(`/api/kick-channel?username=${encodeURIComponent(cleanUsername)}`);
      
      let data: any = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.warn("[Panel] API returned non-JSON response (likely 404 HTML page):", parseErr);
      }

      if (response.ok && data?.success && data?.chatroomId) {
        console.log(`[Panel] Server resolved chatroomId: ${data.chatroomId}`);
        onConnect(data.chatroomId, data);
        setIsLoading(false);
        return;
      }

      // FALLBACK 1: Direct browser fetch (works with CORS extension enabled)
      console.log("[Panel] Server resolver failed. Attempting direct browser fetch...");
      try {
        const directResponse = await fetch(`https://kick.com/api/v1/channels/${cleanUsername}`);
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData?.chatroom?.id) {
            console.log(`[Panel] Direct browser fetch resolved chatroomId: ${directData.chatroom.id}`);
            const mappedData = {
              chatroomId: directData.chatroom.id,
              slug: directData.slug,
              username: directData.user?.username || directData.slug,
              profilePic: directData.user?.profile_pic || null,
              followersCount: directData.followers_count || 0,
              isLive: !!directData.livestream,
              title: directData.livestream?.session_title || null,
              viewers: directData.livestream?.viewer_count || 0,
            };
            onConnect(directData.chatroom.id, mappedData);
            setIsLoading(false);
            return;
          }
        }
      } catch (directErr) {
        console.warn("[Panel] Direct browser fetch blocked:", directErr);
      }

      // FALLBACK 2: Client-side CORS proxies
      console.log("[Panel] Attempting client-side CORS proxies...");
      const proxyUrls = [
        `https://corsproxy.io/?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${cleanUsername}`)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${cleanUsername}`)}`
      ];

      for (const proxyUrl of proxyUrls) {
        try {
          const proxyResponse = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
          let parsedChannel: any = null;
          
          if (proxyUrl.includes("allorigins")) {
            const proxyData = await proxyResponse.json();
            if (proxyData?.contents) parsedChannel = JSON.parse(proxyData.contents);
          } else {
            parsedChannel = await proxyResponse.json();
          }

          if (parsedChannel?.chatroom?.id) {
            console.log(`[Panel] CORS proxy resolved chatroomId: ${parsedChannel.chatroom.id}`);
            const mappedData = {
              chatroomId: parsedChannel.chatroom.id,
              slug: parsedChannel.slug,
              username: parsedChannel.user?.username || parsedChannel.slug,
              profilePic: parsedChannel.user?.profile_pic || null,
              followersCount: parsedChannel.followers_count || 0,
              isLive: !!parsedChannel.livestream,
              title: parsedChannel.livestream?.session_title || null,
              viewers: parsedChannel.livestream?.viewer_count || 0,
            };
            onConnect(parsedChannel.chatroom.id, mappedData);
            setIsLoading(false);
            return;
          }
        } catch (proxyErr) {
          console.warn("[Panel] CORS proxy failed:", proxyErr);
        }
      }

      setErrorMessage("Cloudflare blocked auto-lookup. Please enter Chatroom ID manually.");
      setIsManualMode(true);
    } catch (err: any) {
      console.error("[Panel] Resolution error:", err);
      setErrorMessage("Connection failed. Enter Chatroom ID manually.");
      setIsManualMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bento-card rounded-3xl p-5.5 relative overflow-hidden transition-all duration-300 h-[195px] flex flex-col justify-between font-sans">
      <div className="absolute top-0 right-0 w-20 h-20 bg-kick/5 rounded-full blur-2xl pointer-events-none" />

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="absolute left-3 right-3 bottom-[58px] z-20 animate-fadeIn">
          <div className="bg-red-950/90 backdrop-blur-sm border border-red-900/50 px-3 py-1.5 rounded-xl text-[10px] text-red-200 leading-snug flex items-center gap-1.5 select-none shadow-lg shadow-red-950/30">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{errorMessage}</span>
            <button onClick={() => setErrorMessage("")} className="ml-auto text-red-400/60 hover:text-red-300 text-sm leading-none shrink-0 cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900/50 pb-2 select-none shrink-0">
        <h2 className="text-sm font-bold font-display text-white flex items-center gap-1.5 py-1">
          <Wifi className={`w-4 h-4 ${connectionStatus === "connected" ? "text-kick animate-pulse" : "text-zinc-500"}`} />
          {connectionStatus === "connected" ? "Connected" : "Resolve Channel"}
        </h2>
      </div>

      {/* Content Form */}
      <div className="flex-1 flex flex-col justify-center py-2">
        {connectionStatus === "connected" && channelData ? (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between bg-[#111111]/35 border border-zinc-900/60 p-3.5 rounded-2xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold text-white text-base truncate leading-tight">{channelData.username}</h3>
                </div>
              </div>
            </div>

            <button
              onClick={onDisconnect}
              className="w-full bg-red-950/15 hover:bg-red-900/30 border border-red-900/30 text-red-300 font-bold py-2.5 px-4 rounded-full transition-all duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-display tracking-wide uppercase shadow-sm"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        ) : isManualMode ? (
          <form onSubmit={handleManualConnect} className="space-y-3.5 font-sans animate-fadeIn">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none">
                  Manual Chatroom ID
                </label>
                <button type="button" onClick={() => setIsManualMode(false)} className="text-[9px] text-kick hover:text-kick-hover uppercase font-bold tracking-wider">
                  Back to Auto
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Key className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 715"
                  className="w-full bg-[#050505] border border-zinc-900 hover:border-zinc-800 pl-9 pr-4 py-2 rounded-2xl text-white placeholder-zinc-700 text-xs font-semibold glow-border-kick transition-all duration-200"
                />
              </div>
            </div>



            <button
              type="submit"
              disabled={!manualId}
              className="w-full bg-kick hover:bg-kick-hover text-obsidian py-2.5 px-6 rounded-full text-xs font-display tracking-wider font-extrabold uppercase shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Wifi className="w-3.5 h-3.5 text-obsidian" />
              Connect Manually
            </button>
          </form>
        ) : (
          <form onSubmit={handleResolveChannel} className="space-y-3.5 font-sans animate-fadeIn">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none">
                  Kick Username
                </label>
                <button type="button" onClick={() => setIsManualMode(true)} className="text-[9px] text-zinc-500 hover:text-zinc-300 uppercase font-bold tracking-wider transition-colors">
                  Manual ID
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-650 text-xs select-none font-bold">
                  kick.com/
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                  placeholder="streamer"
                  disabled={isLoading || connectionStatus === "connecting"}
                  className="w-full bg-[#050505] border border-zinc-900 hover:border-zinc-800 pl-[74px] pr-4 py-2 rounded-2xl text-white placeholder-zinc-700 text-xs font-semibold glow-border-kick transition-all duration-200"
                />
              </div>
            </div>



            <button
              type="submit"
              disabled={isLoading || connectionStatus === "connecting"}
              className="w-full bg-kick hover:bg-kick-hover text-obsidian py-2.5 px-6 rounded-full text-xs font-display tracking-wider font-extrabold uppercase shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-obsidian" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-obsidian" />
              )}
              {isLoading ? "Connecting..." : "Connect Chat Live"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
