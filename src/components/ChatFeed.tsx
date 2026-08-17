import React, { useRef, useEffect, useState } from "react";
import { MessageSquare, Star, Shield, Lock, Terminal } from "lucide-react";
import { KickChatMessage } from "@/services/kickChat";

interface ChatFeedProps {
  messages: KickChatMessage[];
  isGiveawayActive: boolean;
  entryType: "keyword" | "active";
  keyword: string;
  entrants: any[];
  restrictToSubs: boolean;
}

export default function ChatFeed({
  messages,
  isGiveawayActive,
  entryType,
  keyword,
  entrants,
  restrictToSubs
}: ChatFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll handler
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const isEntryMessage = (msg: KickChatMessage) => {
    // If they are already an entrant, their messages remain highlighted as "Entered"
    if (entrants.some(e => e.slug === msg.sender.slug)) return true;
    
    if (!isGiveawayActive) return false;
    if (restrictToSubs && !msg.sender.isSubscriber) return false;

    if (entryType === "active") return true;
    return msg.content.trim().toLowerCase() === keyword.trim().toLowerCase();
  };

  return (
    <div className="bento-card rounded-3xl p-5.5 relative overflow-hidden flex flex-col h-full transition-all duration-300 font-sans">
      <div className="absolute top-0 right-0 w-24 h-24 bg-kick/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-zinc-900/50 pb-3.5 select-none">
        <h2 className="text-sm font-bold font-display tracking-tight text-white flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-kick" />
          Live Chat Feed
        </h2>
      </div>

      {/* Terminal-like Scroll Feed */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden flex flex-col space-y-2 pb-2 text-xs leading-relaxed select-text pr-1"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-650 gap-2 select-none">
            <MessageSquare className="w-8 h-8 opacity-25 text-zinc-550" />
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Waiting for chat activity...
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isEntry = isEntryMessage(msg);
            return (
              <div
                key={msg.id}
                className="shrink-0 py-2 px-3.5 rounded-2xl border transition-all duration-150 bg-obsidian/30 border-transparent hover:bg-obsidian/55 hover:border-zinc-900"
              >
                <div className="flex flex-wrap items-baseline gap-1.5 text-[11px]">
                  {/* Badges */}
                  <div className="flex items-center gap-0.5 inline-flex shrink-0 select-none mr-0.5">
                    {msg.sender.isBroadcaster && (
                      <span className="bg-kick/10 border border-kick/20 text-kick text-[7.5px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        HOST
                      </span>
                    )}
                    {msg.sender.isModerator && (
                      <span className="bg-kick/10 border border-kick/20 text-kick px-1.5 py-0.2 rounded-full text-[7.5px] font-bold uppercase">
                        MOD
                      </span>
                    )}
                    {msg.sender.isSubscriber && (
                      <span className="bg-kick text-obsidian p-0.5 rounded-full mr-0.5 border border-kick/10">
                        <Star className="w-2.5 h-2.5 fill-obsidian" />
                      </span>
                    )}
                  </div>

                  {/* Username */}
                  <span
                    style={{ color: msg.sender.color }}
                    className="font-bold shrink-0 truncate mr-1"
                  >
                    {msg.sender.username}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[9px] text-zinc-550 mr-1.5 shrink-0 select-none">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false
                    })}
                  </span>
                </div>

                {/* Message Content */}
                <p className="mt-1 text-xs break-words leading-relaxed text-zinc-300">
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
