import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Users, Star, TrendingUp, ShieldCheck, MessageSquare, Award, ArrowDown, Trophy, Weight, X, List, Trash2 } from "lucide-react";
import { GiveawayEntrant } from "@/hooks/useGiveawayManager";
import { KickChatMessage } from "@/services/kickChat";

interface EntrantsListProps {
  entrants: GiveawayEntrant[];
  onRemoveEntrant: (username: string) => void;
  isGiveawayActive: boolean;
  onOpenProvablyFair: () => void;
  chatMessages?: KickChatMessage[];
  pastWinners?: GiveawayEntrant[];
  onSelectWinner?: (winner: GiveawayEntrant) => void;
  onRemoveWinner?: (slug: string) => void;
}

export default function EntrantsList({
  entrants,
  onRemoveEntrant,
  isGiveawayActive,
  onOpenProvablyFair,
  chatMessages = [],
  pastWinners = [],
  onSelectWinner,
  onRemoveWinner
}: EntrantsListProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAllWinnersModalOpen, setIsAllWinnersModalOpen] = useState(false);

  // Filter winner messages
  const winnerMessages = useMemo(() => {
    if (!pastWinners || pastWinners.length === 0) return [];
    return chatMessages.filter(msg =>
      pastWinners.some(w => w.slug === msg.sender.slug)
    );
  }, [chatMessages, pastWinners]);

  const prevMessageCount = useRef(winnerMessages.length);

  // Check if user is near the bottom
  const checkIfAtBottom = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const threshold = 150;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
    }
  }, []);

  // Track scroll position
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkIfAtBottom, { passive: true });
    return () => el.removeEventListener("scroll", checkIfAtBottom);
  }, [checkIfAtBottom]);

  // Auto-scroll when new winner messages arrive (only if already at bottom)
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const newCount = winnerMessages.length - prevMessageCount.current;
    prevMessageCount.current = winnerMessages.length;

    if (isAtBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (newCount > 0) {
      setUnreadCount((prev) => prev + newCount);
    }
  }, [winnerMessages, isAtBottom]);

  const scrollToBottom = () => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    setIsAtBottom(true);
    setUnreadCount(0);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = entrants.length;
    if (total === 0) return { subs: 0, subPercent: 0, totalWeight: 0 };
    const subs = entrants.filter(e => e.isSubscriber).length;
    const subPercent = Math.round((subs / total) * 100);
    const totalWeight = entrants.reduce((sum, e) => sum + e.weight, 0);
    return { subs, subPercent, totalWeight };
  }, [entrants]);


  return (
    <div className="bento-card rounded-3xl p-6 relative overflow-hidden transition-all duration-300 flex flex-col h-full font-sans">
      <div className="absolute top-0 right-0 w-32 h-32 bg-kick/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Stats */}
      <div className="flex flex-col gap-4 border-b border-zinc-900/50 pb-5 mb-5 select-none">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-kick" />
            Entrant Pool
          </h2>
          
            <button
              onClick={onOpenProvablyFair}
              className="text-[11px] font-bold text-zinc-400 hover:text-kick transition-all flex items-center gap-1.5 cursor-pointer bg-zinc-900/40 hover:bg-kick/5 border border-zinc-800/80 hover:border-kick/25 px-3 py-1.5 rounded-xl shrink-0"
              title="Verify Cryptographic Outcomes"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-kick" />
              Provably Fair
            </button>
          </div>

        {/* Statistical Summary Panel */}
        {entrants.length > 0 && (
          <div className="grid grid-cols-3 gap-3.5 pt-1 text-sans">
            {/* Stat: Total Pool */}
            <div className="bg-[#111111]/30 border border-zinc-900/80 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-kick/10 flex items-center justify-center shrink-0 border border-kick/5">
                <Users className="w-4 h-4 text-kick" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Entrants</span>
                <span className="text-base font-extrabold text-white leading-tight font-display">{entrants.length}</span>
              </div>
            </div>

            {/* Stat: Subscribers Ratio */}
            <div className="bg-[#111111]/30 border border-zinc-900/80 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-kick/10 flex items-center justify-center shrink-0 border border-kick/5">
                <Star className="w-4 h-4 text-kick fill-kick/5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Subscribers</span>
                <span className="text-base font-extrabold text-white leading-tight font-display">
                  {stats.subPercent}% <span className="text-xs text-zinc-500 font-semibold font-sans">({stats.subs})</span>
                </span>
              </div>
            </div>

            {/* Stat: Total Weight */}
            <div className="bg-[#111111]/30 border border-zinc-900/80 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-kick/10 flex items-center justify-center shrink-0 border border-kick/5">
                <Weight className="w-4 h-4 text-kick" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Weight</span>
                <span className="text-base font-extrabold text-white leading-tight font-display">{stats.totalWeight}</span>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Winner Chat Feed (Replaces Entrant Table) */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={feedRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden flex flex-col space-y-2 pr-1 pt-2"
        >
          {(!pastWinners || pastWinners.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-650 gap-3 select-none">
              <div className="text-center font-sans">
                <p className="font-bold text-xs text-zinc-450 uppercase tracking-wider">Waiting for Winners</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mt-1.5 leading-relaxed px-4 font-medium">
                  The winners' live chat feed will appear here once they have been picked.
                </p>
              </div>
            </div>
          ) : (
            (() => {
              if (winnerMessages.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-650 gap-2 select-none">
                    <MessageSquare className="w-6 h-6 opacity-25 text-zinc-550" />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Waiting for winners to chat...
                    </p>
                  </div>
                );
              }

              return winnerMessages.map((msg, idx) => (
                <div key={`${msg.id}-${idx}`} className="py-2.5 px-3.5 bg-obsidian/30 hover:bg-obsidian/55 rounded-xl border border-transparent hover:border-zinc-900 transition-colors shrink-0">
                  <div className="flex flex-wrap items-baseline gap-1.5 text-[11px] mb-1">
                    <span style={{ color: msg.sender.color }} className="font-bold truncate max-w-[150px]">
                      {msg.sender.username}
                    </span>
                    <span className="text-[9px] text-zinc-550">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-[11px] break-words">
                    {msg.content}
                  </p>
                </div>
              ));
            })()
          )}
        </div>

        {/* Scroll to Bottom Button */}
        {!isAtBottom && winnerMessages.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-kick/90 hover:bg-kick text-obsidian font-extrabold text-[10px] uppercase tracking-wider pl-3 pr-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-kick/20 hover:shadow-kick/30 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-fadeIn backdrop-blur-sm"
          >
            <ArrowDown className="w-3 h-3" />
            {unreadCount > 0 ? `${unreadCount} new` : "Latest"}
          </button>
        )}
      </div>

      {/* Recent Winners Bottom Segment */}
      {pastWinners && pastWinners.length > 0 && (
        <div className="border-t border-zinc-900/60 mt-4 pt-4 shrink-0 flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 overflow-hidden pr-2 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1.5 select-none">
              <Trophy className="w-3.5 h-3.5 text-zinc-550" />
              Recent Winners
            </span>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {pastWinners.slice(0, 3).map((w, idx) => (
                <button
                  key={`${w.slug}-${idx}`}
                  onClick={() => onSelectWinner?.(w)}
                  className="flex items-center gap-1.5 bg-obsidian/40 hover:bg-white/5 border border-zinc-900/60 px-3 h-7 rounded-lg transition-colors cursor-pointer min-w-0 max-w-[120px]"
                >
                  <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">#{pastWinners.length - idx}</span>
                  <span style={{ color: w.color }} className="text-xs font-bold truncate min-w-0">{w.username}</span>
                </button>
              ))}
            </div>
          </div>
          {pastWinners.length > 3 && (
            <button 
              onClick={() => setIsAllWinnersModalOpen(true)}
              className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-900/40 hover:bg-zinc-800 px-3 h-7 rounded-lg transition-colors cursor-pointer shrink-0 border border-zinc-800/80"
            >
              <List className="w-3.5 h-3.5" />
              Show All
            </button>
          )}
        </div>
      )}

      {/* All Winners Modal */}
      {isAllWinnersModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/85 backdrop-blur-[2px] px-4" onClick={() => setIsAllWinnersModalOpen(false)}>
          <div className="bento-card rounded-3xl p-6 relative overflow-hidden transition-all duration-300 flex flex-col w-full max-w-lg max-h-[75vh] animate-fadeIn" style={{ background: 'rgb(18, 18, 18)', backdropFilter: 'none' }} onClick={(e) => e.stopPropagation()}>
            {/* Absolute decorative top-right badge effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-kick/5 rounded-full blur-3xl pointer-events-none" />
            
            <button 
              onClick={() => setIsAllWinnersModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-900 rounded-xl cursor-pointer transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold font-display text-white mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-kick" />
              All Winners
            </h2>
            <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-2 pr-2 custom-scrollbar">
              {pastWinners.map((w, idx) => (
                <div 
                  key={`all-${w.slug}-${idx}`}
                  className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500 w-8">#{pastWinners.length - idx}</span>
                    <span style={{ color: w.color }} className="font-bold text-sm">{w.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWinner?.(w.slug);
                        // If they delete the last winner, close the modal
                        if (pastWinners.length === 1) setIsAllWinnersModalOpen(false);
                      }}
                      className="text-zinc-500 hover:text-red-400 bg-zinc-800/30 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-400/20"
                      title="Remove Winner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAllWinnersModalOpen(false);
                        onSelectWinner?.(w);
                      }}
                      className="text-xs font-bold text-kick hover:text-kick-hover bg-kick/10 hover:bg-kick/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-kick/20"
                    >
                      View Card
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
