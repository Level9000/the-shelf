"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signInWithGoogleAction, signInWithAppleAction, loginAction, signupAction } from "@/lib/actions/auth-actions";

export function AuthForm({
  oauthError,
  showTerms,
}: {
  oauthError?: string;
  showTerms?: boolean;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Dev-only email login state
  const isDev = process.env.NODE_ENV === "development";
  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devError, setDevError] = useState("");
  const [devMode, setDevMode] = useState<"login" | "signup">("login");
  const [devPending, setDevPending] = useState(false);

  async function handleDevSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDevError("");
    setDevPending(true);
    const fd = new FormData();
    fd.append("email", devEmail);
    fd.append("password", devPassword);
    const action = devMode === "login" ? loginAction : signupAction;
    const result = await action({ error: undefined }, fd);
    if (result?.error) setDevError(result.error);
    setDevPending(false);
  }

  function requireTerms(e: React.FormEvent) {
    if (showTerms && !termsAccepted) {
      e.preventDefault();
      setTermsError(true);
    }
  }

  const btnBase: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 24px",
    borderRadius: "50px",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    border: "1.5px solid rgba(255, 255, 255, 0.18)",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
    transition: "background 0.15s, border-color 0.15s",
    boxShadow: "none",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0a0a",
      backgroundImage: "radial-gradient(ellipse at 30% 60%, rgba(200,168,107,0.06) 0%, transparent 55%), radial-gradient(ellipse at 75% 25%, rgba(42,107,58,0.05) 0%, transparent 50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 32px",
    }}>

      {/* Content column */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        width: "100%",
        maxWidth: "360px",
      }}>

        {/* Card — logo, tagline, and buttons together */}
        <div style={{
          width: "100%",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px",
          padding: "28px 20px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}>

        {/* Tape image */}
        <Image
          src="/icons/authored-by-tape-icon.png"
          alt="Authored By"
          width={320}
          height={120}
          style={{ width: "100%", maxWidth: "280px", height: "auto" }}
          priority
        />

        {/* Tagline */}
        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "16px",
          lineHeight: 1.6,
          color: "rgba(255, 255, 255, 0.75)",
          margin: 0,
          textAlign: "center",
          textWrap: "balance",
        }}>
          Your story is already in progress. Let&apos;s capture it together.
        </p>

        {/* Divider */}
        <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.07)" }} />

        {/* Buttons */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}>

          {oauthError && (
            <p style={{
              borderRadius: "12px",
              background: "rgba(255, 80, 60, 0.12)",
              border: "1px solid rgba(255, 80, 60, 0.3)",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#ff6b5b",
              margin: 0,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              textAlign: "center",
            }}>
              {oauthError}
            </p>
          )}

          {showTerms && termsError && (
            <p style={{
              borderRadius: "12px",
              background: "rgba(255, 80, 60, 0.1)",
              border: "1px solid rgba(255, 80, 60, 0.28)",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#ff6b5b",
              margin: 0,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              textAlign: "center",
            }}>
              Please agree to the Terms and Privacy Policy to continue.
            </p>
          )}

          <form action={signInWithGoogleAction} onSubmit={requireTerms} style={{ width: "100%" }}>
            <button
              type="submit"
              style={btnBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <form action={signInWithAppleAction} onSubmit={requireTerms} style={{ width: "100%" }}>
            <button
              type="submit"
              style={btnBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
              }}
            >
              <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M13.178 10.187c-.02-2.273 1.856-3.373 1.94-3.428-1.057-1.547-2.702-1.758-3.285-1.782-1.394-.142-2.727.828-3.435.828-.71 0-1.796-.808-2.955-.786C3.81 5.04 2.268 5.94 1.424 7.37c-1.73 2.996-.441 7.433 1.237 9.86.823 1.19 1.8 2.524 3.08 2.476 1.24-.05 1.709-.8 3.21-.8 1.498 0 1.928.8 3.236.773 1.333-.022 2.177-1.208 2.986-2.408a11.36 11.36 0 0 0 1.354-2.778c-.031-.012-2.596-1-2.62-3.306ZM10.87 3.18C11.547 2.35 12 1.225 11.867 0c-.952.04-2.119.636-2.8 1.44-.607.712-1.146 1.867-.999 2.969 1.064.08 2.15-.54 2.803-1.228Z"/>
              </svg>
              Continue with Apple
            </button>
          </form>
        </div>
        </div>{/* end card */}

        {/* Terms checkbox — signup page only */}
        {showTerms && (
          <label style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setTermsError(false);
              }}
              style={{ marginTop: "2px", accentColor: "#c8a86b", flexShrink: 0 }}
            />
            <span style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.42)",
              lineHeight: 1.5,
            }}>
              I agree to the{" "}
              <Link href="/terms" target="_blank" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "underline" }}>Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" target="_blank" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "underline" }}>Privacy Policy</Link>
            </span>
          </label>
        )}

        {/* Legal — login page */}
        {!showTerms && (
          <p style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.28)",
            textAlign: "center",
            lineHeight: 1.55,
            margin: 0,
          }}>
            By signing in you agree to our{" "}
            <Link href="/terms" target="_blank" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" target="_blank" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline" }}>Privacy Policy</Link>
          </p>
        )}

        {/* Dev-only email login */}
        {isDev && (
          <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px", marginTop: "4px" }}>
            <p style={{ fontFamily: "'Barlow Condensed', -apple-system, sans-serif", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", textAlign: "center", margin: "0 0 14px" }}>
              ⚡ Dev login
            </p>

            {/* login / signup toggle */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDevMode(m)}
                  style={{
                    flex: 1, padding: "6px", borderRadius: "8px", fontSize: "11px",
                    fontFamily: "-apple-system, sans-serif", cursor: "pointer",
                    background: devMode === m ? "rgba(255,255,255,0.1)" : "transparent",
                    border: `1px solid ${devMode === m ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                    color: devMode === m ? "#fff" : "rgba(255,255,255,0.35)",
                    transition: "all 0.15s",
                  }}
                >
                  {m === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleDevSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="email"
                placeholder="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                required
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: "14px", fontFamily: "-apple-system, sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <input
                type="password"
                placeholder="password"
                value={devPassword}
                onChange={(e) => setDevPassword(e.target.value)}
                required
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: "14px", fontFamily: "-apple-system, sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {devError && (
                <p style={{ fontSize: "12px", color: "#ff6b5b", margin: 0, fontFamily: "-apple-system, sans-serif" }}>
                  {devError}
                </p>
              )}
              <button
                type="submit"
                disabled={devPending}
                style={{
                  width: "100%", padding: "10px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", fontSize: "13px", fontFamily: "-apple-system, sans-serif",
                  cursor: devPending ? "default" : "pointer", opacity: devPending ? 0.6 : 1,
                  transition: "background 0.15s",
                }}
              >
                {devPending ? "..." : devMode === "login" ? "Sign in →" : "Create account →"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
