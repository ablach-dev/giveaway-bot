import Pusher from "pusher-js";

export interface KickChatBadge {
  type: string;
  text: string;
  count?: number;
}

export interface KickChatMessage {
  id: string;
  chatroomId: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    color: string;
    isSubscriber: boolean;
    isModerator: boolean;
    isBroadcaster: boolean;
    followingSince?: string | null;
    badges: KickChatBadge[];
  };
}

class KickChatService {
  private pusher: Pusher | null = null;
  private channelName: string | null = null;

  /**
   * Connects to a Kick.com chatroom using Pusher WebSocket
   * @param chatroomId The ID of the Kick chatroom
   * @param onMessage Callback when a new message is received
   * @param onStatusChange Callback when connection status changes
   */
  public connect(
    chatroomId: number,
    onMessage: (message: KickChatMessage) => void,
    onStatusChange: (status: "connecting" | "connected" | "disconnected" | "error", message?: string) => void
  ) {
    // If there is an existing connection, disconnect first
    this.disconnect();

    onStatusChange("connecting");

    try {
      // Kick uses the Pusher app key: 32cbd69e4b950bf97679 on the us2 cluster
      this.pusher = new Pusher("32cbd69e4b950bf97679", {
        cluster: "us2",
        forceTLS: true,
      });
      const pusherInstance = this.pusher;

      this.channelName = `chatrooms.${chatroomId}.v2`;
      console.log(`[KickChat] Subscribing to Pusher channel: ${this.channelName}`);
      const channel = this.pusher.subscribe(this.channelName);

      // Listen for Pusher connection events
      this.pusher.connection.bind("connected", () => {
        if (this.pusher !== pusherInstance) return;
        console.log(`[KickChat] Pusher WebSocket connected. Listening on: ${this.channelName}`);
        onStatusChange("connected");
      });

      this.pusher.connection.bind("disconnected", () => {
        if (this.pusher !== pusherInstance) return;
        console.log("[KickChat] Pusher WebSocket disconnected.");
        onStatusChange("disconnected");
      });

      this.pusher.connection.bind("failed", () => {
        if (this.pusher !== pusherInstance) return;
        console.error("[KickChat] Pusher WebSocket connection FAILED.");
        onStatusChange("error", "Pusher WebSocket connection failed.");
      });

      this.pusher.connection.bind("error", (err: any) => {
        console.warn("[KickChat] Pusher diagnostic connection warning:", err);
        // Do not trigger fatal error UI states for minor diagnostic checks,
        // since Pusher automatically negotiates optimal fallbacks.
      });

      // Channel-level subscription events
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[KickChat] ✅ Successfully subscribed to: ${this.channelName}`);
      });

      channel.bind("pusher:subscription_error", (err: any) => {
        console.error(`[KickChat] ❌ Subscription error on ${this.channelName}:`, err);
      });

      // Define the message parsing handler
      const handleChatMessage = (data: any) => {
        try {
          // Sometimes Pusher sends payloads as raw stringified JSON
          const rawMessage = typeof data === "string" ? JSON.parse(data) : data;

          if (!rawMessage || !rawMessage.sender) return;

          // Parse badges to detect Sub / Mod / Streamer status
          const badgesList: KickChatBadge[] = rawMessage.sender.identity?.badges || [];
          const isSubscriber = badgesList.some(b => b.type === "subscriber" || b.type === "sub" || b.type === "sub_gifter");
          const isModerator = badgesList.some(b => b.type === "moderator" || b.type === "mod");
          const isBroadcaster = badgesList.some(b => b.type === "broadcaster" || b.type === "owner" || b.type === "streamer");

          const chatMessage: KickChatMessage = {
            id: rawMessage.id || Math.random().toString(36).substring(2),
            chatroomId: Number(rawMessage.chatroom_id || chatroomId),
            content: rawMessage.content || "",
            createdAt: rawMessage.created_at || new Date().toISOString(),
            sender: {
              id: rawMessage.sender.id,
              username: rawMessage.sender.username || "Anonymous",
              slug: rawMessage.sender.slug || "anonymous",
              color: rawMessage.sender.identity?.color || "#dc2626",
              isSubscriber,
              isModerator,
              isBroadcaster: isBroadcaster || rawMessage.sender.slug === "broadcaster",
              followingSince: rawMessage.sender.identity?.following_since || rawMessage.sender.following_since || null,
              badges: badgesList,
            },
          };

          onMessage(chatMessage);
        } catch (err) {
          console.error("[KickChat] Error parsing message payload:", err, data);
        }
      };

      // Bind to BOTH known event names for maximum compatibility.
      // Kick's Laravel backend broadcasts as "App\Events\ChatMessageSentEvent"
      // but some implementations also reference "App\Events\ChatMessageEvent".
      channel.bind("App\\Events\\ChatMessageSentEvent", handleChatMessage);
      channel.bind("App\\Events\\ChatMessageEvent", handleChatMessage);

      // Also bind to a catch-all to log ANY event we receive (debug)
      channel.bind_global((eventName: string, data: any) => {
        if (
          eventName !== "App\\Events\\ChatMessageSentEvent" &&
          eventName !== "App\\Events\\ChatMessageEvent" &&
          eventName !== "pusher:subscription_succeeded" &&
          eventName !== "pusher_internal:subscription_succeeded"
        ) {
          console.log(`[KickChat] Received event: ${eventName}`, typeof data === "object" ? "(object)" : data);
        }
      });

    } catch (err: any) {
      console.error("[KickChat] Failed to initialize Pusher connection:", err);
      onStatusChange("error", err?.message || "Initialization failed");
    }
  }

  /**
   * Disconnects from Kick's chat WebSocket
   */
  public disconnect() {
    if (this.pusher) {
      try {
        if (this.channelName) {
          this.pusher.unsubscribe(this.channelName);
        }
        this.pusher.disconnect();
      } catch (err) {
        console.error("[KickChat] Error while disconnecting:", err);
      } finally {
        this.pusher = null;
        this.channelName = null;
      }
    }
  }
}

export const kickChat = new KickChatService();
