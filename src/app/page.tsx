"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, Award, Star, RefreshCw, Trophy, Radio, ShieldCheck, Zap, UserCheck, Flame, Cpu, Volume2, VolumeX, Settings } from "lucide-react";
import KickConnectionPanel from "@/components/KickConnectionPanel";
import GiveawaySettings from "@/components/GiveawaySettings";
import ChatFeed from "@/components/ChatFeed";
import EntrantsList from "@/components/EntrantsList";
import WinnerPickerAnimation from "@/components/WinnerPickerAnimation";
import WinnerAnnouncement from "@/components/WinnerAnnouncement";
import { useGiveawayManager, GiveawayEntrant } from "@/hooks/useGiveawayManager";
import { kickChat, KickChatMessage } from "@/services/kickChat";
import ProvablyFairModal from "@/components/ProvablyFairModal";
import { playSynthSound, setGlobalIsMuted } from "@/utils/audio";

export default function Home() {
  const [chatroomId, setChatroomId] = useState<number | null>(null);
  const [channelMetadata, setChannelMetadata] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<KickChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  const [connectionError, setConnectionError] = useState("");
  const [activeWinnerToRoll, setActiveWinnerToRoll] = useState<GiveawayEntrant | null>(null);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState(false);
  const [provablyFairDefaultTab, setProvablyFairDefaultTab] = useState<"config" | "verify" | "explain">("config");
  const [activeVerificationData, setActiveVerificationData] = useState<any>(null);
  const rollTimeRef = useRef<HTMLDivElement>(null);
  const [isRollTimeOpen, setIsRollTimeOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isRollTimeOpen && rollTimeRef.current && !rollTimeRef.current.contains(e.target as Node)) {
        setIsRollTimeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRollTimeOpen]);

  const [isMuted, setIsMuted] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Load page state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('betterGiveawayPage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.chatroomId) setChatroomId(parsed.chatroomId);
        if (parsed.channelMetadata) setChannelMetadata(parsed.channelMetadata);
        if (parsed.chatMessages) setChatMessages(parsed.chatMessages);
      } catch (e) {
        console.error("Failed to parse page state", e);
      }
    }
    setIsPageLoaded(true);
  }, []);

  // Save page state to localStorage whenever it changes
  useEffect(() => {
    if (!isPageLoaded) return;
    const state = { chatroomId, channelMetadata, chatMessages };
    localStorage.setItem('betterGiveawayPage', JSON.stringify(state));
  }, [isPageLoaded, chatroomId, channelMetadata, chatMessages]);

  useEffect(() => {
    setGlobalIsMuted(isMuted);
  }, [isMuted]);

  const manager = useGiveawayManager();

  // Prevent scrolling when a modal is open
  useEffect(() => {
    if (isProvablyFairOpen || activeWinnerToRoll || manager.winner) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isProvablyFairOpen, activeWinnerToRoll, manager.winner]);

  // Keep a mutable ref of the chat handler to prevent WebSocket teardowns/reconnects on settings change
  const messageHandlerRef = useRef<(msg: KickChatMessage) => void>(() => {});

  // Update the ref on every render with the latest closure states
  useEffect(() => {
    messageHandlerRef.current = (msg: KickChatMessage) => {
      const isEntry = manager.entryType === "active" || 
        (manager.entryType === "keyword" && msg.content.toLowerCase().includes(manager.keyword.trim().toLowerCase()));

      setChatMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev.slice(-14), msg];
      });
      manager.handleIncomingMessage(msg);
    };
  });

  // Establish direct Pusher connection ONLY when chatroom ID changes
  useEffect(() => {
    if (chatroomId) {
      kickChat.connect(
        chatroomId,
        (msg) => {
          messageHandlerRef.current(msg);
        },
        (status, errMsg) => {
          setConnectionStatus(status);
          if (errMsg) setConnectionError(errMsg);
        }
      );
    } else {
      kickChat.disconnect();
      setConnectionStatus("disconnected");
    }

    return () => {
      kickChat.disconnect();
    };
  }, [chatroomId]);


  const handleConnectChannel = (resolvedId: number, metadata: any) => {
    playSynthSound("click");
    setChatMessages([]); // Wipe messages ONLY on manual new connection
    setChatroomId(resolvedId);
    setChannelMetadata(metadata);
  };

  const handleDisconnect = () => {
    playSynthSound("click");
    setChatroomId(null);
    setChannelMetadata(null);
    setChatMessages([]);
    manager.resetGiveaway();
  };

  const handleRollWinner = () => {
    playSynthSound("click");

    if (manager.winner) {
      manager.setPastWinners((prev) => prev.filter((w) => w.slug !== manager.winner?.slug));
    }

    const selectedWinner = manager.rollGiveaway();
    if (selectedWinner) {
      setActiveWinnerToRoll(selectedWinner);
    }
  };

  const handleRollAnimationComplete = (finalizedWinner: GiveawayEntrant) => {
    playSynthSound("winner");
    manager.finalizeWinner(finalizedWinner);
    setActiveWinnerToRoll(null);
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground flex flex-col antialiased relative overflow-hidden">
      
      {/* Minimal Background (Just the dark base) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-kick/20 to-transparent opacity-70" />
      </div>

      {/* Global Sound Toggle */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 bg-obsidian/80 backdrop-blur-sm border border-zinc-800 p-2.5 rounded-xl hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white shadow-lg cursor-pointer"
        title={isMuted ? "Unmute sounds" : "Mute sounds"}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Main Bento Grid Workspace - Margins set to minimum (max-w-[1600px]) for extra visual width */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto w-full items-start relative z-10 pt-6">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6 flex flex-col w-full h-full min-w-0">
          <KickConnectionPanel
            onConnect={handleConnectChannel}
            onDisconnect={handleDisconnect}
            connectionStatus={connectionStatus}
            connectionError={connectionError}
            channelData={channelMetadata}
          />
          
          <GiveawaySettings
            entryType={manager.entryType}
            setEntryType={manager.setEntryType}
            keyword={manager.keyword}
            setKeyword={manager.setKeyword}
            subLuckMultiplier={manager.subLuckMultiplier}
            setSubLuckMultiplier={manager.setSubLuckMultiplier}
            restrictToSubs={manager.restrictToSubs}
            setRestrictToSubs={manager.setRestrictToSubs}
            isGiveawayActive={manager.isGiveawayActive}
            rawEntrantCount={manager.rawEntrantCount}
            pastWinnersCount={manager.pastWinners.length}
            startGiveaway={manager.startGiveaway}
            closeEntries={manager.closeEntries}
            resetGiveaway={manager.resetGiveaway}
            isConnected={connectionStatus === "connected"}
          />
        </div>

        {/* Center/Right Main Panel */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6 flex flex-col w-full h-full min-w-0">

          {/* Showcase grid of Entrants and Live Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 items-stretch min-w-0">
            {/* Realtime Entrants Table Viewer */}
            <div className="lg:col-span-3 flex-1 relative min-h-[400px] min-w-0">
              <div className="absolute inset-0">
                <EntrantsList
                  entrants={manager.entrants}
                  onRemoveEntrant={manager.removeEntrant}
                  isGiveawayActive={manager.isGiveawayActive}
                  onOpenProvablyFair={() => {
                    setActiveVerificationData(null);
                    setProvablyFairDefaultTab("config");
                    setIsProvablyFairOpen(true);
                  }}
                  chatMessages={manager.winnerMessages}
                  pastWinners={manager.pastWinners}
                  onSelectWinner={(w) => {
                    playSynthSound("click");
                    manager.setWinner(w);
                  }}
                  onRemoveWinner={(slug) => {
                    manager.setPastWinners((prev) => prev.filter(w => w.slug !== slug));
                  }}
                />
              </div>
            </div>

            {/* Sidebar Feed Widgets */}
            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between h-full min-w-0">
              {/* Chat Terminal preview */}
              <div className="flex-1 relative min-h-[400px] min-w-0">
                <div className="absolute inset-0">
                  <ChatFeed
                    messages={chatMessages}
                    isGiveawayActive={manager.isGiveawayActive}
                    entryType={manager.entryType}
                    keyword={manager.keyword}
                    entrants={manager.entrants}
                    restrictToSubs={manager.restrictToSubs}
                  />
                </div>
              </div>

              {/* Big Draw Winner Bento Card CTA */}
              <div className="bento-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center items-center border border-zinc-900 bg-[#111111]/30 select-none">
                <div className="absolute top-0 right-0 w-24 h-24 bg-kick/5 rounded-full blur-2xl pointer-events-none" />
                
                <div ref={rollTimeRef} className="absolute top-4 right-4 z-20">
                  <button 
                    onClick={() => setIsRollTimeOpen(!isRollTimeOpen)}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-zinc-900"
                    title="Draw Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {isRollTimeOpen && (
                    <div className="absolute top-full mt-2 right-0 w-52 space-y-3 bg-[#111111]/95 backdrop-blur-md border border-zinc-800/80 p-4 rounded-2xl animate-fadeIn">
                      <div className="flex items-center justify-between select-none text-[10px] font-bold mb-1">
                        <label className="text-zinc-400 uppercase tracking-wider">
                          Roll Time
                        </label>
                        <span className="text-[10px] font-extrabold text-white">
                          {manager.rollAnimationTime}s
                        </span>
                      </div>
                      
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={manager.rollAnimationTime}
                        onChange={(e) => manager.setRollAnimationTime(parseInt(e.target.value))}
                        className="w-full custom-slider"
                        style={{
                          ["--slider-fill" as any]: `${((manager.rollAnimationTime - 1) / 9) * 100}%`
                        }}
                      />
                      
                      <div className="flex justify-between text-[9px] text-zinc-500 font-bold px-0.5 select-none pt-1.5">
                        <span>1s</span>
                        <span>10s</span>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-xs font-bold font-display text-zinc-450 uppercase tracking-widest mb-1.5 text-center flex items-center justify-center">
                  Draw Controls
                </h3>
                <p className="text-xs text-zinc-550 leading-relaxed text-center max-w-xs mb-5 font-medium">
                  Select a provably fair winner using a cryptographically verifiable random seed.
                </p>



                <button
                  suppressHydrationWarning
                  onClick={handleRollWinner}
                  disabled={manager.rawEntrantCount === 0 || manager.isRolling}
                  className="w-full bg-gradient-to-r from-kick to-kick-hover hover:from-kick-hover hover:to-kick text-obsidian font-bold py-3.5 px-6 rounded-full cursor-pointer tracking-wide shadow-xl disabled:opacity-40 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-650 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-all text-center flex items-center justify-center gap-2 font-display text-sm"
                >
                  Roll Winner
                </button>

              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 px-6 py-4 flex items-center justify-between select-none text-[10px] text-zinc-650 font-semibold tracking-wider uppercase mt-12 bg-obsidian shrink-0 z-10 relative">
        <span>© 2026 blech bot. built for performance.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-650" />
            provably fair draws
          </span>
        </div>
      </footer>

      {/* Active rolling spinner overlay */}
      {(manager.isRolling || activeWinnerToRoll) && (
        <WinnerPickerAnimation
          winner={manager.winner}
          entrants={manager.entrants}
          isRolling={manager.isRolling}
          onRollComplete={handleRollAnimationComplete}
          selectedWinnerToRoll={activeWinnerToRoll}
          rollAnimationTime={manager.rollAnimationTime}
        />
      )}

      {/* Winner announcement overlay */}
      {manager.winner && !manager.isRolling && !activeWinnerToRoll && !isProvablyFairOpen && (
        <WinnerAnnouncement
          winner={manager.winner}
          channelSlug={channelMetadata?.slug}
          onClose={() => manager.setWinner(null)}
          onReroll={handleRollWinner}
          canReroll={manager.entrants.length > 1}
          onVerifyProvablyFair={() => {
            setActiveVerificationData(manager.winner?.drawVerification || null);
            setProvablyFairDefaultTab("verify");
            setIsProvablyFairOpen(true);
          }}
          onRemoveWinner={() => {
            if (manager.winner) {
              manager.setPastWinners((prev) => prev.filter((w) => w.slug !== manager.winner?.slug));
              manager.setWinner(null);
            }
          }}
          onUpdateWinner={(updatedWinner) => {
            manager.setWinner(updatedWinner);
            manager.setPastWinners((prev) => 
              prev.map(w => w.slug === updatedWinner.slug ? updatedWinner : w)
            );
            manager.setEntrants((prev) => 
              prev.map(e => e.slug === updatedWinner.slug ? updatedWinner : e)
            );
          }}
        />
      )}

      <ProvablyFairModal
        isOpen={isProvablyFairOpen}
        onClose={() => {
          setIsProvablyFairOpen(false);
          setActiveVerificationData(null);
        }}
        isStacked={false}
        serverSeed={manager.serverSeed}
        serverSeedHash={manager.serverSeedHash}
        clientSeed={manager.clientSeed}
        nonce={manager.nonce}
        lastDrawVerification={activeVerificationData || manager.lastDrawVerification}
        previousServerSeed={manager.previousServerSeed}
        previousServerSeedHash={manager.previousServerSeedHash}
        previousClientSeed={manager.previousClientSeed}
        previousNonce={manager.previousNonce}
        onSetClientSeed={manager.setClientSeed}
        onRegenerateSeeds={manager.regenerateSeeds}
        defaultTab={provablyFairDefaultTab}
      />
    </div>
  );
}
