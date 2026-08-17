import React, { useState, useMemo } from "react";
import { 
  X, Copy, Check, ShieldCheck, Shuffle, Calculator, HelpCircle, 
  Eye, EyeOff, RotateCcw, KeyRound, Code, Settings
} from "lucide-react";
import { DrawVerificationData, sha256Sync, generateRandomSeed } from "@/hooks/useGiveawayManager";

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  lastDrawVerification?: DrawVerificationData | null;
  previousServerSeed?: string | null;
  previousServerSeedHash?: string | null;
  previousClientSeed?: string | null;
  previousNonce?: number | null;
  onSetClientSeed: (seed: string) => void;
  onRegenerateSeeds: () => void;
  defaultTab?: "config" | "verify" | "explain";
  isStacked?: boolean;
}

export default function ProvablyFairModal({
  isOpen,
  onClose,
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  lastDrawVerification,
  previousServerSeed,
  previousServerSeedHash,
  previousClientSeed,
  previousNonce,
  onSetClientSeed,
  onRegenerateSeeds,
  defaultTab = "config",
  isStacked = false
}: ProvablyFairModalProps) {
  const [activeTab, setActiveTab] = useState<"config" | "verify" | "explain">(defaultTab);
  const [showServerSeed, setShowServerSeed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Interactive Calculator State
  const [calcServerSeed, setCalcServerSeed] = useState("");
  const [calcClientSeed, setCalcClientSeed] = useState("");
  const [calcNonce, setCalcNonce] = useState(1);

  // Auto-switch tab based on defaultTab prop when modal opens
  // Only update active tab if the defaultTab explicitly changes (e.g., clicking Verify from winner modal)
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Auto-fill calculator with verification data if present
  React.useEffect(() => {
    if (isOpen && lastDrawVerification && defaultTab === "verify") {
      setCalcServerSeed(lastDrawVerification.serverSeed);
      setCalcClientSeed(lastDrawVerification.clientSeed);
      setCalcNonce(lastDrawVerification.nonce);
    }
  }, [isOpen, lastDrawVerification, defaultTab]);

  // Auto-fill calculator with last draw if available
  const handleLoadLastDrawIntoCalc = () => {
    const source = lastDrawVerification || (previousServerSeed ? {
      serverSeed: previousServerSeed,
      clientSeed: previousClientSeed || "",
      nonce: previousNonce || 1
    } : null);

    if (source) {
      setCalcServerSeed(source.serverSeed);
      setCalcClientSeed(source.clientSeed);
      setCalcNonce(source.nonce);
    }
  };

  // Calculator computations
  const calcResult = useMemo(() => {
    if (!calcServerSeed.trim()) return null;
    const cleanServer = calcServerSeed.trim();
    const cleanClient = calcClientSeed.trim();
    const comb = `${cleanServer}-${cleanClient}-${calcNonce}`;
    const hash = sha256Sync(comb);
    const hexSlice = hash.substring(0, 8);
    const decimalVal = parseInt(hexSlice, 16);
    const rollValue = decimalVal / 4294967296;

    return {
      combination: comb,
      hash,
      hexSlice,
      decimalVal,
      rollValue
    };
  }, [calcServerSeed, calcClientSeed, calcNonce]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Translucent Backdrop */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-[#050505]/85 transition-opacity duration-300 ${isStacked ? '' : 'backdrop-blur-[2px]'}`}
      />

      {/* Glassmorphic Modal Box */}
      <div className="bento-card rounded-3xl w-full max-w-2xl h-[90vh] md:h-[650px] flex flex-col relative overflow-hidden font-sans z-10 animate-scaleUp border border-zinc-900" style={{ background: 'rgb(18, 18, 18)', backdropFilter: 'none' }} onClick={(e) => e.stopPropagation()}>
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-kick/40 to-transparent" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-kick/5 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900/60 select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-kick/10 border border-kick/20 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-kick" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-white leading-tight">Provably Fair System</h2>
              <p className="text-[10px] text-zinc-550 font-semibold tracking-wide uppercase mt-0.5">Cryptographic Commitment & Verification</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-900 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#080808] border-b border-zinc-900/60 px-5 py-3 gap-2 select-none shrink-0 text-xs">
          <button
            onClick={() => setActiveTab("config")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "config" 
                ? "bg-zinc-900 text-white shadow-sm" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Active Settings
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "verify" 
                ? "bg-zinc-900 text-white shadow-sm" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Verify outcomes
          </button>
          <button
            onClick={() => setActiveTab("explain")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "explain" 
                ? "bg-zinc-900 text-white shadow-sm" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            How It Works
          </button>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-zinc-350 space-y-5">
          
          {/* TAB 1: ACTIVE SETTINGS & CONFIGURATION */}
          {activeTab === "config" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Commitment Card */}
              <div className="bg-[#080808] border border-zinc-900 p-4.5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-bold">
                    <KeyRound className="w-4 h-4 text-kick" />
                    <span>Active Seeds (Draw Pool)</span>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-550 uppercase bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded-full tracking-wider">
                    Nonce: {nonce}
                  </span>
                </div>

                {/* Server Seed Hash */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide block">Active Server Seed Hash (Committed)</span>
                  <div className="flex items-center bg-[#020202] border border-zinc-950 px-3.5 py-2.5 rounded-xl gap-2 font-mono text-[11px] text-zinc-400">
                    <span className="truncate flex-1 select-all">{serverSeedHash}</span>
                    <button
                      onClick={() => copyToClipboard(serverSeedHash, "hash")}
                      className="p-1 hover:text-white text-zinc-650 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
                      title="Copy Hash Commitment"
                    >
                      {copiedField === "hash" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Server Seed Raw (Revealed) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide block">Active Server Seed (Raw)</span>
                    <button 
                      onClick={() => setShowServerSeed(!showServerSeed)}
                      className="text-[9px] font-bold text-kick hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {showServerSeed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showServerSeed ? "Hide Raw Seed" : "Reveal Raw Seed"}
                    </button>
                  </div>
                  <div className="flex items-center bg-[#020202] border border-zinc-950 px-3.5 py-2.5 rounded-xl gap-2 font-mono text-[11px] text-zinc-400 min-h-[38px]">
                    <span className="truncate flex-1 select-all">
                      {showServerSeed ? serverSeed : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                    </span>
                    <button
                      onClick={() => copyToClipboard(serverSeed, "server")}
                      className="p-1 hover:text-white text-zinc-650 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors shrink-0"
                      title="Copy Raw Server Seed"
                    >
                      {copiedField === "server" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Client Seed Customizable Input */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide block">Active Client Seed</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientSeed}
                      onChange={(e) => onSetClientSeed(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                      placeholder="e.g. kick-giveaway-seed"
                      maxLength={32}
                      className="flex-1 bg-[#020202] border border-zinc-950 hover:border-zinc-900 focus:border-zinc-800 px-3.5 py-2 rounded-xl text-zinc-300 font-semibold text-xs transition-colors"
                    />
                    <button
                      onClick={() => onSetClientSeed(generateRandomSeed().substring(0, 16))}
                      className="px-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-950 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                      title="Randomize Client Seed"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Random
                    </button>
                  </div>
                </div>
              </div>

              {/* Seed Rotation Card */}
              <div className="bg-[#111111]/20 border border-kick/10 p-4.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 select-none">
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <span className="text-white font-bold text-xs block">Rotate Cryptographic Seeds</span>
                  <p className="text-[10px] text-zinc-500 leading-normal mt-1 font-medium">
                    This generates a new random server seed, resets Nonce to 1, and reveals the old server seed in the verification tab to prove all prior draws were fair.
                  </p>
                </div>
                <button
                  onClick={onRegenerateSeeds}
                  className="bg-kick hover:bg-kick-hover text-obsidian font-bold py-2 px-4 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 font-display text-[11px] tracking-wider uppercase shrink-0 w-full md:w-auto text-center"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Regenerate Seeds
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VERIFICATION CENTER & CALCULATOR */}
          {activeTab === "verify" && (
            <div className="space-y-4.5 animate-fadeIn">
              {/* Last Draw Verification Summary */}
              <div className="bg-[#080808] border border-zinc-900 p-4.5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3 select-none">
                  <span className="text-white font-bold flex items-center gap-1">
                    🛡️ Most Recent Draw Proof
                  </span>
                  {lastDrawVerification && (
                    <span className="bg-kick/10 border border-kick/20 text-kick text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Winner: {lastDrawVerification.winnerUsername}
                    </span>
                  )}
                </div>

                {lastDrawVerification ? (
                  <div className="space-y-3 font-mono text-[10.5px]">
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2 items-center">
                      <span className="text-zinc-500 font-sans font-semibold">Revealed Server Seed:</span>
                      <div className="col-span-2 flex items-center justify-between min-w-0">
                        <span className="text-zinc-300 truncate select-all">{lastDrawVerification.serverSeed}</span>
                        <button onClick={() => copyToClipboard(lastDrawVerification.serverSeed, "verify_ss")} className="p-1 hover:text-white text-zinc-650 cursor-pointer shrink-0">
                          {copiedField === "verify_ss" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2 items-center">
                      <span className="text-zinc-500 font-sans font-semibold">Committed Hash:</span>
                      <div className="col-span-2 flex items-center justify-between min-w-0">
                        <span className="text-zinc-300 truncate select-all">{lastDrawVerification.serverSeedHash}</span>
                        <button onClick={() => copyToClipboard(lastDrawVerification.serverSeedHash, "verify_ssh")} className="p-1 hover:text-white text-zinc-650 cursor-pointer shrink-0">
                          {copiedField === "verify_ssh" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2 items-center">
                      <span className="text-zinc-500 font-sans font-semibold">Client Seed:</span>
                      <div className="col-span-2 flex items-center justify-between min-w-0">
                        <span className="text-zinc-300 truncate select-all">{lastDrawVerification.clientSeed}</span>
                        <button onClick={() => copyToClipboard(lastDrawVerification.clientSeed, "verify_cs")} className="p-1 hover:text-white text-zinc-650 cursor-pointer shrink-0">
                          {copiedField === "verify_cs" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2">
                      <span className="text-zinc-500 font-sans font-semibold">Nonce:</span>
                      <span className="col-span-2 text-zinc-300 select-all">{lastDrawVerification.nonce}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2 items-center">
                      <span className="text-zinc-500 font-sans font-semibold">Combined String:</span>
                      <div className="col-span-2 flex items-center justify-between min-w-0">
                        <span className="text-zinc-400 truncate select-all">{lastDrawVerification.combination}</span>
                        <button onClick={() => copyToClipboard(lastDrawVerification.combination, "verify_comb")} className="p-1 hover:text-white text-zinc-650 cursor-pointer shrink-0">
                          {copiedField === "verify_comb" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2 items-center">
                      <span className="text-zinc-500 font-sans font-semibold">SHA-256 Hash:</span>
                      <div className="col-span-2 flex items-center justify-between min-w-0">
                        <span className="text-zinc-400 truncate select-all">{lastDrawVerification.hash}</span>
                        <button onClick={() => copyToClipboard(lastDrawVerification.hash, "verify_hash")} className="p-1 hover:text-white text-zinc-650 cursor-pointer shrink-0">
                          {copiedField === "verify_hash" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2">
                      <span className="text-zinc-500 font-sans font-semibold">First 8 Characters:</span>
                      <span className="col-span-2 text-white font-bold select-all">{lastDrawVerification.hexSlice}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-zinc-950 pb-2">
                      <span className="text-zinc-500 font-sans font-semibold">Decimal Val:</span>
                      <span className="col-span-2 text-white font-bold select-all">{lastDrawVerification.decimalVal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-zinc-500 font-sans font-semibold">Float r value:</span>
                      <span className="col-span-2 text-kick font-bold select-all">
                        {lastDrawVerification.rollValue} <span className="text-zinc-650 font-semibold font-sans">({(lastDrawVerification.rollValue * 100).toFixed(6)}%)</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-650 font-sans font-semibold uppercase tracking-wider select-none">
                    No draws recorded yet in this session
                  </div>
                )}
              </div>

              {/* Revealed Previous Seed History Card */}
              {previousServerSeed && (
                <div className="bg-[#0f0f0f]/30 border border-zinc-900 p-4.5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-bold select-none">
                    <KeyRound className="w-4 h-4 text-kick" />
                    <span>Archived / Revealed Previous Seeds</span>
                  </div>
                  <div className="space-y-2.5 font-mono text-[10.5px]">
                    <div className="space-y-1">
                      <span className="text-[9px] font-sans font-bold text-zinc-550 uppercase tracking-wider block select-none">Revealed Server Seed</span>
                      <div className="flex items-center bg-[#020202] border border-zinc-950 px-3 py-1.5 rounded-xl gap-2 text-zinc-300">
                        <span className="truncate flex-1 select-all">{previousServerSeed}</span>
                        <button
                          onClick={() => copyToClipboard(previousServerSeed, "prev_seed")}
                          className="p-1 hover:text-white text-zinc-650 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
                        >
                          {copiedField === "prev_seed" ? <Check className="w-3.5 h-3.5 text-kick" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-zinc-950/65 pt-2">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Committed Hash:</span>
                      <span className="col-span-2 text-zinc-450 truncate select-all">{previousServerSeedHash}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-zinc-950/65 pt-2">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Client Seed Used:</span>
                      <span className="col-span-2 text-zinc-450 select-all">{previousClientSeed}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-zinc-950/65 pt-2">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Max Nonce Reached:</span>
                      <span className="col-span-2 text-zinc-450 select-all">{previousNonce}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Verifier Calculator */}
              <div className="bg-[#080808] border border-zinc-900 p-4.5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3 select-none">
                  <span className="text-white font-bold flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-kick" />
                    Interactive Verification Calculator
                  </span>
                  {(lastDrawVerification || previousServerSeed) && (
                    <button
                      onClick={handleLoadLastDrawIntoCalc}
                      className="text-[9px] font-bold text-kick hover:underline cursor-pointer uppercase tracking-wider"
                    >
                      Load Last Draw Data
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase block select-none">Server Seed</label>
                    <input 
                      type="text" 
                      value={calcServerSeed}
                      onChange={(e) => setCalcServerSeed(e.target.value.trim())}
                      placeholder="Paste 64-char hex seed"
                      className="w-full bg-[#020202] border border-zinc-950 focus:border-zinc-800 px-3 py-2 rounded-xl text-zinc-300 text-xs transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase block select-none">Client Seed</label>
                    <input 
                      type="text" 
                      value={calcClientSeed}
                      onChange={(e) => setCalcClientSeed(e.target.value.trim())}
                      placeholder="Paste client seed"
                      className="w-full bg-[#020202] border border-zinc-950 focus:border-zinc-800 px-3 py-2 rounded-xl text-zinc-300 text-xs transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase block select-none">Nonce</label>
                    <input 
                      type="number" 
                      value={calcNonce}
                      min={1}
                      onChange={(e) => setCalcNonce(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Nonce"
                      className="w-full bg-[#020202] border border-zinc-950 focus:border-zinc-800 px-3 py-2 rounded-xl text-zinc-300 text-xs transition-colors"
                    />
                  </div>
                </div>

                {calcResult ? (
                  <div className="bg-[#020202]/80 border border-zinc-950 p-4 rounded-xl space-y-2.5 font-mono text-[10px] animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-zinc-900/60 pb-1.5">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Combined Target String</span>
                      <span className="text-zinc-300 select-all truncate max-w-[320px]">{calcResult.combination}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-900/60 pb-1.5">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Computed SHA-256</span>
                      <span className="text-zinc-300 select-all truncate max-w-[320px]">{calcResult.hash}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-900/60 pb-1.5">
                      <span className="text-zinc-500 font-sans font-semibold select-none">First 8 Hex (Unsigned)</span>
                      <span className="text-white font-bold select-all">{calcResult.hexSlice}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-900/60 pb-1.5">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Parsed Decimal Integer</span>
                      <span className="text-white font-bold select-all">{calcResult.decimalVal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-sans font-semibold select-none">Deterministic float r</span>
                      <span className="text-kick font-bold select-all">
                        {calcResult.rollValue} <span className="text-zinc-650 font-semibold font-sans">({(calcResult.rollValue * 100).toFixed(6)}%)</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-[10px] text-zinc-650 font-semibold uppercase tracking-wider select-none">
                    Enter a Server Seed in the inputs above to run live verification calculations
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MATHEMATICAL EXPLANATIONS & SHELL SCRIPTS */}
          {activeTab === "explain" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Mathematics Card */}
              <div className="bg-[#080808] border border-zinc-900 p-4.5 rounded-2xl space-y-3 leading-relaxed">
                <span className="text-white font-bold flex items-center gap-1 border-b border-zinc-900/60 pb-2.5 mb-1.5 select-none">
                  🛡️ Provably Fair Draw Mechanics
                </span>
                <p>
                  A <strong>Provably Fair</strong> giveaway means that the lottery winner is chosen deterministically using variables committed beforehand. This makes it mathematically impossible for the host to selectively modify or rigged the final roll without breaking validation.
                </p>
                <h4 className="font-bold text-white text-[11px] mt-2 mb-1 uppercase tracking-wide select-none">How It Works Step-by-Step:</h4>
                <ol className="list-decimal pl-4.5 space-y-2 select-none">
                  <li>Before the drawing, the host publishes the <strong>SHA-256 Hash</strong> of the Server Seed. This acts as a cryptographic commitment.</li>
                  <li>During the drawing, the active <strong>Server Seed</strong>, <strong>Client Seed</strong>, and <strong>Nonce</strong> are combined into a string: <code>{"{serverSeed}-{clientSeed}-{nonce}"}</code>.</li>
                  <li>This combined string is hashed with <strong>SHA-256</strong>, producing a 64-character hexadecimal signature.</li>
                  <li>We take the first 8 hex characters (4 bytes) and convert them to an integer: <code>parseInt(hex, 16)</code>. This yields a value between <code>0</code> and <code>4294967295</code>.</li>
                  <li>We divide this value by <code>4294967296</code> to yield a float <code>r</code> between <code>0</code> and <code>1</code>.</li>
                  <li>The winning point is <code>r * totalWeight</code>. The winner is selected by iterating the weighted entrants pool to match this point.</li>
                </ol>
              </div>

              {/* Terminal Scripts Verification Card */}
              <div className="bg-[#080808] border border-zinc-900 p-4.5 rounded-2xl space-y-3.5">
                <span className="text-white font-bold flex items-center gap-1.5 select-none">
                  <Code className="w-4 h-4 text-kick" />
                  Verify Externally (Terminal One-Liners)
                </span>
                <p className="text-[10px] text-zinc-500 leading-normal select-none">
                  Viewers can copy these standard one-liner terminal commands, replace the placeholders with their actual draw inputs, and run them locally to verify the exact same results.
                </p>

                {/* Node.js verification */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">Node.js Command Line</span>
                    <button
                      onClick={() => copyToClipboard(`node -e "const crypto = require('crypto'); const combination = '${lastDrawVerification?.combination || "SERVER-CLIENT-NONCE"}'; const hash = crypto.createHash('sha256').update(combination).digest('hex'); const val = parseInt(hash.substring(0, 8), 16); console.log('Resulting float r:', val / 4294967296);"`, "node")}
                      className="text-[9.5px] font-bold text-kick hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedField === "node" ? <Check className="w-3 h-3 text-kick" /> : <Copy className="w-3 h-3" />}
                      Copy Command
                    </button>
                  </div>
                  <pre className="bg-[#020202] border border-zinc-950 p-3 rounded-xl font-mono text-[9px] text-zinc-400 overflow-x-auto whitespace-pre-wrap select-all">
                    {`node -e "const crypto = require('crypto'); const combination = '${lastDrawVerification?.combination || "SERVER-CLIENT-NONCE"}'; const hash = crypto.createHash('sha256').update(combination).digest('hex'); const val = parseInt(hash.substring(0, 8), 16); console.log('Resulting float r:', val / 4294967296);"`}
                  </pre>
                </div>

                {/* Python verification */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">Python Command Line</span>
                    <button
                      onClick={() => copyToClipboard(`python -c "import hashlib; comb = '${lastDrawVerification?.combination || "SERVER-CLIENT-NONCE"}'; h = hashlib.sha256(comb.encode()).hexdigest(); val = int(h[:8], 16); print('Resulting float r:', val / 4294967296)"`, "python")}
                      className="text-[9.5px] font-bold text-kick hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedField === "python" ? <Check className="w-3 h-3 text-kick" /> : <Copy className="w-3 h-3" />}
                      Copy Command
                    </button>
                  </div>
                  <pre className="bg-[#020202] border border-zinc-950 p-3 rounded-xl font-mono text-[9px] text-zinc-400 overflow-x-auto whitespace-pre-wrap select-all">
                    {`python -c "import hashlib; comb = '${lastDrawVerification?.combination || "SERVER-CLIENT-NONCE"}'; h = hashlib.sha256(comb.encode()).hexdigest(); val = int(h[:8], 16); print('Resulting float r:', val / 4294967296)"`}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
