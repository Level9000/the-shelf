"use client";

import { useTheme } from "@/lib/theme-context";
import type { CassAnimState, CassSize } from "./cassVoice";

// Size map: sm=120, md=200, lg=280
const SIZE_MAP: Record<CassSize, number> = { sm: 120, md: 200, lg: 280 };

// Reel spin duration per state
function reelDuration(state: CassAnimState): string | null {
  if (state === "recording") return "1.2s";
  if (state === "listening" || state === "talking") return "3s";
  if (state === "playing") return "2s";
  return null; // idle — no spin
}

// Spoke angles for reel arms
const SPOKE_ANGLES = [0, 60, 120, 180, 240, 300];

interface ReelColors {
  outer: string; outerStroke: string;
  inner: string; innerStroke: string;
  center: string; spoke: string;
}

interface ReelProps {
  cx: number;
  cy: number;
  spinDuration: string | null;
  colors: ReelColors;
}

function Reel({ cx, cy, spinDuration, colors }: ReelProps) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="24" fill={colors.outer} stroke={colors.outerStroke} strokeWidth="1" />
      <circle cx={cx} cy={cy} r="16" fill={colors.inner} stroke={colors.innerStroke} strokeWidth="1" />
      <circle cx={cx} cy={cy} r="5" fill={colors.center} />
      {SPOKE_ANGLES.map((angle) => (
        <line
          key={angle}
          x1={cx} y1={cy}
          x2={cx + 14 * Math.cos((angle * Math.PI) / 180)}
          y2={cy + 14 * Math.sin((angle * Math.PI) / 180)}
          stroke={colors.spoke}
          strokeWidth="1.5"
        >
          {spinDuration && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur={spinDuration}
              repeatCount="indefinite"
            />
          )}
        </line>
      ))}
    </g>
  );
}

export function CassRecorder({
  animState,
  size = "md",
}: {
  animState: CassAnimState;
  size?: CassSize;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const px = SIZE_MAP[size];
  const scale = px / 200;

  const isRecording = animState === "recording";
  const isListening = animState === "listening";
  const isTalking   = animState === "talking";
  const isPlaying   = animState === "playing";
  const isActive    = isRecording || isTalking || isListening || isPlaying;

  const spinDuration = reelDuration(animState);

  const statusLabel =
    isRecording ? "● RECORDING" :
    isListening ? "◉ LISTENING" :
    isTalking   ? "▶ PLAYBACK"  :
    isPlaying   ? "▶ PLAYING"   : "■ STANDBY";

  // Brand label swaps to the current state — sized to keep each word fitting
  // the same fixed-width label plate.
  const brandLabel =
    isRecording || isListening ? "LISTENING" :
    isTalking || isPlaying     ? "TALKING"   : "READY";
  const brandFontSize =
    brandLabel === "LISTENING" ? 8.5 :
    brandLabel === "TALKING"   ? 10  : 12;
  const brandLetterSpacing =
    brandLabel === "LISTENING" ? 1 :
    brandLabel === "TALKING"   ? 2 : 4;

  // Same palette in both light and dark — the lighter gray looks great everywhere.
  const c = {
    body:         "#787878",
    bodyStroke:   "#999999",
    ridge:        "#8a8a8a",
    labelBg:      "#5a5a5a",
    windowBg:     "#3c3c3c",
    windowStroke: "#5a5a5a",
    buttonRow:    "#5a5a5a",
    buttonFill:   "#6a6a6a",
    buttonStroke: "#808080",
    buttonText:   "#cccccc",
    speakerBox:   "#5a5a5a",
    speakerOn:    "#888888",
    speakerOff:   "#707070",
    meterBox:     "#5a5a5a",
    meterLabel:   "#aaaaaa",
    recOff:       "#8a4040",
    recTextOff:   "#888888",
    reel: {
      outer: "#5a5a5a", outerStroke: "#7a7a7a",
      inner: "#686868", innerStroke: "#888888",
      center: "#7a7a7a", spoke: "#8a8a8a",
    },
  };

  return (
    <div
      className="cass-recorder"
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        viewBox="0 0 200 260"
        width={px}
        height={px * (260 / 200)}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0px ${12 * scale}px ${32 * scale}px rgba(0,0,0,${isDark ? 0.45 : 0.12}))` }}
        aria-label={`Cass recorder — ${statusLabel}`}
      >
        {/* Body */}
        <rect x="18" y="30" width="164" height="210" rx="14" ry="14" fill={c.body} stroke={c.bodyStroke} strokeWidth="1.5" />

        {/* Top ridge */}
        <rect x="18" y="30" width="164" height="28" rx="14" ry="14" fill={c.ridge} />
        <rect x="18" y="44" width="164" height="14" fill={c.ridge} />

        {/* Brand label */}
        <rect x="30" y="34" width="102" height="19" rx="3" fill={c.labelBg} />
        <text
          x="81" y="49"
          fontFamily="var(--font-cass)"
          fontSize={brandFontSize}
          fill="#c8a86b"
          letterSpacing={brandLetterSpacing}
          textAnchor="middle"
        >
          {brandLabel}
        </text>

        {/* Status indicator dot — green while ready/listening, red while talking */}
        <circle cx="148" cy="45" r="5" fill={isTalking || isPlaying ? "#ff3b30" : "#34c759"}>
          {isActive && (
            <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
          )}
        </circle>
        <text x="157" y="49" fontFamily="var(--font-cass)" fontSize="6" fill={isRecording ? "#ff3b30" : c.recTextOff}>
          REC
        </text>

        {/* Cassette window */}
        <rect x="38" y="72" width="124" height="78" rx="8" fill={c.windowBg} stroke={c.windowStroke} strokeWidth="1" />

        {/* Tape path — behind the reels */}
        <path
          d="M 62 132 Q 75 138 100 138 Q 125 138 138 132"
          stroke="#c8a86b" strokeWidth="1.5" fill="none" opacity="0.6"
        />

        {/* Left reel */}
        <Reel cx={75} cy={111} spinDuration={spinDuration} colors={c.reel} />

        {/* Right reel */}
        <Reel cx={125} cy={111} spinDuration={spinDuration} colors={c.reel} />

        {/* Button row */}
        <rect x="30" y="162" width="140" height="26" rx="4" fill={c.buttonRow} />
        {(["◀◀", "▶", "■", "●", "▶▶"] as const).map((label, i) => (
          <g key={label}>
            <rect
              x={33 + i * 27} y="165" width="22" height="20" rx="3"
              fill={label === "●" && isRecording ? "#3d1010" : c.buttonFill}
              stroke={label === "●" && isRecording ? "#ff3b30" : c.buttonStroke}
              strokeWidth="1"
            />
            <text
              x={44 + i * 27} y="179"
              fontFamily="monospace"
              fontSize={label === "▶" ? "9" : "7"}
              fill={label === "●" && isRecording ? "#ff3b30" : c.buttonText}
              textAnchor="middle"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Speaker grille */}
        <rect x="30" y="196" width="60" height="34" rx="4" fill={c.speakerBox} />
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2, 3, 4, 5].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={40 + col * 8} cy={202 + row * 6} r="1.2"
              fill={isActive ? c.speakerOn : c.speakerOff}
            >
              {(isTalking || isListening || isPlaying) && (
                <animate
                  attributeName="r" values="1.2;2;1.2"
                  dur={`${0.4 + (row * 6 + col) * 0.03}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))
        )}

        {/* Level meter */}
        <rect x="100" y="196" width="70" height="34" rx="4" fill={c.meterBox} />
        <text x="135" y="207" fontFamily="var(--font-cass)" fontSize="5" fill={c.meterLabel} textAnchor="middle">
          LEVEL
        </text>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => {
          const activeThreshold = isRecording ? 7 : isListening ? 3 : isTalking || isPlaying ? 5 : 1;
          const barActive = bar < activeThreshold;
          return (
            <rect
              key={bar}
              x={103 + bar * 8} y="212" width="5" height="14" rx="1"
              fill={bar > 5 ? "#ff3b30" : bar > 3 ? "#c8a86b" : "#2a6b3a"}
              opacity={barActive ? 1 : 0.15}
            >
              {(isRecording || isTalking || isPlaying) && (
                <animate
                  attributeName="opacity"
                  values={barActive ? "1;0.4;1" : "0.15;0.3;0.15"}
                  dur={`${0.3 + bar * 0.07}s`}
                  repeatCount="indefinite"
                />
              )}
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
