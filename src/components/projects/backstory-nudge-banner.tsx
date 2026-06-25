"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithChapters } from "@/types";
import { checkBackstoryNudgeAction } from "@/lib/actions/backstory-nudge-actions";
import { CassFoundationDrawer } from "@/components/projects/story-foundation";
import { CassRecorder } from "@/components/cass/CassRecorder";

// CassRecorder's "sm" footprint before any scaling — used to compute a scale
// factor that keeps the rotated cassette's bounding height within the card's.
const CASS_SM_WIDTH = 120;
const CASS_SM_HEIGHT = 156;
const PEEK_ROTATION_DEG = 30;

export function BackstoryNudgeBanner({
  project,
  isDark,
}: {
  project: ProjectWithChapters;
  isDark: boolean;
}) {
  const router = useRouter();
  const [gap, setGap] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cassScale, setCassScale] = useState(0.45);
  const checkedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkBackstoryNudgeAction(project.id)
      .then((res) => setGap(res.gap))
      .catch(() => undefined);
  }, [project.id]);

  // Keep Cass's rotated bounding height within the card's actual rendered height.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const rad = (PEEK_ROTATION_DEG * Math.PI) / 180;
    const unrotatedBoundingHeight =
      CASS_SM_WIDTH * Math.sin(rad) + CASS_SM_HEIGHT * Math.cos(rad);

    const observer = new ResizeObserver((entries) => {
      const cardHeight = entries[0]?.contentRect.height;
      if (!cardHeight) return;
      setCassScale(Math.min(0.85, (cardHeight * 0.96) / unrotatedBoundingHeight));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [gap]);

  if (!gap || dismissed) return null;

  const textColor = isDark ? "rgba(212,206,196,0.75)" : "rgba(22,19,15,0.7)";
  const linkColor = isDark ? "#e8c789" : "#8a6d2f";

  return (
    <div style={{ position: "relative", marginBottom: "20px" }}>
      {/* Cass — sits behind the opaque card (lower z-index), fully hidden until it slides
          out from under the card's left edge. No fade — pure slide, true occlusion. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "80px",
          zIndex: 1,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          overflow: "visible",
          animation: "backstoryNudgeCassPeek 8s ease-in-out infinite",
        }}
      >
        <div style={{ transform: `rotate(-${PEEK_ROTATION_DEG}deg) scale(${cassScale})` }}>
          <CassRecorder animState="idle" size="sm" />
        </div>
      </div>

      <div ref={cardRef} style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: isDark ? "#181818" : "#faf9f4",
        border: "1px solid rgba(200,168,107,0.18)",
        borderRadius: "10px",
        padding: "12px 14px",
      }}>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            flex: 1,
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "13px",
            lineHeight: 1.55,
            color: textColor,
          }}
        >
          {gap}{" "}
          <span style={{ color: linkColor, textDecoration: "underline" }}>
            Tell Cass about it
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(200,168,107,0.35)",
            fontSize: "14px",
            lineHeight: 1,
            padding: "2px",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.65)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.35)"; }}
        >
          ✕
        </button>
      </div>

      <CassFoundationDrawer
        open={drawerOpen}
        project={project}
        gapHint={gap}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDismissed(true);
          router.refresh();
        }}
      />

      <style>{`
        @keyframes backstoryNudgeCassPeek {
          0%   { transform: translateX(0); }
          4%   { transform: translateX(-92px); }
          45%  { transform: translateX(-92px); }
          50%  { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
