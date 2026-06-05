"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function DevLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect in production — can't use Next.js `redirect()` in a client component,
  // so we handle it via useEffect.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      router.replace("/login");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/projects");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Literata', Georgia, serif",
        color: "#d4cec4",
        gap: "28px",
      }}
    >
      {/* Dev badge */}
      <div
        style={{
          background: "rgba(255,59,48,0.1)",
          border: "1px solid rgba(255,59,48,0.3)",
          borderRadius: "6px",
          padding: "4px 12px",
          fontFamily: "var(--font-cass)",
          fontSize: "10px",
          letterSpacing: "2px",
          color: "#ff6b6b",
          textTransform: "uppercase",
        }}
      >
        Development only — never visible in production
      </div>

      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#c8a86b", marginBottom: "6px" }}>
          Dev Login
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(212,206,196,0.45)", margin: 0 }}>
          Sign in with your Supabase credentials. No OAuth required.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "380px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "rgba(200,168,107,0.6)", textTransform: "uppercase", fontFamily: "var(--font-cass)" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@example.com"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(200,168,107,0.2)",
              borderRadius: "8px",
              padding: "11px 14px",
              fontSize: "14px",
              color: "#d4cec4",
              outline: "none",
              fontFamily: "'Literata', Georgia, serif",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "rgba(200,168,107,0.6)", textTransform: "uppercase", fontFamily: "var(--font-cass)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(200,168,107,0.2)",
              borderRadius: "8px",
              padding: "11px 14px",
              fontSize: "14px",
              color: "#d4cec4",
              outline: "none",
              fontFamily: "'Literata', Georgia, serif",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <p style={{ fontSize: "13px", color: "#ff6b6b", margin: 0, textAlign: "center" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "4px",
            background: loading ? "rgba(200,168,107,0.4)" : "#c8a86b",
            color: "#1a0e00",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "15px",
            fontWeight: 600,
            padding: "12px 28px",
            borderRadius: "10px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            width: "100%",
          }}
        >
          {loading ? "Signing in…" : "Sign in →"}
        </button>
      </form>
    </div>
  );
}
