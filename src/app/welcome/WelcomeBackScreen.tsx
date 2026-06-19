"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CassRecorder } from "@/components/cass/CassRecorder";

type Phase = "entering" | "visible" | "exiting";

export function WelcomeBackScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("entering");

  useEffect(() => {
    // Fade in → hold for 2.5s → fade out → redirect
    const show = setTimeout(() => setPhase("visible"), 50); // tiny delay lets the browser paint first
    const hide = setTimeout(() => setPhase("exiting"), 50 + 2500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  useEffect(() => {
    if (phase !== "exiting") return;
    const t = setTimeout(() => router.replace("/projects"), 700);
    return () => clearTimeout(t);
  }, [phase, router]);

  const opacity =
    phase === "entering" ? 0 :
    phase === "visible"  ? 1 :
    0;

  const transition =
    phase === "visible"  ? "opacity 0.55s ease" :
    phase === "exiting"  ? "opacity 0.6s ease"  :
    "none";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0a0a0a",
      backgroundImage: "radial-gradient(ellipse at 30% 60%, rgba(200,168,107,0.06) 0%, transparent 55%), radial-gradient(ellipse at 75% 25%, rgba(42,107,58,0.05) 0%, transparent 50%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity,
      transition,
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "32px", padding: "0 32px", maxWidth: "400px", width: "100%",
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
  );
}
