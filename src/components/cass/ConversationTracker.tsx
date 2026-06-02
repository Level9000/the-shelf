"use client";

/**
 * ConversationTracker — a minimal step-progress strip shown during
 * kickoff and retro conversations to cue the user how far along they are.
 *
 * Steps are rendered as dots connected by a line:
 *   ✓ ─── ✓ ─── ● ─── ○ ─── ○
 * Completed = gold check, Current = bright gold dot, Upcoming = dim circle.
 */

export type TrackerStep = {
  id: string;
  label: string;
};

export const KICKOFF_STEPS: TrackerStep[] = [
  { id: "context", label: "Context"     },
  { id: "work",    label: "The Work"    },
  { id: "stakes",  label: "The Stakes"  },
  { id: "thesis",  label: "Opening Line"},
];

export const RETRO_STEPS: TrackerStep[] = [
  { id: "accounting",      label: "What Happened" },
  { id: "surprise",        label: "Surprises"     },
  { id: "learning",        label: "Lessons"       },
  { id: "emotional_close", label: "How It Felt"   },
  { id: "bridge",          label: "Your Story"    },
];

export function ConversationTracker({
  steps,
  currentStepId,
}: {
  steps: TrackerStep[];
  currentStepId: string | null;
}) {
  if (!currentStepId) return null;

  const currentIdx = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 0,
        padding: "12px 8px 4px",
        width: "100%",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      {steps.map((step, i) => {
        const isDone    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isLast    = i === steps.length - 1;

        return (
          <div
            key={step.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: isLast ? "0 0 auto" : 1,
              position: "relative",
            }}
          >
            {/* Connector line — drawn from centre of this dot to centre of next */}
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  top: "7px",
                  left: "50%",
                  right: "-50%",
                  height: "1.5px",
                  background: isDone
                    ? "rgba(200,168,107,0.55)"
                    : "rgba(255,255,255,0.08)",
                  transition: "background 0.4s ease",
                  zIndex: 0,
                }}
              />
            )}

            {/* Dot */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: isCurrent ? "16px" : "14px",
                height: isCurrent ? "16px" : "14px",
                borderRadius: "50%",
                border: isDone
                  ? "none"
                  : isCurrent
                  ? "2px solid rgba(200,168,107,0.9)"
                  : "1.5px solid rgba(255,255,255,0.15)",
                background: isDone
                  ? "rgba(200,168,107,0.85)"
                  : isCurrent
                  ? "rgba(200,168,107,0.15)"
                  : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.35s ease",
                boxShadow: isCurrent
                  ? "0 0 8px rgba(200,168,107,0.35)"
                  : "none",
              }}
            >
              {isDone && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <polyline
                    points="1.5,4 3.2,6 6.5,2"
                    stroke="rgba(10,8,2,0.9)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {isCurrent && (
                <div
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "rgba(200,168,107,0.9)",
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span
              style={{
                marginTop: "5px",
                fontFamily: "var(--font-cass)",
                fontSize: "9px",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: isDone
                  ? "rgba(200,168,107,0.5)"
                  : isCurrent
                  ? "rgba(200,168,107,0.85)"
                  : "rgba(255,255,255,0.18)",
                textAlign: "center",
                whiteSpace: "nowrap",
                transition: "color 0.35s ease",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
