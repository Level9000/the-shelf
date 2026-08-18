"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/site";

/// Paper, on both bands. The notice opens over the dark hero and over the light
/// FAQ, and it is the same card either way, so its colours are literals for the
/// same reason the download pill's are — see download-pill.tsx.
const CREAM = "#f0ebe0";
const INK = "#1a0e00";
const MUTED = "rgba(26,14,0,0.62)";

/// Good enough to catch a typo, deliberately not more. Anything stricter starts
/// rejecting addresses that genuinely deliver, and the cost of a bad row here is
/// one email that bounces.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type State = "idle" | "sending" | "done" | "error";

/// What the download pill opens while the app is still in review.
///
/// The app cannot be downloaded yet, so the pill promising a download had
/// nowhere to send anyone — it pointed at "#". Rather than disable it, which
/// answers nothing, it says where the app actually is and offers to write when
/// that changes.
///
/// Portalled to the body. A fixed-position element is positioned against the
/// nearest *transformed* ancestor rather than the viewport, and one of the three
/// pills lives in the phone app bar, which is translated off-screen when hidden.
/// Rendered in place, this notice would inherit that and open somewhere above
/// the top of the screen.
export function LaunchNotice({
  open,
  onClose,
  /// Which pill opened it, recorded with the address.
  source,
}: {
  open: boolean;
  onClose: () => void;
  source: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement;
    // The address is the only thing being asked for, so the caret starts there.
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Hold the page still underneath. Saved and restored rather than cleared,
    // so this can't quietly undo an overflow the page set for itself.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!LOOKS_LIKE_EMAIL.test(address)) {
      setState("error");
      return;
    }

    setState("sending");
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase is not configured.");

      const supabase = createClient(url, key);
      // A plain insert, and no `.select()`: the table grants the anon key INSERT
      // and nothing else, so asking for the row back would fail on the read half.
      //
      // Not an upsert, which is the obvious way to write "add unless already
      // there" and does not work here. PostgREST's on-conflict path needs more
      // than this policy grants even with `ignoreDuplicates`, and the request
      // comes back 42501, new row violates row-level security — while the very
      // same row inserts fine plainly. Widening the policy to suit it would mean
      // granting UPDATE to anon, which would let anyone with the public key
      // rewrite addresses already on the list. Not worth it for a dedupe that
      // the unique constraint is already doing.
      const { error } = await supabase
        .from("launch_notifications")
        .insert({ email: address, source });

      // 23505 is that unique constraint rejecting a second sign-up. From where
      // the reader is sitting that is not a failure: they asked to be told, and
      // they will be told. Saying so also avoids confirming to a stranger
      // whether a given address is on the list.
      if (error && error.code !== "23505") throw error;
      setState("done");
    } catch (cause) {
      // Kept deliberately. A signup that fails is otherwise invisible from the
      // outside — the reader sees "that didn't go through" and we see nothing,
      // and the one real failure so far said only that in the UI while the
      // console carried the whole answer (42501, the policy refusing an upsert).
      console.error("[launch-notice] signup failed", cause);
      setState("error");
    }
  }

  // Portals need a document, which the server render hasn't got. No mount flag
  // is needed to stay clear of it: `open` is false on the server *and* on the
  // client's first render, so both agree on null and there is nothing for
  // hydration to mismatch. By the time this is open, a click has happened and
  // the document is long since real.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: "rgba(13,13,13,0.62)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-notice-title"
        // The backdrop closes on click; the card is not the backdrop.
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[26rem] rounded-2xl p-7 text-left"
        style={{
          background: CREAM,
          color: INK,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          border: "1px solid rgba(200,168,107,0.45)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-100"
          style={{ color: INK, opacity: 0.55 }}
        >
          <X size={18} />
        </button>

        <h2
          id="launch-notice-title"
          className="font-literata pr-8 text-[22px] font-bold leading-[1.2]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {state === "done" ? "You’re on the list." : "Add to wait list"}
        </h2>

        <p
          className="font-story mt-3 text-[15px]"
          style={{ lineHeight: 1.6, color: MUTED }}
        >
          {state === "done"
            ? "Thank you for supporting Authored By. We’ll email you the day it goes live."
            : "Authored By is pending App Store approval. Share your email with us to be notified as soon as it’s live."}
        </p>

        {state !== "done" && (
          <form onSubmit={submit} className="mt-6">
            <label htmlFor="launch-notice-email" className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id="launch-notice-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (state === "error") setState("idle");
              }}
              placeholder="you@example.com"
              className="font-story w-full rounded-full px-5 py-3 text-[15px] outline-none"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(200,168,107,0.55)",
                color: INK,
              }}
            />

            {state === "error" && (
              <p
                className="font-story mt-3 text-[13px]"
                style={{ color: "#9f3f38", lineHeight: 1.5 }}
              >
                That didn’t go through. Check the address and try again, or email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="underline underline-offset-4"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="font-literata mt-4 inline-flex w-full cursor-pointer items-center justify-center rounded-full px-[22px] py-3 text-[14px] font-semibold transition-opacity disabled:opacity-60"
              style={{
                background: INK,
                color: CREAM,
              }}
            >
              {state === "sending" ? "Adding you…" : "Tell me when it’s live"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
