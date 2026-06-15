"use client";

import { useEffect, useState } from "react";

export type TypewriterAnimState = "idle" | "typing" | "thinking" | "done";
export type TypewriterSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<TypewriterSize, number> = { sm: 160, md: 280, lg: 400 };

// Key layout rows — each row is centered within the keyboard bed (x=12, width=256)
// Row width = count × (keyW + gap) - gap; startX = 12 + (256 - rowWidth) / 2
const KEY_ROWS = [
  { count: 13, startX: 17, y: 147, keyW: 17 }, // rowW=245 → startX≈17 ✓
  { count: 12, startX: 27, y: 163, keyW: 17 }, // rowW=226 → startX≈27
  { count: 11, startX: 37, y: 179, keyW: 17 }, // rowW=207 → startX≈37
  { count: 10, startX: 46, y: 195, keyW: 17 }, // rowW=188 → startX≈46
];
const KEY_GAP = 2;
const TOTAL_KEYS = KEY_ROWS.reduce((sum, r) => sum + r.count, 0); // 46

export function TypewriterRecorder({
  animState = "idle",
  size = "md",
}: {
  animState?: TypewriterAnimState;
  size?: TypewriterSize;
}) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  // Carriage position offset (paper shifts left as typing progresses)
  const [carriageX, setCarriageX] = useState(0);

  useEffect(() => {
    if (animState === "idle" || animState === "done") {
      setPressedKeys(new Set());
      setCarriageX(0);
      return;
    }

    const interval = animState === "typing" ? 550 : 1400;

    const id = setInterval(() => {
      const keyIdx = Math.floor(Math.random() * TOTAL_KEYS);
      setPressedKeys((prev) => new Set(prev).add(keyIdx));
      // Drift carriage left slowly while typing
      if (animState === "typing") {
        setCarriageX((x) => {
          const next = x - 0.8;
          return next < -28 ? 0 : next; // reset (carriage return)
        });
      }
      setTimeout(() => {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(keyIdx);
          return next;
        });
      }, Math.max(120, interval - 200));
    }, interval);

    return () => clearInterval(id);
  }, [animState]);

  const px = SIZE_MAP[size];
  const vw = 280;
  const vh = 256;
  const scale = px / vw;
  const isActive = animState === "typing" || animState === "thinking";

  // Palette — warm cream/beige matching the reference photo
  const c = {
    body:         "#cec7bb",
    bodyTop:      "#ddd6c8",
    bodyShadow:   "#aaa49a",
    bodyEdge:     "#b8b1a5",
    platen:       "#2a2620",
    platenEnd:    "#3e3830",
    paper:        "#f7f4ee",
    paperLine:    "#e8e3da",
    chrome:       "#9c948a",
    chromeShine:  "#b8b0a6",
    keyBed:       "#7a6e62",
    keyBedShadow: "#5e5448",
    keyFill:      "#ddd8cc",
    keyTop:       "#e8e4d8",
    keyBottom:    "#c4beb4",
    keyPressed:   "#c0b9ae",
    keyStroke:    "#b0aaa0",
    guide:        "#3a3430",
    knob:         "#b4ada2",
    knobCenter:   "#cec7bb",
    lever:        "#888078",
  };

  // Build all key positions
  let keyIndex = 0;
  const allKeys: { x: number; y: number; w: number; idx: number }[] = [];
  for (const row of KEY_ROWS) {
    for (let i = 0; i < row.count; i++) {
      allKeys.push({
        x: row.startX + i * (row.keyW + KEY_GAP),
        y: row.y,
        w: row.keyW,
        idx: keyIndex++,
      });
    }
  }

  // Space bar index (treated separately)
  const SPACE_IDX = TOTAL_KEYS;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width={px}
        height={px * (vh / vw)}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0px ${10 * scale}px ${28 * scale}px rgba(0,0,0,0.30)) drop-shadow(0px ${2 * scale}px ${6 * scale}px rgba(0,0,0,0.18))`,
          overflow: "visible",
        }}
        aria-label="Typewriter"
      >
        {/* ── Main body ── */}
        <rect x="8"  y="58" width="264" height="182" rx="18" fill={c.bodyShadow} />
        <rect x="8"  y="58" width="264" height="178" rx="18" fill={c.body} stroke={c.bodyEdge} strokeWidth="1" />
        {/* Top highlight band */}
        <rect x="8"  y="58" width="264" height="46" rx="18" fill={c.bodyTop} />
        <rect x="8"  y="90" width="264" height="14" fill={c.bodyTop} />

        {/* ── Platen (paper roller) — moves with carriage ── */}
        <g style={{ transform: `translateX(${carriageX}px)`, transition: isActive ? "transform 0.3s linear" : "none" }}>
          {/* Platen barrel */}
          <rect x="14" y="46" width="252" height="34" rx="9" fill={c.platen} />
          {/* Platen shine */}
          <rect x="14" y="48" width="252" height="6"  rx="4" fill={c.platenEnd} opacity="0.6" />
          {/* Platen end caps */}
          <rect x="14" y="46" width="14"  height="34" rx="7" fill={c.platenEnd} />
          <rect x="252" y="46" width="14" height="34" rx="7" fill={c.platenEnd} />


        </g>

        {/* ── Platen knobs — repositioned into body gray area above keyboard ── */}
        {/* Left knob */}
        <circle cx="46" cy="115" r="13" fill={c.knob} stroke={c.bodyShadow} strokeWidth="1" />
        <circle cx="46" cy="115" r="8"  fill={c.knobCenter} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line key={a}
            x1={46 + 5 * Math.cos((a * Math.PI) / 180)}
            y1={115 + 5 * Math.sin((a * Math.PI) / 180)}
            x2={46 + 10 * Math.cos((a * Math.PI) / 180)}
            y2={115 + 10 * Math.sin((a * Math.PI) / 180)}
            stroke={c.bodyShadow} strokeWidth="1.5"
          />
        ))}
        {/* Right knob */}
        <circle cx="234" cy="115" r="13" fill={c.knob} stroke={c.bodyShadow} strokeWidth="1" />
        <circle cx="234" cy="115" r="8"  fill={c.knobCenter} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line key={a}
            x1={234 + 5 * Math.cos((a * Math.PI) / 180)}
            y1={115 + 5 * Math.sin((a * Math.PI) / 180)}
            x2={234 + 10 * Math.cos((a * Math.PI) / 180)}
            y2={115 + 10 * Math.sin((a * Math.PI) / 180)}
            stroke={c.bodyShadow} strokeWidth="1.5"
          />
        ))}

        {/* ── Paper guide rail (chrome bar across front of platen) ── */}
        <rect x="12" y="84" width="256" height="7" rx="3" fill={c.chrome} />
        <rect x="12" y="84" width="256" height="3" rx="3" fill={c.chromeShine} opacity="0.5" />

        {/* ── Margin levers on guide rail ── */}
        <rect x="55" y="82" width="4" height="11" rx="1" fill={c.lever} />
        <rect x="210" y="82" width="4" height="11" rx="1" fill={c.lever} />

        {/* ── Keyboard bed — y=138, height=86 → bottom y=224, inside body (y=236) ── */}
        {/* Shadow underneath */}
        <rect x="12" y="140" width="256" height="88" rx="12" fill={c.keyBedShadow} />
        {/* Main key bed */}
        <rect x="12" y="138" width="256" height="86" rx="12" fill={c.keyBed} />
        {/* Top edge highlight */}
        <rect x="12" y="138" width="256" height="4" rx="2" fill={c.lever} opacity="0.4" />

        {/* ── Keys ── */}
        {allKeys.map((key) => {
          const pressed = pressedKeys.has(key.idx);
          return (
            <g
              key={key.idx}
              style={{
                transform: pressed ? "translateY(2px)" : "translateY(0px)",
                transition: "transform 0.05s ease-out",
              }}
            >
              {/* Key shadow */}
              <rect
                x={key.x} y={key.y + 2}
                width={key.w} height={11}
                rx="2.5" fill={c.keyBottom}
              />
              {/* Key cap face */}
              <rect
                x={key.x} y={key.y}
                width={key.w} height={10}
                rx="2.5"
                fill={pressed ? c.keyPressed : c.keyFill}
                stroke={c.keyStroke}
                strokeWidth="0.5"
              />
              {/* Key top shine */}
              <rect
                x={key.x + 1} y={key.y + 1}
                width={key.w - 2} height={3}
                rx="1.5"
                fill={pressed ? "rgba(0,0,0,0.04)" : c.keyTop}
                opacity="0.6"
              />
            </g>
          );
        })}

        {/* ── Space bar ── */}
        <g
          style={{
            transform: pressedKeys.has(SPACE_IDX) ? "translateY(2px)" : "translateY(0px)",
            transition: "transform 0.05s ease-out",
          }}
        >
          <rect x="74" y={215} width="132" height="11" rx="3" fill={c.keyBottom} />
          <rect
            x="74" y={213}
            width="132" height={10}
            rx="3"
            fill={pressedKeys.has(SPACE_IDX) ? c.keyPressed : c.keyFill}
            stroke={c.keyStroke}
            strokeWidth="0.5"
          />
          <rect x="76" y={214} width="128" height="3" rx="1.5" fill={c.keyTop} opacity="0.5" />
        </g>

        {/* ── Decorative brand plate + status — between guide rail and knobs ── */}
        <rect x="104" y="96" width="72" height="10" rx="2" fill={c.guide} opacity="0.25" />
        <text
          x="140" y="104"
          fontFamily="var(--font-cass)"
          fontSize="6"
          fill={c.chromeShine}
          textAnchor="middle"
          letterSpacing="1.5"
          opacity="0.55"
        >
          AUTHORED BY
        </text>
        <text
          x="140" y="132"
          fontFamily="var(--font-cass)"
          fontSize="6"
          fill={c.bodyEdge}
          textAnchor="middle"
          letterSpacing="2"
          opacity="0.6"
        >
          {animState === "typing" ? "● COMPOSING" : animState === "thinking" ? "◉ THINKING" : animState === "done" ? "■ COMPLETE" : "■ STANDBY"}
        </text>
      </svg>
    </div>
  );
}
