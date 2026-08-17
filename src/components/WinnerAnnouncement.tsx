import React, { useState, useEffect } from "react";
import { Award, Star, RefreshCw, X, Check, ExternalLink, Calendar, MessageCircle, Trash2, TrendingUp, Copy } from "lucide-react";
import { GiveawayEntrant } from "@/hooks/useGiveawayManager";

interface WinnerAnnouncementProps {
  winner: GiveawayEntrant;
  onClose: () => void;
  onReroll: () => void;
  canReroll: boolean;
  onVerifyProvablyFair?: () => void;
  onRemoveWinner?: () => void;
  channelSlug?: string;
  onUpdateWinner?: (updatedWinner: GiveawayEntrant) => void;
}

export default function WinnerAnnouncement({
  winner,
  onClose,
  onReroll,
  canReroll,
  onVerifyProvablyFair,
  onRemoveWinner,
  channelSlug,
  onUpdateWinner
}: WinnerAnnouncementProps) {
  const [isCopied, setIsCopied] = useState(false);
  const isFollowDataLoading = false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 backdrop-blur-[2px] px-4" onClick={onClose}>
      <div className="bento-card rounded-3xl p-8 relative overflow-hidden transition-all duration-300 flex flex-col items-center text-center w-full max-w-[500px] h-full max-h-[650px] animate-fadeIn" style={{ background: 'rgb(18, 18, 18)', backdropFilter: 'none' }} onClick={(e) => e.stopPropagation()}>
      {/* Absolute decorative top-right logo badge */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-kick/5 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-900 rounded-xl cursor-pointer transition-colors z-20"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Award Badge Placeholder (invisible while loading) */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 select-none transition-all duration-300 ${isFollowDataLoading ? "opacity-0" : "bg-kick/10 border-2 border-kick shadow-[0_0_40px_rgba(220,38,38,0.15)] animate-pulse"}`}>
        {!isFollowDataLoading && <Award className="w-10 h-10 text-kick drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]" />}
      </div>

      {/* Top Labels Placeholder (invisible while loading) */}
      <div className={`flex items-center justify-center gap-2 mb-2 transition-all duration-300 ${isFollowDataLoading ? "opacity-0 invisible" : "opacity-100 visible"}`}>
        <span className="text-[10.5px] font-extrabold tracking-[0.2em] text-[#dc2626] uppercase font-mono select-none flex items-center gap-1.5 opacity-90 drop-shadow-[0_0_12px_rgba(220,38,38,0.2)]">
          {winner.chance}% WINNING CHANCE
        </span>
      </div>

      {/* Glowing Winner Name (Visible always) */}
      <div className={`flex items-center justify-center w-full max-w-full mb-2 transition-all duration-300 px-8 ${isFollowDataLoading ? "animate-pulse" : ""}`}>
        <div className="relative flex items-center justify-center max-w-full">
          <h2
            style={{ color: winner.color }}
            className="text-4xl font-black font-display tracking-tight truncate select-text cursor-text shrink min-w-0"
          >
            {winner.username}
          </h2>
          
          {!isFollowDataLoading && (
            <div className="absolute left-full ml-3 flex items-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(winner.username);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="w-9 h-9 rounded-xl bg-[#0a110d]/80 hover:bg-[#0f1a14] border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-all text-zinc-500 hover:text-white shadow-sm"
                title="Copy Username"
              >
                {isCopied ? <Check className="w-4 h-4 text-[#dc2626]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {isFollowDataLoading ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-[200px] mt-8 flex-1">
          <span className="text-[10px] font-bold tracking-widest text-kick uppercase font-mono animate-pulse">
            Fetching User Data...
          </span>
          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-kick rounded-full w-full animate-pulse" />
          </div>
        </div>
      ) : (
        <>

      <div className="flex items-center gap-1.5 justify-center mb-6 select-none">
        {winner.isSubscriber ? (
          <span className="bg-kick text-obsidian text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <Star className="w-3 h-3 fill-obsidian" />
            Subscriber
          </span>
        ) : (
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-zinc-700">
            Viewer
          </span>
        )}

        {(winner.followingSince && winner.followingSince !== "NOT_FOLLOWING") ? (
          <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <Calendar className="w-2.5 h-2.5 text-zinc-500" />
            Followed {new Date(winner.followingSince).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        ) : null}
      </div>

      {/* Entry Message Content box */}
      <div className="w-full bg-obsidian border border-zinc-800/80 p-5 rounded-2xl text-left flex flex-col flex-1 min-h-0 mb-6">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-2 mb-2 shrink-0 select-none">
          <MessageCircle className="w-3.5 h-3.5 text-zinc-500" />
          Winning Chat Message
        </span>
        <div className="flex-1 overflow-y-auto pr-2">
          <p className="text-white text-sm font-semibold italic pl-1 leading-relaxed break-words font-sans select-text">
            {winner.message}
          </p>
        </div>
        <span className="text-[9px] text-zinc-650 font-mono block pt-2 mt-2 border-t border-zinc-800/50 text-right shrink-0 select-none">
          Chatted at: {new Date(winner.enteredAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(winner.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Action triggers */}
      <div className={`grid ${onRemoveWinner ? "grid-cols-2" : "grid-cols-1"} gap-4 w-full border-t border-zinc-850 pt-6`}>
        <button
          onClick={onReroll}
          disabled={!canReroll}
          className="w-full bg-zinc-900 border border-zinc-800 text-kick font-bold py-3.5 px-4 rounded-xl hover:bg-kick/10 hover:border-kick/30 transition-all duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          Re-roll Winner
        </button>

        {onRemoveWinner && (
          <button
            onClick={onRemoveWinner}
            className="w-full bg-zinc-900 border border-zinc-800 text-red-400 font-bold py-3.5 px-4 rounded-xl hover:bg-red-950/20 hover:border-red-900/30 transition-all duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            Delete Winner
          </button>
        )}
      </div>

      {/* External checker */}
      <div className="flex items-center gap-4 mt-4">
        <a
          href={`https://kick.com/${winner.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-500 hover:text-kick transition-colors font-bold flex items-center gap-1 select-none"
        >
          Verify User Profile
          <ExternalLink className="w-3 h-3" />
        </a>
        
        {onVerifyProvablyFair && (
          <button
            onClick={onVerifyProvablyFair}
            className="text-[10px] text-zinc-500 hover:text-kick transition-colors font-bold flex items-center gap-1 select-none cursor-pointer"
          >
            Verify Provably Fair Result
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
      </>
      )}
      </div>
    </div>
  );
}
