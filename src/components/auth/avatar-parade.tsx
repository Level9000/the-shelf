"use client";

import { useEffect, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { PressMonitor } from "@/components/ui/PressMonitor";

type AvatarId = "cass" | "ty" | "press";
type Phase = "in" | "hold" | "out";

type ParadeItem = {
  id: number;
  avatar: AvatarId;
  top: number; // vh %
  phase: Phase;
};

const AVATAR_META: Record<AvatarId, { name: string; role: string }> = {
  cass:  { name: "Cass",  role: "Story Guide" },
  ty:    { name: "Ty",    role: "Narrative Writer" },
  press: { name: "Press", role: "Presentation Designer" },
};

const AVATARS: AvatarId[] = ["cass", "ty", "press"];

let paradeId = 0;

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function AvatarNode({ avatar, phase }: { avatar: AvatarId; phase: Phase }) {
  const animClass =
    phase === "in"   ? "parade-in"   :
    phase === "out"  ? "parade-out"  : "parade-hold";

  const inner = (
    <div className={animClass} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      {avatar === "cass"  && <CassRecorder  animState="talking" size="md" />}
      {avatar === "ty"    && <TypewriterRecorder animState="typing" size="md" />}
      {avatar === "press" && <PressMonitor  animState="talking" size="md" />}

      {/* Name tag */}
      <div style={{
        background: "rgba(255,255,255,0.88)",
        borderRadius: "8px",
        padding: "5px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "13px",
          fontWeight: 700,
          color: "#c8a86b",
          lineHeight: 1.2,
        }}>
          {AVATAR_META[avatar].name}
        </div>
        <div style={{
          fontFamily: '"Erik", "Courier New", monospace',
          fontSize: "9px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.35)",
          marginTop: "2px",
        }}>
          {AVATAR_META[avatar].role}
        </div>
      </div>
    </div>
  );

  return inner;
}

export function AvatarParade() {
  const [items, setItems] = useState<ParadeItem[]>([]);

  useEffect(() => {
    // Cycle through avatars in a shuffled order, never repeat back-to-back
    let lastAvatar: AvatarId | null = null;

    function pickAvatar(): AvatarId {
      const pool = AVATARS.filter((a) => a !== lastAvatar);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      lastAvatar = pick;
      return pick;
    }

    function spawnAvatar() {
      const id = paradeId++;
      const avatar = pickAvatar();
      const top = rand(20, 65); // vertical position (vh %)

      const item: ParadeItem = { id, avatar, top, phase: "in" };
      setItems((prev) => [...prev, item]);

      // Slide in → hold
      const t1 = setTimeout(() => {
        setItems((prev) => prev.map((n) => n.id === id ? { ...n, phase: "hold" } : n));

        // Hold → slide out
        const t2 = setTimeout(() => {
          setItems((prev) => prev.map((n) => n.id === id ? { ...n, phase: "out" } : n));

          // Remove after slide-out
          const t3 = setTimeout(() => {
            setItems((prev) => prev.filter((n) => n.id !== id));
          }, 1000);
          return () => clearTimeout(t3);
        }, rand(2800, 4500));
        return () => clearTimeout(t2);
      }, 900);
      return () => clearTimeout(t1);
    }

    // First avatar after a short delay
    const t0 = setTimeout(spawnAvatar, 1800);

    // Then schedule subsequent ones
    let nextTimer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      nextTimer = setTimeout(() => {
        spawnAvatar();
        scheduleNext();
      }, rand(5000, 9000));
    }
    scheduleNext();

    return () => {
      clearTimeout(t0);
      clearTimeout(nextTimer);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes parade-slide-in {
          from { transform: translateX(-320px); opacity: 0; }
          to   { transform: translateX(0);      opacity: 1; }
        }
        @keyframes parade-slide-out {
          from { transform: translateX(0);        opacity: 1; }
          to   { transform: translateX(38vw);     opacity: 0; }
        }
        .parade-in   { animation: parade-slide-in  0.9s cubic-bezier(0.22,1,0.36,1) forwards; }
        .parade-out  { animation: parade-slide-out 0.95s cubic-bezier(0.4,0,1,1) forwards; }
        .parade-hold { transform: translateX(0); opacity: 1; }
      `}</style>

      <style>{`.avatar-parade-wrap { display: block; } @media (max-width: 640px) { .avatar-parade-wrap { display: none; } }`}</style>
      <div
        aria-hidden="true"
        className="avatar-parade-wrap"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              position: "absolute",
              left: "6%",
              top: `${item.top}%`,
              transform: "translateY(-50%)",
            }}
          >
            <AvatarNode avatar={item.avatar} phase={item.phase} />
          </div>
        ))}
      </div>
    </>
  );
}
