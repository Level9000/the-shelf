"use client";

import { useTheme } from "@/lib/theme-context";

export type PressAnimState = "idle" | "thinking" | "talking" | "done";
export type PressSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<PressSize, number> = { sm: 120, md: 200, lg: 280 };

// Simulated text line widths (percent of usable screen width)
const TEXT_LINES = [82, 67, 91, 54, 78, 43, 88, 60];

export function PressMonitor({
  animState = "idle",
  size = "md",
}: {
  animState?: PressAnimState;
  size?: PressSize;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const px = SIZE_MAP[size];
  const vw = 200;
  const vh = 240;
  const scale = px / vw;

  const isThinking = animState === "thinking";
  const isTalking  = animState === "talking";
  const isActive   = isThinking || isTalking;
  const isDone     = animState === "done";

  // Phosphor color — warm amber for Press (editorial, warm, authoritative)
  const phosphor      = "#e8a020";
  const phosphorDim   = "#7a4a08";
  const phosphorFaint = "#2a1a04";
  const screenBg      = "#0c0800";
  const scanlineColor = "rgba(0,0,0,0.18)";

  // Body palette — warm off-white, like an early-80s publishing terminal
  const c = isDark ? {
    body:       "#6a6560",
    bodyTop:    "#7a7570",
    bodyEdge:   "#585350",
    bezel:      "#1e1c18",
    bezelEdge:  "#2e2c28",
    vents:      "#5a5550",
    knob:       "#4a4540",
    led:        isActive ? "#e8a020" : "#3a2a08",
    brand:      "#8a8278",
    standTop:   "#5a5550",
    standBase:  "#4a4540",
  } : {
    body:       "#d8d2c8",
    bodyTop:    "#e4ddd2",
    bodyEdge:   "#b8b2a8",
    bezel:      "#1e1c18",
    bezelEdge:  "#2e2c28",
    vents:      "#c4beb4",
    knob:       "#a8a29a",
    led:        isActive ? "#e8a020" : "#3a2a08",
    brand:      "#888078",
    standTop:   "#c0bab0",
    standBase:  "#b0aaa0",
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width={px}
        height={px * (vh / vw)}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0px ${10 * scale}px ${26 * scale}px rgba(0,0,0,0.32)) drop-shadow(0px ${2 * scale}px ${5 * scale}px rgba(0,0,0,0.15))`,
          overflow: "visible",
        }}
        aria-label="Press monitor"
      >
        {/* ── Monitor body ── */}
        {/* Shadow layer */}
        <rect x="10" y="18" width="180" height="168" rx="10" fill={c.bodyEdge} />
        {/* Main body */}
        <rect x="10" y="15" width="180" height="165" rx="10" fill={c.body} stroke={c.bodyEdge} strokeWidth="1" />
        {/* Top highlight */}
        <rect x="10" y="15" width="180" height="38" rx="10" fill={c.bodyTop} />
        <rect x="10" y="38" width="180" height="15" fill={c.bodyTop} />

        {/* ── Screen bezel (dark surround) ── */}
        <rect x="18" y="22" width="164" height="138" rx="7" fill={c.bezel} stroke={c.bezelEdge} strokeWidth="1" />

        {/* ── CRT screen ── */}
        <rect x="26" y="30" width="148" height="122" rx="4" fill={screenBg} />

        {/* Phosphor glow behind content when active */}
        {isActive && (
          <rect x="26" y="30" width="148" height="122" rx="4" fill={phosphor} opacity="0.04">
            <animate attributeName="opacity" values="0.04;0.09;0.04" dur="2.4s" repeatCount="indefinite" />
          </rect>
        )}

        {/* Scanlines */}
        {Array.from({ length: 30 }).map((_, i) => (
          <rect
            key={i}
            x="26" y={30 + i * 4}
            width="148" height="2"
            fill={scanlineColor}
          />
        ))}

        {/* ── Screen content ── */}
        {/* Header bar — "PRESS // AUTHORED BY" */}
        <rect x="30" y="34" width="140" height="10" rx="1" fill={phosphor} opacity="0.18" />
        <text x="34" y="42" fontFamily="var(--font-cass)" fontSize="6" fill={phosphor} opacity="0.7" letterSpacing="1.5">
          PRESS  //  AUTHORED BY
        </text>
        {/* Divider */}
        <line x1="30" y1="47" x2="170" y2="47" stroke={phosphorDim} strokeWidth="0.5" />

        {/* Simulated text lines */}
        {TEXT_LINES.map((widthPct, i) => {
          const lineW = Math.round(132 * widthPct / 100);
          const lineY = 53 + i * 9;
          const delay = `${i * 0.18}s`;
          const isLastTwo = i >= TEXT_LINES.length - 2;

          if (isDone) {
            return (
              <rect key={i} x="34" y={lineY} width={lineW} height="4" rx="1"
                fill={phosphorDim} opacity="0.4" />
            );
          }

          if (isTalking) {
            return (
              <rect key={i} x="34" y={lineY} width={lineW} height="4" rx="1"
                fill={phosphor} opacity="0">
                <animate
                  attributeName="opacity"
                  values="0;0.85;0.85"
                  dur={`${0.3 + i * 0.2}s`}
                  begin={delay}
                  fill="freeze"
                />
                <animate
                  attributeName="width"
                  values={`0;${lineW}`}
                  dur={`${0.25 + i * 0.15}s`}
                  begin={delay}
                  fill="freeze"
                />
              </rect>
            );
          }

          if (isThinking) {
            // Thinking: lines pulse softly, last line shorter (trailing thought)
            return (
              <rect key={i} x="34" y={lineY}
                width={isLastTwo ? Math.round(lineW * 0.4) : lineW}
                height="4" rx="1"
                fill={isLastTwo ? phosphorDim : phosphor}
                opacity={isLastTwo ? 0.35 : 0.65}
              >
                <animate
                  attributeName="opacity"
                  values={isLastTwo ? "0.35;0.6;0.35" : "0.65;0.9;0.65"}
                  dur={`${1.4 + i * 0.1}s`}
                  begin={`${i * 0.08}s`}
                  repeatCount="indefinite"
                />
              </rect>
            );
          }

          // Idle — dim static lines
          return (
            <rect key={i} x="34" y={lineY} width={lineW} height="4" rx="1"
              fill={phosphor} opacity="0.2" />
          );
        })}

        {/* Cursor — blinks at end of last text line */}
        {!isDone && (
          <rect
            x="34"
            y={53 + TEXT_LINES.length * 9}
            width="6" height="5" rx="1"
            fill={phosphor}
            opacity={isActive ? 0.9 : 0.4}
          >
            <animate
              attributeName="opacity"
              values={isActive ? "0.9;0.1;0.9" : "0.4;0.05;0.4"}
              dur={isThinking ? "0.6s" : "1.1s"}
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Screen corner glare */}
        <ellipse cx="44" cy="40" rx="10" ry="6" fill="white" opacity="0.04" />

        {/* ── Bottom control strip (between bezel bottom and stand neck) ── */}

        {/* Power LED — bottom left */}
        <circle cx="30" cy="170" r="3.5" fill={c.led}>
          {isActive && (
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          )}
        </circle>
        {/* LED glow */}
        {isActive && (
          <circle cx="30" cy="170" r="6" fill={phosphor} opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Brightness / contrast knobs — bottom right */}
        {[0, 1].map((i) => (
          <g key={i}>
            <circle cx={155 + i * 16} cy="170" r="5.5" fill={c.knob} stroke={c.bodyEdge} strokeWidth="0.5" />
            <line
              x1={155 + i * 16} y1="167"
              x2={155 + i * 16} y2="173"
              stroke={c.bodyEdge} strokeWidth="1"
            />
          </g>
        ))}

        {/* ── Vent slots — bottom right of bezel ── */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={155 + i * 5} y="148" width="3" height="8" rx="1" fill={c.vents} opacity="0.6" />
        ))}

        {/* ── Brand label ── */}
        <text x="100" y="166" fontFamily="var(--font-cass)" fontSize="7" fill={c.brand}
          textAnchor="middle" letterSpacing="3" opacity="0.55">
          PRESS
        </text>

        {/* ── Monitor stand ── */}
        {/* Neck */}
        <rect x="82" y="180" width="36" height="22" rx="3" fill={c.standTop} />
        {/* Taper */}
        <rect x="86" y="196" width="28" height="8" rx="2" fill={c.standTop} />
        {/* Base */}
        <rect x="58" y="202" width="84" height="14" rx="6" fill={c.standBase} stroke={c.bodyEdge} strokeWidth="0.5" />
        {/* Base highlight */}
        <rect x="62" y="203" width="76" height="5" rx="3" fill={c.standTop} opacity="0.5" />

        {/* ── Bottom body detail — ridge line ── */}
        <line x1="18" y1="172" x2="182" y2="172" stroke={c.bodyEdge} strokeWidth="0.5" opacity="0.5" />
      </svg>
    </div>
  );
}
