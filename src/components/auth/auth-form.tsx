"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signInWithGoogleAction, signInWithAppleAction } from "@/lib/actions/auth-actions";
import { StickyNoteCanvas } from "./sticky-note-canvas";
import { AvatarParade } from "./avatar-parade";

export function AuthForm({
  oauthError,
  showTerms,
}: {
  oauthError?: string;
  showTerms?: boolean;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

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
    padding: "12px 20px",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 500,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    cursor: "pointer",
    border: "none",
    transition: "opacity 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f6f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      padding: "24px 16px",
    }}>
      <StickyNoteCanvas />
      <AvatarParade />

      {/* Center card */}
      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: "400px",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: "24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        padding: "48px 40px 44px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "28px",
      }}>

        {/* Logo */}
        <Image
          src="/icons/authored_by_transparent.png"
          alt="Authored By"
          width={300}
          height={225}
          style={{ width: "100%", maxWidth: "200px", height: "auto" }}
          priority
        />

        {/* Headline + tagline */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
          <h1 style={{
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "22px",
            fontWeight: 700,
            color: "rgba(0,0,0,0.8)",
            margin: 0,
            lineHeight: 1.25,
          }}>
            Founder's stories<br />live here.
          </h1>
          <p style={{
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "14px",
            lineHeight: 1.65,
            color: "rgba(0,0,0,0.42)",
            margin: 0,
          }}>
            Capturing every decision, pivot, and moment that matters while you build.
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: "1px", background: "rgba(0,0,0,0.07)" }} />

        {/* Sign in label */}
        <p style={{
          margin: "-12px 0 -8px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.35)",
          textAlign: "center",
        }}>
          Sign in with
        </p>

        {/* OAuth buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
          {oauthError && (
            <p style={{
              borderRadius: "12px",
              background: "#fff1f1",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#c0392b",
              margin: 0,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}>
              {oauthError}
            </p>
          )}


          <form action={signInWithGoogleAction} onSubmit={requireTerms} style={{ width: "100%" }}>
            <button
              type="submit"
              style={{
                ...btnBase,
                background: "#fff",
                color: "rgba(0,0,0,0.75)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
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
              style={{
                ...btnBase,
                background: "#000",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M13.178 10.187c-.02-2.273 1.856-3.373 1.94-3.428-1.057-1.547-2.702-1.758-3.285-1.782-1.394-.142-2.727.828-3.435.828-.71 0-1.796-.808-2.955-.786C3.81 5.04 2.268 5.94 1.424 7.37c-1.73 2.996-.441 7.433 1.237 9.86.823 1.19 1.8 2.524 3.08 2.476 1.24-.05 1.709-.8 3.21-.8 1.498 0 1.928.8 3.236.773 1.333-.022 2.177-1.208 2.986-2.408a11.36 11.36 0 0 0 1.354-2.778c-.031-.012-2.596-1-2.62-3.306ZM10.87 3.18C11.547 2.35 12 1.225 11.867 0c-.952.04-2.119.636-2.8 1.44-.607.712-1.146 1.867-.999 2.969 1.064.08 2.15-.54 2.803-1.228Z"/>
              </svg>
              Continue with Apple
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{
          margin: "-8px 0 0",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "11px",
          color: "rgba(0,0,0,0.3)",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          By signing in you agree to our{" "}
          <Link href="/terms" target="_blank" style={{ color: "rgba(0,0,0,0.45)", textDecoration: "underline" }}>Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" style={{ color: "rgba(0,0,0,0.45)", textDecoration: "underline" }}>Privacy Policy</Link>
        </p>

      </div>
    </div>
  );
}
