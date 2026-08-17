import React from "react";
import { Sliders, Keyboard, Users, Star, Play, Square, RotateCcw } from "lucide-react";

interface GiveawaySettingsProps {
  entryType: "keyword" | "active";
  setEntryType: (val: "keyword" | "active") => void;
  keyword: string;
  setKeyword: (val: string) => void;
  subLuckMultiplier: number;
  setSubLuckMultiplier: (val: number) => void;
  restrictToSubs: boolean;
  setRestrictToSubs: (val: boolean) => void;
  
  isGiveawayActive: boolean;
  rawEntrantCount: number;
  pastWinnersCount: number;
  startGiveaway: () => void;
  closeEntries: () => void;
  resetGiveaway: () => void;
  isConnected: boolean;
}

export default function GiveawaySettings({
  entryType,
  setEntryType,
  keyword,
  setKeyword,
  subLuckMultiplier,
  setSubLuckMultiplier,
  restrictToSubs,
  setRestrictToSubs,
  isGiveawayActive,
  rawEntrantCount,
  pastWinnersCount,
  startGiveaway,
  closeEntries,
  resetGiveaway,
  isConnected
}: GiveawaySettingsProps) {
  return (
    <div className="bento-card rounded-3xl pt-6 px-6 pb-0 relative overflow-hidden transition-all duration-300 flex flex-col justify-between gap-4 font-sans flex-1 min-h-0">
      <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900/50 pb-3 select-none">
          <h2 className="text-sm font-bold font-display tracking-tight text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-kick" />
            Giveaway Parameters
          </h2>
          {isGiveawayActive && (
            <div className="flex items-center gap-1.5 text-kick text-[9.5px] font-bold uppercase tracking-widest animate-pulse drop-shadow-[0_0_12px_rgba(220,38,38,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-kick inline-block animate-ping" />
              Active
            </div>
          )}
        </div>

        {/* Entry Methods */}
        <div>
          <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-1.5 block select-none">
            Entry Condition
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => !isGiveawayActive && setEntryType("keyword")}
              disabled={isGiveawayActive}
              className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 ${
                entryType === "keyword"
                  ? "border-kick bg-kick/10 text-white font-bold animate-glow"
                  : "border-zinc-900 bg-obsidian/30 hover:bg-obsidian/50 text-zinc-400"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Keyboard className="w-4 h-4 text-kick" />
              <span className="text-[11px] font-medium tracking-tight truncate">Keyword Filter</span>
            </button>
            <button
              type="button"
              onClick={() => !isGiveawayActive && setEntryType("active")}
              disabled={isGiveawayActive}
              className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 ${
                entryType === "active"
                  ? "border-kick bg-kick/10 text-white font-bold animate-glow"
                  : "border-zinc-900 bg-obsidian/30 hover:bg-obsidian/50 text-zinc-400"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Users className="w-4 h-4 text-kick" />
              <span className="text-[11px] font-medium tracking-tight truncate">Active Chatters</span>
            </button>
          </div>
        </div>

        {/* Keyword Setup - HEIGHT REMAINS PERFECTLY STABLE */}
        <div className="space-y-1.5 h-[58px] flex flex-col justify-end">
          <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none">
            Required Keyword
          </label>
          {entryType === "keyword" ? (
            <input
              type="text"
              id="giveaway-keyword"
              name="giveaway-keyword"
              autoComplete="off"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. enter"
              disabled={isGiveawayActive}
              className="w-full bg-[#050505] border border-zinc-900 hover:border-zinc-800 px-4 py-2 rounded-2xl text-white placeholder-zinc-700 text-xs font-semibold glow-border-kick transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ) : (
            <input
              type="text"
              value="Keyword filter disabled (Active Chat)"
              disabled
              className="w-full bg-obsidian/20 border border-zinc-900/60 px-4 py-2 rounded-2xl text-zinc-550 text-xs font-semibold select-none cursor-not-allowed"
            />
          )}
        </div>

        {/* Sub Luck Multiplier */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between select-none text-[10px] font-bold">
            <label className="text-zinc-450 uppercase tracking-wider">
              Subscriber Luck
            </label>
            <span className="text-[9px] font-bold text-zinc-400 bg-obsidian border border-zinc-800 px-2 py-0.5 rounded-md">
              Weight: {subLuckMultiplier}x
            </span>
          </div>
          
          <input
            type="range"
            min="1"
            max="10"
            value={subLuckMultiplier}
            onChange={(e) => setSubLuckMultiplier(parseInt(e.target.value))}
            className="w-full custom-slider"
            style={{
              ["--slider-fill" as any]: `${((subLuckMultiplier - 1) / 9) * 100}%`
            }}
          />
          
          <div className="flex justify-between text-[9px] text-zinc-500 font-bold px-0.5 select-none pt-1.5">
            <span>1x (Equal)</span>
            <span>10x (Max Luck)</span>
          </div>
        </div>

        {/* Filters & Custom Toggles */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block select-none">
            Weight Rules
          </label>

          {/* Custom Toggle: Subs Only */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-900 bg-obsidian/30 select-none hover:bg-obsidian/50 transition-colors gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-kick/10 flex items-center justify-center shrink-0 border border-kick/5">
                <Star className={`w-3.5 h-3.5 ${restrictToSubs ? "text-kick text-glow-kick fill-kick/10" : "text-zinc-500"}`} />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-[11.5px] font-bold text-white block truncate">Subscribers Only</span>
                <span className="text-[9.5px] text-zinc-500 block truncate">Only active channel subscribers</span>
              </div>
            </div>

            {/* Glowing Switch Button */}
            <button
              type="button"
              onClick={() => !isGiveawayActive && setRestrictToSubs(!restrictToSubs)}
              disabled={isGiveawayActive}
              className={`w-10 h-6 rounded-full p-1 transition-all duration-300 ease-in-out cursor-pointer shrink-0 relative ${
                restrictToSubs 
                  ? "bg-kick shadow-[0_0_20px_rgba(220,38,38,0.2)] border border-kick/20" 
                  : "bg-zinc-800/80 border border-zinc-700/30"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  restrictToSubs ? "translate-x-4 bg-white" : "translate-x-0 bg-zinc-400"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Control Buttons - WITH AWWWARDS-COMPLIANT BOTTOM MARGIN AND PERFECT PADDING */}
      <div className="space-y-2 pt-3 pb-6 border-t border-zinc-900/50 shrink-0 font-display">
        {!isGiveawayActive ? (
          <button
            suppressHydrationWarning
            onClick={startGiveaway}
            disabled={!isConnected}
            className="w-full bg-kick hover:bg-kick-hover disabled:bg-zinc-850 disabled:text-zinc-650 text-obsidian font-extrabold py-3 px-4 rounded-full transition-all duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed border border-transparent uppercase tracking-wider"
          >
            <Play className="w-3.5 h-3.5 text-obsidian shrink-0 fill-obsidian" />
            Open Entries Pool
          </button>
        ) : (
          <button
            suppressHydrationWarning
            onClick={closeEntries}
            className="w-full bg-amber-500 hover:bg-amber-600 text-obsidian font-extrabold py-3 px-4 rounded-full transition-all duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] uppercase tracking-wider"
          >
            <Square className="w-3.5 h-3.5 text-obsidian shrink-0 fill-obsidian" />
            Close Entries
          </button>
        )}

        <button
          suppressHydrationWarning
          onClick={resetGiveaway}
          disabled={!isGiveawayActive && rawEntrantCount === 0 && pastWinnersCount === 0}
          className="w-full bg-zinc-900/40 hover:bg-zinc-850 border border-zinc-900 text-zinc-400 hover:text-zinc-200 font-semibold py-2.5 px-4 rounded-full transition-all duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Giveaway
        </button>
      </div>
    </div>
  );
}
