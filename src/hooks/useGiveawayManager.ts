import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { KickChatMessage } from "@/services/kickChat";

export interface GiveawayEntrant {
  username: string;
  slug: string;
  color: string;
  followingSince?: string | null;
  isSubscriber: boolean;
  isModerator: boolean;
  isBroadcaster: boolean;
  enteredAt: string;
  message: string;
  weight: number;
  chance: number; // Winning percentage probability
  drawVerification?: DrawVerificationData;
}

export interface DrawVerificationData {
  winnerUsername: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  rollValue: number;
  targetWeight: number;
  combination: string;
  hash: string;
  hexSlice: string;
  decimalVal: number;
  entrantsAtDraw: { username: string; weight: number; chance: number }[];
}

// Synchronous pure JS SHA-256 implementation
export function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const result = [];
  const words: number[] = [];
  const asciiLength = ascii.length;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  let i, j;
  const wordsLength = ((asciiLength + 8) >> 6) + 1;
  for (i = 0; i < wordsLength * 16; i++) words[i] = 0;
  for (i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  words[wordsLength * 16 - 1] = asciiLength * 8;
  
  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);
    
    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const w15 = w[j - 15], w2 = w[j - 2], w16 = w[j - 16], w7 = w[j - 7];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[j] = (w16 + s0 + w7 + s1) | 0;
      }
      
      const a = hash[0], e = hash[4];
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const t2 = s0 + maj;
      
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const t1 = hash[7] + s1 + ch + k[j] + w[j];
      
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }
    
    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16);
    result.push(hex.padStart(8, "0"));
  }
  
  return result.join("");
}

export const generateRandomSeed = (): string => {
  const chars = "abcdef0123456789";
  let seed = "";
  for (let i = 0; i < 64; i++) {
    seed += chars[Math.floor(Math.random() * chars.length)];
  }
  return seed;
};

export function useGiveawayManager() {
  const [entrants, setEntrants] = useState<GiveawayEntrant[]>([]);
  const seenSlugsRef = useRef<Set<string>>(new Set());
  const [isGiveawayActive, setIsGiveawayActive] = useState<boolean>(false);
  
  // Settings State
  const [entryType, setEntryType] = useState<"keyword" | "active">("keyword");
  const [keyword, setKeyword] = useState<string>("");
  const [subLuckMultiplier, setSubLuckMultiplier] = useState<number>(1); // 1x standard subscriber luck (Equal Luck)
  const [restrictToSubs, setRestrictToSubs] = useState<boolean>(false);
  
  // Winner Draw State
  const [winner, setWinner] = useState<GiveawayEntrant | null>(null);
  const [pastWinners, setPastWinners] = useState<GiveawayEntrant[]>([]);
  const [winnerMessages, setWinnerMessages] = useState<KickChatMessage[]>([]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollAnimationTime, setRollAnimationTime] = useState<number>(5); // seconds

  // Provably Fair States
  const [serverSeed, setServerSeed] = useState<string>("");
  const [clientSeed, setClientSeed] = useState<string>("");
  const [nonce, setNonce] = useState<number>(1);
  const [lastDrawVerification, setLastDrawVerification] = useState<DrawVerificationData | null>(null);

  // Archived Previous Seeds for Viewer Verification
  const [previousServerSeed, setPreviousServerSeed] = useState<string | null>(null);
  const [previousServerSeedHash, setPreviousServerSeedHash] = useState<string | null>(null);
  const [previousClientSeed, setPreviousClientSeed] = useState<string | null>(null);
  const [previousNonce, setPreviousNonce] = useState<number | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('betterGiveawayState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.entrants) {
          setEntrants(parsed.entrants);
          seenSlugsRef.current = new Set(parsed.entrants.map((e: any) => e.slug.toLowerCase()));
        }
        if (parsed.isGiveawayActive !== undefined) setIsGiveawayActive(parsed.isGiveawayActive);
        if (parsed.entryType) setEntryType(parsed.entryType);
        if (parsed.keyword !== undefined) setKeyword(parsed.keyword);
        if (parsed.subLuckMultiplier !== undefined) setSubLuckMultiplier(parsed.subLuckMultiplier);
        if (parsed.restrictToSubs !== undefined) setRestrictToSubs(parsed.restrictToSubs);
        if (parsed.winner !== undefined) setWinner(parsed.winner);
        if (parsed.pastWinners) setPastWinners(parsed.pastWinners);
        if (parsed.winnerMessages) setWinnerMessages(parsed.winnerMessages);
        if (parsed.serverSeed) setServerSeed(parsed.serverSeed);
        if (parsed.clientSeed) setClientSeed(parsed.clientSeed);
        if (parsed.nonce !== undefined) setNonce(parsed.nonce);
        if (parsed.lastDrawVerification !== undefined) setLastDrawVerification(parsed.lastDrawVerification);
        if (parsed.previousServerSeed !== undefined) setPreviousServerSeed(parsed.previousServerSeed);
        if (parsed.previousServerSeedHash !== undefined) setPreviousServerSeedHash(parsed.previousServerSeedHash);
        if (parsed.previousClientSeed !== undefined) setPreviousClientSeed(parsed.previousClientSeed);
        if (parsed.previousNonce !== undefined) setPreviousNonce(parsed.previousNonce);
        if (parsed.rollAnimationTime !== undefined) setRollAnimationTime(parsed.rollAnimationTime);
      } catch (e) {
        console.error("Failed to parse saved giveaway state", e);
      }
    } else {
      // First time initialization: generate fresh seeds since they are empty during SSR
      setServerSeed(generateRandomSeed());
      setClientSeed(generateRandomSeed().substring(0, 16));
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    const state = {
      entrants,
      isGiveawayActive,
      entryType,
      keyword,
      subLuckMultiplier,
      restrictToSubs,
      winner,
      pastWinners,
      winnerMessages,
      serverSeed,
      clientSeed,
      nonce,
      lastDrawVerification,
      previousServerSeed,
      previousServerSeedHash,
      previousClientSeed,
      previousNonce,
      rollAnimationTime,
    };
    try {
      localStorage.setItem('betterGiveawayState', JSON.stringify(state));
    } catch (error) {
      console.warn("localStorage quota exceeded. Saving lite state without entrants.");
      try {
        const liteState = { 
          ...state, 
          entrants: [], 
          lastDrawVerification: state.lastDrawVerification ? { 
            ...state.lastDrawVerification, 
            entrantsAtDraw: [] 
          } : null 
        };
        localStorage.setItem('betterGiveawayState', JSON.stringify(liteState));
      } catch (e2) {
        console.error("Failed to save state to localStorage", e2);
      }
    }
  }, [
    isLoaded, entrants, isGiveawayActive, entryType, keyword, subLuckMultiplier,
    restrictToSubs, winner, pastWinners, winnerMessages, serverSeed, clientSeed,
    nonce, lastDrawVerification, previousServerSeed, previousServerSeedHash,
    previousClientSeed, previousNonce, rollAnimationTime
  ]);

  // Compute Active Server Seed Hash
  const serverSeedHash = useMemo(() => {
    return sha256Sync(serverSeed);
  }, [serverSeed]);

  // Synchronize state when settings change to keep winning percentages accurate
  const totalWeight = useMemo(() => {
    return entrants.reduce((sum, entrant) => {
      const weight = entrant.isSubscriber ? subLuckMultiplier : 1;
      return sum + weight;
    }, 0);
  }, [entrants, subLuckMultiplier]);

  // Map entrants with their computed weights and actual winning percentages
  const entrantsWithChance = useMemo(() => {
    if (entrants.length === 0) return [];
    return entrants.map(entrant => {
      const weight = entrant.isSubscriber ? subLuckMultiplier : 1;
      const chance = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      return {
        ...entrant,
        weight,
        chance: parseFloat(chance.toFixed(2))
      };
    });
  }, [entrants, totalWeight, subLuckMultiplier]);

  // Start the giveaway
  const startGiveaway = useCallback(() => {
    setWinner(null);
    setIsGiveawayActive(true);
  }, []);

  // Close entries
  const closeEntries = useCallback(() => {
    setIsGiveawayActive(false);
  }, []);

  // Disqualify / remove a specific user from the giveaway
  const removeEntrant = useCallback((username: string) => {
    setEntrants(prev => {
      const entrantToRemove = prev.find(e => e.username.toLowerCase() === username.toLowerCase());
      if (entrantToRemove) {
        seenSlugsRef.current.delete(entrantToRemove.slug.toLowerCase());
      }
      return prev.filter(e => e.username.toLowerCase() !== username.toLowerCase());
    });
  }, []);



  // Completely reset everything — entrants, winners, draw history, all of it
  const resetGiveaway = useCallback(() => {
    setEntrants([]);
    seenSlugsRef.current.clear();
    setWinner(null);
    setPastWinners([]);
    setWinnerMessages([]);
    setIsGiveawayActive(false);
    setIsRolling(false);
    setLastDrawVerification(null);
  }, []);

  // Provably Fair Actions
  const regenerateSeeds = useCallback(() => {
    setPreviousServerSeed(serverSeed);
    setPreviousServerSeedHash(serverSeedHash);
    setPreviousClientSeed(clientSeed);
    setPreviousNonce(nonce - 1); // last draw nonce
    
    setServerSeed(generateRandomSeed());
    setNonce(1);
  }, [serverSeed, serverSeedHash, clientSeed, nonce]);

  // Process incoming messages and filter them for giveaway qualification
  const handleIncomingMessage = useCallback((message: KickChatMessage) => {
    // 1. If sender is a past winner, save their message permanently
    setPastWinners((prevWinners) => {
      if (prevWinners.some(w => w.slug === message.sender.slug)) {
        setWinnerMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev.slice(-299), message];
        });
      }
      return prevWinners;
    });

    if (!isGiveawayActive) return;

    const senderUsername = message.sender.username;
    const senderSlug = message.sender.slug;
    const isSub = message.sender.isSubscriber;
    const isMod = message.sender.isModerator;
    const isBroadcaster = message.sender.isBroadcaster;
    const messageContent = message.content.trim();

    // 1. Check if restricted to subscribers only
    if (restrictToSubs && !isSub) {
      return;
    }

    // 2. Match entry condition
    let qualified = false;
    if (entryType === "active") {
      qualified = true; // Any chat message counts
    } else if (entryType === "keyword") {
      qualified = messageContent.toLowerCase().includes(keyword.trim().toLowerCase());
    }

    if (!qualified) return;

    // 3. Prevent duplicate entrants or past winners from re-entering
    const lowerSlug = senderSlug.toLowerCase();
    
    // O(1) duplicate check
    if (seenSlugsRef.current.has(lowerSlug)) return;

    setEntrants(prev => {
      const isPastWinner = pastWinners.some(w => w.slug.toLowerCase() === lowerSlug);
      if (isPastWinner) return prev;

      seenSlugsRef.current.add(lowerSlug);

      // Create new entrant structure
      const newEntrant: GiveawayEntrant = {
        username: senderUsername,
        slug: message.sender.slug,
        color: message.sender.color,
        followingSince: message.sender.followingSince,
        isSubscriber: message.sender.isSubscriber,
        isModerator: isMod,
        isBroadcaster,
        enteredAt: message.createdAt,
        message: messageContent,
        weight: isSub ? subLuckMultiplier : 1,
        chance: 0,
      };

      return [...prev, newEntrant];
    });
  }, [isGiveawayActive, entryType, keyword, restrictToSubs, subLuckMultiplier, pastWinners]);

  // Roll the winner using deterministic provably fair selection
  const drawWinner = useCallback(() => {
    if (entrantsWithChance.length === 0) return null;

    // Compute deterministic fraction using seeds and nonce
    const combination = `${serverSeed}-${clientSeed}-${nonce}`;
    const hash = sha256Sync(combination);
    const hexSlice = hash.substring(0, 8);
    const val = parseInt(hexSlice, 16);
    const r = val / 4294967296; // scale strictly to [0, 1)

    const rand = r * totalWeight;
    let cumulativeWeight = 0;
    let selectedWinner = entrantsWithChance[0];

    for (const entrant of entrantsWithChance) {
      cumulativeWeight += entrant.weight;
      if (rand <= cumulativeWeight) {
        selectedWinner = entrant;
        break;
      }
    }

    const verificationData: DrawVerificationData = {
      winnerUsername: selectedWinner.username,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      rollValue: r,
      targetWeight: rand,
      combination,
      hash,
      hexSlice,
      decimalVal: val,
      entrantsAtDraw: entrantsWithChance.map(e => ({
        username: e.username,
        weight: e.weight,
        chance: e.chance
      }))
    };

    // Save proof details
    setLastDrawVerification(verificationData);

    // Auto-increment the nonce for the next draw
    setNonce(prev => prev + 1);

    return { ...selectedWinner, drawVerification: verificationData };
  }, [entrantsWithChance, totalWeight, serverSeed, clientSeed, nonce, serverSeedHash]);

  // Execute drawing procedure with animation trigger
  const rollGiveaway = useCallback(() => {
    if (entrants.length === 0 || isRolling) return null;

    setIsRolling(true);
    const selectedWinner = drawWinner();

    if (selectedWinner) {
      return selectedWinner;
    }
    setIsRolling(false);
    return null;
  }, [entrants, isRolling, drawWinner]);

  // Finalize winner selection
  const finalizeWinner = useCallback((selectedWinner: GiveawayEntrant) => {
    setWinner(selectedWinner);
    
    // Add to past winners
    setPastWinners(prev => {
      if (prev.some(w => w.username.toLowerCase() === selectedWinner.username.toLowerCase())) {
        return prev;
      }
      return [selectedWinner, ...prev];
    });

    // Remove the winner from the active entrants pool so they can't win again
    setEntrants(prev => {
      seenSlugsRef.current.delete(selectedWinner.slug.toLowerCase());
      return prev.filter(e => e.slug.toLowerCase() !== selectedWinner.slug.toLowerCase());
    });
    
    setIsRolling(false);
  }, []);

  return {
    entrants: entrantsWithChance,
    rawEntrantCount: entrants.length,
    isGiveawayActive,
    entryType,
    keyword,
    subLuckMultiplier,
    restrictToSubs,
    winner,
    pastWinners,
    winnerMessages,
    isRolling,
    rollAnimationTime,
    totalWeight,

    // Provably Fair Exports
    serverSeed,
    clientSeed,
    nonce,
    serverSeedHash,
    lastDrawVerification,
    previousServerSeed,
    previousServerSeedHash,
    previousClientSeed,
    previousNonce,
    
    // Actions
    setEntryType,
    setKeyword,
    setSubLuckMultiplier,
    setRestrictToSubs,
    setRollAnimationTime,

    startGiveaway,
    closeEntries,
    removeEntrant,

    resetGiveaway,
    handleIncomingMessage,
    rollGiveaway,
    finalizeWinner,
    setWinner,
    setPastWinners,
    setClientSeed,
    regenerateSeeds,
    setEntrants
  };
}
