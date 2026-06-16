"use client";

import { useEffect, useState } from "react";
import { CassRecorder } from "./CassRecorder";
import { CassOnboardingChat } from "./CassOnboardingChat";

type Stage = "intro" | "interview";
type AnimPhase = "entering" | "visible" | "exiting";

export function CassNewProjectPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [animPhase, setAnimPhase] = useState<AnimPhase>("entering");

  useEffect(() => {
    // Enter → hold for 2.2s → exit → hand off to interview
    const hold = setTimeout(() => setAnimPhase("exiting"), 900 + 2200);
    return () => clearTimeout(hold);
  }, []);

  useEffect(() => {
    if (animPhase !== "exiting") return;
    const t = setTimeout(() => setStage("interview"), 850);
    return () => clearTimeout(t);
  }, [animPhase]);

  if (stage === "interview") {
    return <CassOnboardingChat hasExistingProjects skipIntro />;
  }

  const cassStyle: React.CSSProperties =
    animPhase === "entering"
      ? { animation: "new-project-enter 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards" }
      : animPhase === "exiting"
      ? { animation: "new-project-exit 0.8s cubic-bezier(0.64, 0, 0.78, 0) forwards" }
      : {};

  return (
    <>
      <style>{`
        @keyframes new-project-enter {
          from { transform: translateX(110vw); }
          to   { transform: translateX(0); }
        }
        @keyframes new-project-exit {
          from { transform: translateX(0); }
          to   { transform: translateX(-110vw); }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0a0a",
        backgroundImage: "radial-gradient(ellipse at 30% 60%, rgba(200,168,107,0.06) 0%, transparent 55%), radial-gradient(ellipse at 75% 25%, rgba(42,107,58,0.05) 0%, transparent 50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: animPhase === "exiting" ? 0 : 1,
        transition: animPhase === "exiting" ? "opacity 0.55s ease 0.3s" : "none",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "32px", padding: "0 32px", maxWidth: "400px", width: "100%",
          ...cassStyle,
        }}>
          <CassRecorder animState="talking" size="lg" />

          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "22px",
            lineHeight: 1.5,
            color: "#f8f8f6",
            margin: 0,
            textAlign: "center",
            textWrap: "balance",
          }}>
            Kicking off your new project
          </p>
        </div>
      </div>
    </>
  );
}
