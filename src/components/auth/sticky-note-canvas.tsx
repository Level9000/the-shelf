"use client";

import { useEffect, useState } from "react";

// ── Sticky note config ────────────────────────────────────────────────────────

const NOTE_TYPES = [
  {
    id: "week",
    bg: "#FFE566",
    headerColor: "rgba(0,0,0,0.55)",
    shadow: "rgba(180,140,0,0.18)",
    label: "Do this week",
  },
  {
    id: "today",
    bg: "#7EC8F7",
    headerColor: "rgba(0,0,0,0.55)",
    shadow: "rgba(0,100,180,0.15)",
    label: "Do today",
  },
  {
    id: "blocked",
    bg: "#FFB3B3",
    headerColor: "rgba(0,0,0,0.55)",
    shadow: "rgba(180,40,40,0.15)",
    label: "Blocked",
  },
  {
    id: "done",
    bg: "#85E0A3",
    headerColor: "rgba(0,0,0,0.55)",
    shadow: "rgba(20,140,60,0.15)",
    label: "Done",
  },
];

const NOTE_SNIPPETS = [
  "shipped v1 🎉",
  "talk to 10 users",
  "north star metric?",
  "fix onboarding",
  "pitch deck draft",
  "MVP → beta",
  "hire eng #2",
  "launch on PH",
  "$10k MRR",
  "customer discovery",
  "close seed round",
  "press release",
  "board update",
  "retention strategy",
  "define the hook",
  "demo day prep",
  "simplify the pitch",
  "find co-founder",
  "fundraise Q3",
  "pivot or persevere?",
  "write case study",
  "update investors",
  "set OKRs",
  "user interviews",
];

// ── Tape label config ─────────────────────────────────────────────────────────

const TAPE_LABELS = [
  "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4",
  "Chapter 5", "Chapter 6", "The Prelude",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemKind = "note" | "tape";

type FloatingItem = {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  phase: "in" | "hold" | "out";
  // note-specific
  noteType?: typeof NOTE_TYPES[number];
  snippet?: string;
  // tape-specific
  tapeLabel?: string;
};

let itemId = 0;

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function spawnPosition(): { x: number; y: number } {
  const side = Math.random();
  if (side < 0.25) return { x: rand(2, 20), y: rand(5, 90) };
  if (side < 0.5)  return { x: rand(78, 96), y: rand(5, 90) };
  if (side < 0.75) return { x: rand(22, 78), y: rand(2, 18) };
  return                   { x: rand(22, 78), y: rand(80, 95) };
}

// ── Canvas component ──────────────────────────────────────────────────────────

export function StickyNoteCanvas() {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    function spawn(kind: ItemKind) {
      const id = itemId++;
      const { x, y } = spawnPosition();

      const item: FloatingItem = {
        id,
        kind,
        x,
        y,
        rotation: rand(-13, 13),
        scale: rand(0.85, 1.1),
        phase: "in",
        ...(kind === "note"
          ? {
              noteType: NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)],
              snippet: NOTE_SNIPPETS[Math.floor(Math.random() * NOTE_SNIPPETS.length)],
            }
          : {
              tapeLabel: TAPE_LABELS[Math.floor(Math.random() * TAPE_LABELS.length)],
            }),
      };

      setItems((prev) => [...prev, item]);

      const holdDelay = 700;
      const holdDuration = rand(3000, 6000);
      const fadeOutDuration = 850;

      const t1 = setTimeout(() => {
        setItems((prev) => prev.map((n) => n.id === id ? { ...n, phase: "hold" } : n));

        const t2 = setTimeout(() => {
          setItems((prev) => prev.map((n) => n.id === id ? { ...n, phase: "out" } : n));

          const t3 = setTimeout(() => {
            setItems((prev) => prev.filter((n) => n.id !== id));
          }, fadeOutDuration);

          return () => clearTimeout(t3);
        }, holdDuration);

        return () => clearTimeout(t2);
      }, holdDelay);

      return () => clearTimeout(t1);
    }

    // Staggered initial spawns — mix of notes and tape
    const initial: Array<[ItemKind, number]> = [
      ["note", 0],
      ["tape", 350],
      ["note", 800],
      ["note", 1400],
      ["tape", 1900],
      ["note", 2500],
    ];
    const initialTimers = initial.map(([kind, delay]) =>
      setTimeout(() => spawn(kind), delay)
    );

    // Ongoing spawns
    let spawnTimer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      const delay = rand(1400, 3200);
      spawnTimer = setTimeout(() => {
        // ~25% chance of tape label, 75% sticky note
        spawn(Math.random() < 0.25 ? "tape" : "note");
        scheduleNext();
      }, delay);
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
          from { opacity: 0; transform: translateY(-12px) rotate(var(--rot)) scale(calc(var(--sz) * 0.86)); }
          to   { opacity: 1; transform: translateY(0)     rotate(var(--rot)) scale(var(--sz)); }
        }
        @keyframes item-out {
          from { opacity: 1; transform: translateY(0)    rotate(var(--rot)) scale(var(--sz)); }
          to   { opacity: 0; transform: translateY(8px)  rotate(var(--rot)) scale(calc(var(--sz) * 0.93)); }
        }
        .fi-in   { animation: item-in  0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fi-out  { animation: item-out 0.85s ease-in forwards; }
        .fi-hold { opacity: 1; }
      `}</style>

      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}
      >
        {items.map((item) => {
          const cls =
            item.phase === "in" ? "fi-in" :
            item.phase === "out" ? "fi-out" : "fi-hold";

          const holdTransform = `translateY(0) rotate(${item.rotation}deg) scale(${item.scale})`;

          const cssVars = {
            "--rot": `${item.rotation}deg`,
            "--sz": `${item.scale}`,
          } as React.CSSProperties;

          if (item.kind === "note" && item.noteType) {
            const nt = item.noteType;
            return (
              <div
                key={item.id}
                className={cls}
                style={{
                  ...cssVars,
                  position: "absolute",
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: item.phase === "hold" ? holdTransform : undefined,
                  width: "122px",
                  background: nt.bg,
                  boxShadow: `2px 5px 14px ${nt.shadow}, 0 1px 3px rgba(0,0,0,0.07)`,
                  borderRadius: "2px",
                  padding: "10px 10px 18px",
                  userSelect: "none",
                }}
              >
                {/* Tape strip */}
                <div style={{
                  position: "absolute",
                  top: "-9px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "38px",
                  height: "17px",
                  background: "rgba(255,255,255,0.52)",
                  borderRadius: "2px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }} />

                {/* Category label in Erik */}
                <div style={{
                  fontFamily: '"Erik", "Courier New", monospace',
                  fontSize: "10px",
                  letterSpacing: "0.5px",
                  color: nt.headerColor,
                  marginBottom: "7px",
                  borderBottom: `1px solid rgba(0,0,0,0.1)`,
                  paddingBottom: "5px",
                  lineHeight: 1,
                }}>
                  {nt.label}
                </div>

                {/* Snippet text */}
                <div style={{
                  fontFamily: '"Erik", "Courier New", monospace',
                  fontSize: "12px",
                  lineHeight: 1.4,
                  color: "rgba(0,0,0,0.7)",
                }}>
                  {item.snippet}
                </div>
              </div>
            );
          }

          if (item.kind === "tape" && item.tapeLabel) {
            // Ripped tape label — wider, semi-transparent white, rough edges via SVG filter
            return (
              <div
                key={item.id}
                className={cls}
                style={{
                  ...cssVars,
                  position: "absolute",
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: item.phase === "hold" ? holdTransform : undefined,
                  userSelect: "none",
                }}
              >
                <div style={{
                  position: "relative",
                  display: "inline-block",
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(1px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
                  padding: "7px 18px 8px",
                  // Ripped edge effect via clip-path
                  clipPath: `polygon(
                    0% 8%,   1.5% 0%,  3% 5%,   5% 0%,   7% 6%,   9% 1%,
                    11% 7%,  13% 0%,   15% 5%,  17% 1%,  19% 7%,  21% 0%,
                    23% 6%,  25% 1%,   27% 7%,  29% 0%,  31% 5%,  33% 1%,
                    35% 7%,  37% 0%,   39% 6%,  41% 1%,  43% 7%,  45% 0%,
                    47% 5%,  49% 1%,   51% 7%,  53% 0%,  55% 6%,  57% 1%,
                    59% 7%,  61% 0%,   63% 5%,  65% 1%,  67% 7%,  69% 0%,
                    71% 6%,  73% 1%,   75% 7%,  77% 0%,  79% 5%,  81% 1%,
                    83% 7%,  85% 0%,   87% 6%,  89% 1%,  91% 7%,  93% 0%,
                    95% 5%,  97% 1%,   99% 7%,  100% 4%,
                    100% 88%, 99% 100%, 97% 94%, 95% 100%, 93% 95%, 91% 100%,
                    89% 94%, 87% 100%, 85% 95%, 83% 100%, 81% 94%, 79% 100%,
                    77% 95%, 75% 100%, 73% 94%, 71% 100%, 69% 95%, 67% 100%,
                    65% 94%, 63% 100%, 61% 95%, 59% 100%, 57% 94%, 55% 100%,
                    53% 95%, 51% 100%, 49% 94%, 47% 100%, 45% 95%, 43% 100%,
                    41% 94%, 39% 100%, 37% 95%, 35% 100%, 33% 94%, 31% 100%,
                    29% 95%, 27% 100%, 25% 94%, 23% 100%, 21% 95%, 19% 100%,
                    17% 94%, 15% 100%, 13% 95%, 11% 100%, 9% 94%,  7% 100%,
                    5% 95%,  3% 100%,  1.5% 94%, 0% 100%,
                    0% 8%
                  )`,
                }}>
                  <span style={{
                    fontFamily: '"Erik", "Courier New", monospace',
                    fontSize: "13px",
                    letterSpacing: "0.5px",
                    color: "rgba(0,0,0,0.6)",
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
