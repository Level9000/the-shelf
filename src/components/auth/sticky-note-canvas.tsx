"use client";

import { useEffect, useRef, useState } from "react";

// ── Sticky note config ────────────────────────────────────────────────────────

const NOTE_TYPES = [
  {
    id: "week",
    bg: "#FFE566",
    headerBorder: "rgba(0,0,0,0.12)",
    shadow: "rgba(180,140,0,0.2)",
    label: "Do this week",
  },
  {
    id: "today",
    bg: "#7EC8F7",
    headerBorder: "rgba(0,0,0,0.12)",
    shadow: "rgba(0,100,180,0.18)",
    label: "Do today",
  },
  {
    id: "blocked",
    bg: "#FFB3B3",
    headerBorder: "rgba(0,0,0,0.12)",
    shadow: "rgba(180,40,40,0.18)",
    label: "Blocked",
  },
  {
    id: "done",
    bg: "#85E0A3",
    headerBorder: "rgba(0,0,0,0.12)",
    shadow: "rgba(20,140,60,0.18)",
    label: "Done",
  },
];


// ── Tape label config ─────────────────────────────────────────────────────────

const TAPE_LABELS = [
  "Chapter 1", "Chapter 2", "Chapter 3",
  "Chapter 4", "Chapter 5", "Chapter 6",
  "The Prelude",
];

// Matches the STORY/BOARD tape label clip — torn edges on both sides
const TAPE_CLIP = "polygon(5px 0%, calc(100% - 4px) 0%, 100% 22%, calc(100% - 5px) 55%, 100% 78%, calc(100% - 4px) 100%, 5px 100%, 0% 72%, 4px 48%, 0% 22%)";

// ── Types ─────────────────────────────────────────────────────────────────────

type FloatingItem = {
  id: number;
  kind: "note" | "tape";
  x: number;
  y: number;
  rotation: number;
  scale: number;
  phase: "in" | "hold" | "out";
  noteType?: typeof NOTE_TYPES[number];
  tapeLabel?: string;
};

let itemId = 0;

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function spawnPosition(isMobile: boolean): { x: number; y: number } {
  if (isMobile) {
    // Top and bottom zones only, spread across full width
    const zone = Math.random() < 0.5 ? "top" : "bottom";
    if (zone === "top") return { x: rand(5, 72), y: rand(3, 18) };
    return                     { x: rand(5, 72), y: rand(78, 93) };
  }
  // Right side only on desktop
  // Right 50% only on desktop — x starts at 52% so notes stay clearly right of center
  const strip = Math.random();
  if (strip < 0.33) return { x: rand(52, 78), y: rand(5, 35) };
  if (strip < 0.66) return { x: rand(52, 76), y: rand(38, 65) };
  return                   { x: rand(52, 78), y: rand(68, 90) };
}

// ── Canvas ────────────────────────────────────────────────────────────────────

export function StickyNoteCanvas() {
  const [items, setItems] = useState<FloatingItem[]>([]);
  const countRef = useRef(0);

  useEffect(() => {
    const isMobile = window.innerWidth <= 640;

    function spawn(kind: "note" | "tape") {
      if (countRef.current >= 2) return;
      countRef.current += 1;
      const id = itemId++;
      const { x, y } = spawnPosition(isMobile);

      const item: FloatingItem = {
        id,
        kind,
        x,
        y,
        rotation: rand(-11, 11),
        scale: rand(0.88, 1.05),
        phase: "in",
        ...(kind === "note"
          ? {
              noteType: NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)],
            }
          : {
              tapeLabel: TAPE_LABELS[Math.floor(Math.random() * TAPE_LABELS.length)],
            }),
      };

      setItems((prev) => [...prev, item]);

      const t1 = setTimeout(() => {
        setItems((prev) => prev.map((n) => n.id === id ? { ...n, phase: "hold" } : n));
        const t2 = setTimeout(() => {
          setItems((prev) => prev.map((n) => n.id === id ? { ...n, phase: "out" } : n));
          const t3 = setTimeout(() => {
            setItems((prev) => prev.filter((n) => n.id !== id));
            countRef.current = Math.max(0, countRef.current - 1);
          }, 900);
          return () => clearTimeout(t3);
        }, rand(7000, 12000));
        return () => clearTimeout(t2);
      }, 720);
      return () => clearTimeout(t1);
    }

    const initial: Array<["note" | "tape", number]> = [
      ["note", 0],
      ["tape", 2000],
      ["note", 4500],
    ];
    const initialTimers = initial.map(([kind, delay]) =>
      setTimeout(() => spawn(kind), delay)
    );

    let spawnTimer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      spawnTimer = setTimeout(() => {
        spawn(Math.random() < 0.25 ? "tape" : "note");
        scheduleNext();
      }, rand(4000, 7500));
    }
    scheduleNext();

    return () => {
      initialTimers.forEach(clearTimeout);
      clearTimeout(spawnTimer);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes item-in {
          from { opacity: 0; transform: translateY(-14px) rotate(var(--rot)) scale(calc(var(--sz) * 0.84)); }
          to   { opacity: 1; transform: translateY(0)     rotate(var(--rot)) scale(var(--sz)); }
        }
        @keyframes item-out {
          from { opacity: 1; transform: translateY(0)    rotate(var(--rot)) scale(var(--sz)); }
          to   { opacity: 0; transform: translateY(10px) rotate(var(--rot)) scale(calc(var(--sz) * 0.92)); }
        }
        .fi-in  { animation: item-in  0.68s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fi-out { animation: item-out 0.9s ease-in forwards; }
      `}</style>

      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}
      >
        {items.map((item) => {
          const cls = item.phase === "in" ? "fi-in" : item.phase === "out" ? "fi-out" : undefined;
          const holdStyle: React.CSSProperties = item.phase === "hold"
            ? { opacity: 1, transform: `translateY(0) rotate(${item.rotation}deg) scale(${item.scale})` }
            : {};
          const cssVars = { "--rot": `${item.rotation}deg`, "--sz": `${item.scale}` } as React.CSSProperties;

          if (item.kind === "note" && item.noteType) {
            const nt = item.noteType;
            return (
              <div
                key={item.id}
                className={cls}
                style={{
                  ...cssVars,
                  ...holdStyle,
                  position: "absolute",
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: "240px",
                  height: "240px",
                  background: nt.bg,
                  boxShadow: `3px 6px 20px ${nt.shadow}, 0 2px 5px rgba(0,0,0,0.08)`,
                  borderRadius: "2px",
                  padding: "18px 18px 18px",
                  userSelect: "none",
                }}
              >
                {/* Tape strip at top */}
                <div style={{
                  position: "absolute",
                  top: "-11px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60px",
                  height: "22px",
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: "2px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }} />

                {/* Label — fills the card */}
                <div style={{
                  fontFamily: '"Erik", "Courier New", monospace',
                  fontSize: "26px",
                  lineHeight: 1.3,
                  color: "rgba(0,0,0,0.65)",
                }}>
                  {nt.label}
                </div>
              </div>
            );
          }

          if (item.kind === "tape" && item.tapeLabel) {
            return (
              <div
                key={item.id}
                className={cls}
                style={{
                  ...cssVars,
                  ...holdStyle,
                  position: "absolute",
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  userSelect: "none",
                }}
              >
                <div style={{
                  display: "inline-block",
                  background: "#e8dfc0",
                  clipPath: TAPE_CLIP,
                  boxShadow: "2px 2px 8px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.1)",
                  padding: "10px 32px 12px",
                }}>
                  <span style={{
                    fontFamily: '"Erik", "Courier New", monospace',
                    fontSize: "20px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    color: "#9a8450",
                    whiteSpace: "nowrap",
                  }}>
                    {item.tapeLabel}
                  </span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </>
  );
}
