"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CassRecorder } from "@/components/cass/CassRecorder";

type Phase = "entering" | "visible" | "exiting";

export function WelcomeBackScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("entering");

  useEffect(() => {
    // Enter → hold for 3s → exit → redirect
    const hold = setTimeout(() => setPhase("exiting"), 900 + 3000);
    return () => clearTimeout(hold);
  }, []);

  useEffect(() => {
    if (phase !== "exiting") return;
    const t = setTimeout(() => router.replace("/projects"), 850);
    return () => clearTimeout(t);
  }, [phase, router]);

  const cassStyle: React.CSSProperties =
    phase === "entering"
      ? { animation: "welcome-enter 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards" }
      : phase === "exiting"
      ? { animation: "welcome-exit 0.8s cubic-bezier(0.64, 0, 0.78, 0) forwards" }
      : {};

  return (
    <>
      <style>{`
        @keyframes welcome-enter {
          from { transform: translateX(110vw); }
          to   { transform: translateX(0); }
        }
        @keyframes welcome-exit {
          from { transform: translateX(0); }
          to   { transform: translateX(-110vw); }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0a0a",
        backgroundImage: "radial-gradient(ellipse at 30% 60%, rgba(200,168,107,0.06) 0%, transparent 55%), radial-gradient(ellipse at 75% 25%, rgba(42,107,58,0.05) 0%, transparent 50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: phase === "exiting" ? 0 : 1,
        transition: phase === "exiting" ? "opacity 0.55s ease 0.3s" : "none",
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
            Welcome back to Authored By
          </p>
        </div>
      </div>
    </>
  );
}
