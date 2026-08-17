import React, { useEffect, useRef, useState } from "react";
import { Award, RefreshCw, Star, Volume2, VolumeX, Sparkles } from "lucide-react";
import { GiveawayEntrant } from "@/hooks/useGiveawayManager";
import confetti from "canvas-confetti";
import { playSynthSound } from "@/utils/audio";

interface WinnerPickerAnimationProps {
  winner: GiveawayEntrant | null;
  entrants: GiveawayEntrant[];
  isRolling: boolean;
  onRollComplete: (winner: GiveawayEntrant) => void;
  selectedWinnerToRoll: GiveawayEntrant | null;
  rollAnimationTime: number;
}

export default function WinnerPickerAnimation({
  winner,
  entrants,
  isRolling,
  onRollComplete,
  selectedWinnerToRoll,
  rollAnimationTime
}: WinnerPickerAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cards, setCards] = useState<GiveawayEntrant[]>([]);
  const [translateX, setTranslateX] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [showWinnerReveal, setShowWinnerReveal] = useState(false);

  const CARD_WIDTH = 130; // px
  const CARD_GAP = 12; // px
  const ITEM_STEP = CARD_WIDTH + CARD_GAP; // 142px
  const WINNING_INDEX = 42; // Index in the track where the actual winner will be placed

  // Populate cards array when rolling starts
  useEffect(() => {
    if (isRolling && selectedWinnerToRoll && entrants.length > 0) {
      setHasSpun(false);
      setShowWinnerReveal(false);
      setTranslateX(0);

      // Construct a long list of cards (55 total)
      const list: GiveawayEntrant[] = [];
      const pool = entrants.length > 0 ? entrants : [];
      
      for (let i = 0; i < 50; i++) {
        // Grab a random entrant from the pool
        const randIndex = Math.floor(Math.random() * pool.length);
        const randomEntrant = pool[randIndex];
        list.push({ ...randomEntrant });
      }

      // Overwrite the specific winning index with the pre-determined actual winner
      list[WINNING_INDEX] = { ...selectedWinnerToRoll };

      setCards(list);

      // Trigger the spin on the next render frame
      const timer = setTimeout(() => {
        spinToWinner();
      }, 100);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRolling, selectedWinnerToRoll]);

  const spinToWinner = () => {
    if (!containerRef.current || !trackRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    
    // Calculate distance to the winning card
    // TranslateX to center the winning card in the viewport
    const targetOffset = WINNING_INDEX * ITEM_STEP + CARD_WIDTH / 2;
    const centerOffset = containerWidth / 2;
    
    // Add a slight random offset within the card boundaries (suspense factor)
    const randomFudge = Math.floor(Math.random() * (CARD_WIDTH - 30)) - (CARD_WIDTH / 2 - 15);
    const finalTranslate = -(targetOffset - centerOffset + randomFudge);

    setTranslateX(finalTranslate);
    setHasSpun(true);

    let observer: IntersectionObserver | null = null;
    let ticksPlayed = 0;

    // Use IntersectionObserver to play ticks instead of getBoundingClientRect loop.
    // This removes layout thrashing entirely since it calculates intersections off the main thread.
    if (containerRef.current) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && ticksPlayed <= WINNING_INDEX) {
            playSynthSound("tick");
            ticksPlayed++;
          }
        });
      }, {
        root: containerRef.current,
        rootMargin: "0px -49% 0px -50%", // A 1% vertical sliver exactly in the center
        threshold: 0
      });

      itemRefs.current.forEach(el => {
        if (el) observer?.observe(el);
      });
    }

    const soundTimer = setTimeout(() => {
      observer?.disconnect();
      triggerConfetti();
      setShowWinnerReveal(true);
      if (selectedWinnerToRoll) {
        onRollComplete(selectedWinnerToRoll);
      }
    }, (rollAnimationTime * 1000) + 100);

    return () => {
      clearTimeout(soundTimer);
      observer?.disconnect();
    };
  };

  const triggerConfetti = () => {
    // Fire double canvas-confetti bursts for heavy visual celebration
    const end = Date.now() + 2 * 1000;
    
    const colors = ["#dc2626", "#a855f7", "#ffffff"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center select-none animate-fadeIn border border-kick/20" style={{ background: '#050505' }}>
          {/* Neon lights */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-kick/10 pointer-events-none" />

          {/* Heading */}
          <div className="relative flex items-center gap-2 mb-6 z-10">
            <Sparkles className="w-5 h-5 text-kick animate-pulse" />
            <h2 className="text-sm font-extrabold font-display tracking-widest uppercase text-zinc-300">
              Drawing Winner...
            </h2>
          </div>

          {/* CS:GO Selector Window */}
          <div
            ref={containerRef}
            className="relative w-full h-[180px] bg-obsidian border border-kick rounded-2xl overflow-hidden z-10"
          >
            {/* Dark vignette gradient overlays */}
            <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-obsidian to-transparent z-20 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-obsidian to-transparent z-20 pointer-events-none" />

            {/* Target Alignment Center Line Indicator */}
            <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-kick shrink-0 z-10" />
              <div className="w-[2px] flex-1 bg-kick animate-pulse-line -my-[1px]" />
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-kick shrink-0 z-10" />
            </div>

            {/* Moving Track */}
            <div
              ref={trackRef}
              style={{
                transform: `translateX(${translateX}px) translateZ(0)`,
                transition: hasSpun ? `transform ${rollAnimationTime * 1000}ms cubic-bezier(0.08, 0.82, 0.12, 1)` : "none",
                willChange: "transform",
                gap: `${CARD_GAP}px`,
                width: `${cards.length * ITEM_STEP}px`,
              }}
              className="absolute top-0 bottom-0 flex items-center pl-1/2"
            >
              {cards.map((card, idx) => (
                <div
                  key={`${card.slug}-${idx}`}
                  ref={el => { itemRefs.current[idx] = el; }}
                  style={{
                    width: `${CARD_WIDTH}px`,
                    borderColor: card.isSubscriber ? "rgba(220, 38, 38, 0.3)" : "rgba(255,255,255,0.06)",
                    boxShadow: card.isSubscriber && idx === WINNING_INDEX && showWinnerReveal
                      ? "0 0 35px rgba(220, 38, 38, 0.1)"
                      : "none"
                  }}
                  className={`h-[120px] bg-charcoal/80 border rounded-xl flex flex-col items-center justify-between p-3 select-none transition-all duration-300 relative shrink-0 ${
                    idx === WINNING_INDEX && showWinnerReveal
                      ? "bg-kick/10 border-kick glow-kick scale-105"
                      : "opacity-60"
                  }`}
                >
                  {/* Subscriber Star */}
                  {card.isSubscriber && (
                    <div className="absolute top-2 right-2 bg-kick text-obsidian p-0.5 rounded-full z-10 shadow border border-kick/40">
                      <Star className="w-2.5 h-2.5 fill-obsidian" />
                    </div>
                  )}

                  {/* Dynamic Abstract Avatar */}
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${card.color || "#dc2626"}22, ${card.color || "#dc2626"}55)`,
                      borderColor: card.color || "#dc2626"
                    }}
                    className="w-11 h-11 rounded-full border flex items-center justify-center font-black font-display text-white text-base select-none shrink-0"
                  >
                    {card.username.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Username Display */}
                  <div className="w-full text-center">
                    <span
                      style={{ color: card.color }}
                      className="font-black text-xs block truncate px-1"
                    >
                      {card.username}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5 block font-mono">
                      {card.isSubscriber ? "SUBSCRIBER" : "VIEWER"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
