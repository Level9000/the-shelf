"use client";

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

interface ReelProps {
  cx: number;
  cy: number;
  spinDuration: string | null;
}

function Reel({ cx, cy, spinDuration }: ReelProps) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="24" fill="#161616" stroke="#2e2e2e" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="16" fill="#1e1e1e" stroke="#333" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="5" fill="#2a2a2a" />
      {SPOKE_ANGLES.map((angle) => (
        <line
          key={angle}
          x1={cx}
          y1={cy}
          x2={cx + 14 * Math.cos((angle * Math.PI) / 180)}
          y2={cy + 14 * Math.sin((angle * Math.PI) / 180)}
          stroke="#333"
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
  const px = SIZE_MAP[size];
  const scale = px / 200;

  const isRecording = animState === "recording";
  const isListening = animState === "listening";
  const isTalking = animState === "talking";
  const isPlaying = animState === "playing";
  const isActive = isRecording || isTalking || isListening || isPlaying;

  const spinDuration = reelDuration(animState);

  const statusLabel =
    isRecording
      ? "● RECORDING"
      : isListening
      ? "◉ LISTENING"
      : isTalking
      ? "▶ PLAYBACK"
      : isPlaying
      ? "▶ PLAYING"
      : "■ STANDBY";

  return (
    <div
      className="cass-recorder"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 200 260"
        width={px}
        height={px * (260 / 200)}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0px ${12 * scale}px ${32 * scale}px rgba(0,0,0,0.45))` }}
        aria-label={`Cass recorder — ${statusLabel}`}
      >
        {/* Body */}
        <rect x="18" y="30" width="164" height="210" rx="14" ry="14" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />

        {/* Top ridge */}
        <rect x="18" y="30" width="164" height="28" rx="14" ry="14" fill="#222" />
        <rect x="18" y="44" width="164" height="14" fill="#222" />

        {/* Brand label */}
        <rect x="30" y="38" width="90" height="14" rx="3" fill="#111" />
        <text x="38" y="49" fontFamily="'Share Tech Mono', 'Courier New', monospace" fontSize="7" fill="#c8a86b" letterSpacing="2">
          CASS
        </text>

        {/* REC indicator dot */}
        <circle cx="148" cy="45" r="5" fill={isRecording ? "#ff3b30" : "#3a2020"}>
          {isRecording && (
            <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
          )}
        </circle>
        <text x="157" y="49" fontFamily="'Share Tech Mono', 'Courier New', monospace" fontSize="6" fill={isRecording ? "#ff3b30" : "#444"}>
          REC
        </text>

        {/* Cassette window */}
        <rect x="38" y="72" width="124" height="78" rx="8" fill="#0d0d0d" stroke="#2a2a2a" strokeWidth="1" />

        {/* Left reel */}
        <Reel cx={75} cy={111} spinDuration={spinDuration} />

        {/* Right reel */}
        <Reel cx={125} cy={111} spinDuration={spinDuration} />

        {/* Tape path */}
        <path
          d="M 51 128 Q 75 134 100 134 Q 125 134 149 128"
          stroke="#c8a86b"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />

        {/* Cassette status label */}
        <rect x="60" y="78" width="80" height="22" rx="3" fill="#c8a86b" opacity="0.12" />
        <text
          x="100"
          y="91"
          fontFamily="'Share Tech Mono', 'Courier New', monospace"
          fontSize="6"
          fill="#c8a86b"
          textAnchor="middle"
          opacity="0.7"
        >
          {statusLabel}
        </text>

        {/* Button row */}
        <rect x="30" y="162" width="140" height="26" rx="4" fill="#111" />
        {(["◀◀", "▶", "■", "●", "▶▶"] as const).map((label, i) => (
          <g key={label}>
            <rect
              x={33 + i * 27}
              y="165"
              width="22"
              height="20"
              rx="3"
              fill={label === "●" && isRecording ? "#3d1010" : "#1c1c1c"}
              stroke={label === "●" && isRecording ? "#ff3b30" : "#2a2a2a"}
              strokeWidth="1"
            />
            <text
              x={44 + i * 27}
              y="179"
              fontFamily="monospace"
              fontSize={label === "▶" ? "9" : "7"}
              fill={label === "●" && isRecording ? "#ff3b30" : "#555"}
              textAnchor="middle"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Speaker grille */}
        <rect x="30" y="196" width="60" height="34" rx="4" fill="#111" />
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2, 3, 4, 5].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={36 + col * 8}
              cy={202 + row * 6}
              r="1.2"
              fill={(isTalking || isListening || isPlaying) ? "#333" : "#222"}
            >
              {(isTalking || isListening || isPlaying) && (
                <animate
                  attributeName="r"
                  values="1.2;2;1.2"
                  dur={`${0.4 + (row * 6 + col) * 0.03}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))
        )}

        {/* Level meter */}
        <rect x="100" y="196" width="70" height="34" rx="4" fill="#111" />
        <text
          x="135"
          y="207"
          fontFamily="'Share Tech Mono', 'Courier New', monospace"
          fontSize="5"
          fill="#444"
          textAnchor="middle"
        >
          LEVEL
        </text>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => {
          const activeThreshold = isRecording ? 7 : isListening ? 3 : isTalking || isPlaying ? 5 : 1;
          const barActive = bar < activeThreshold;
          return (
            <rect
              key={bar}
              x={103 + bar * 8}
              y="212"
              width="5"
              height="14"
              rx="1"
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
