"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS = [
  { key: "email",   label: "Email update",   sub: "Board · investors · team" },
  { key: "blog",    label: "Blog post",      sub: "Public readers & community" },
  { key: "social",  label: "Social post",    sub: "LinkedIn or X — your network" },
  { key: "podcast", label: "Podcast script", sub: "Solo-cast for listeners" },
] as const;

type FormatKey = (typeof FORMAT_OPTIONS)[number]["key"];

const REFINEMENTS: Record<
  FormatKey,
  [{ q: string; chips: string[] }, { q: string; chips: string[] }]
> = {
  email: [
    { q: "Who's on the receiving end?", chips: ["Board & investors", "My team", "Both"] },
    { q: "Anything specific you want to make sure comes through?", chips: ["The win", "What we learned", "What's coming next"] },
  ],
  blog: [
    { q: "What should readers take away from this track?", chips: ["The win", "What I learned", "The honest struggle"] },
    { q: "What tone are you going for?", chips: ["Reflective", "Energizing", "Vulnerable"] },
  ],
  social: [
    { q: "What should your network feel after reading this?", chips: ["Inspired", "In the loop", "Like they learned something"] },
    { q: "Lead with the win, the lesson, or behind-the-scenes?", chips: ["The win", "The lesson", "Behind the scenes"] },
  ],
  podcast: [
    { q: "Is this a standalone episode or part of an ongoing story?", chips: ["Standalone", "Part of a series"] },
    { q: "How personal do you want to get?", chips: ["High-level overview", "Behind the scenes", "Raw and honest"] },
  ],
};

const INTRO = "Which audience do you want to share this story with?";
const HANG_TIGHT = "Perfect. Hang tight while I write something great\u2026";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = { role: "cass" | "user"; text: string };
export type Phase = "intro" | "refine1" | "refine2" | "generating";

// ─── CassBubble ───────────────────────────────────────────────────────────────

function CassBubble({
  text,
  isLatest,
  onDone,
}: {
  text: string;
  isLatest: boolean;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState(isLatest ? "" : text);

  useEffect(() => {
    if (!isLatest) {
      setDisplayed(text);
      return;
    }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 26);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isLatest]);

  // When no longer latest, snap to full text immediately
  useEffect(() => {
    if (!isLatest) setDisplayed(text);
  }, [isLatest, text]);

  const typing = isLatest && displayed.length < text.length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "10px",
        maxWidth: "92%",
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "#c8a86b",
          flexShrink: 0,
          marginBottom: "10px",
        }}
      />
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(200,168,107,0.22)",
          borderRadius: "12px 12px 12px 2px",
          padding: "12px 16px",
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "15px",
          lineHeight: "1.65",
          color: "#d4cec4",
        }}
      >
        {displayed}
        {typing && (
          <span
            style={{
              opacity: 0.5,
              animation: "cassCaretBlink 0.9s step-end infinite",
            }}
          >
            ▌
          </span>
        )}
      </div>
    </div>
  );
}

// ─── UserBubble ───────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          background: "rgba(200,168,107,0.1)",
          border: "1px solid rgba(200,168,107,0.22)",
          borderRadius: "12px 12px 2px 12px",
          padding: "10px 16px",
          fontFamily: "var(--font-cass)",
          fontSize: "13px",
          lineHeight: "1.5",
          color: "#c8a86b",
          maxWidth: "80%",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── FormatPicker ─────────────────────────────────────────────────────────────

function FormatPicker({
  onPick,
}: {
  onPick: (key: FormatKey, label: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "4px 0 0",
      }}
    >
      {FORMAT_OPTIONS.map(({ key, label, sub }, i) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key, label)}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(200,168,107,0.18)",
            borderRadius: "12px",
            padding: "13px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "border-color 0.15s, background 0.15s",
            opacity: 0,
            animation: `cassOptionIn 0.28s ease forwards`,
            animationDelay: `${i * 110}ms`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)";
            e.currentTarget.style.background = "rgba(200,168,107,0.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
        >
          {/* Radio circle */}
          <div
            style={{
              width: "18px",
              height: "18px",
              flexShrink: 0,
              borderRadius: "50%",
              border: "1.5px solid rgba(200,168,107,0.5)",
              background: "transparent",
            }}
          />
          <div>
            <p
              style={{
                fontFamily: "var(--font-cass)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#d4cec4",
                margin: 0,
                lineHeight: "1.3",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-cass)",
                fontSize: "11px",
                color: "#555",
                margin: "3px 0 0",
                lineHeight: "1.4",
              }}
            >
              {sub}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── RadioCircle ─────────────────────────────────────────────────────────────

function RadioCircle({ filled }: { filled?: boolean }) {
  return (
    <div
      style={{
        width: "18px",
        height: "18px",
        flexShrink: 0,
        borderRadius: "50%",
        border: `1.5px solid ${filled ? "#c8a86b" : "rgba(200,168,107,0.5)"}`,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color 0.15s",
      }}
    >
      {filled && (
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#c8a86b",
          }}
        />
      )}
    </div>
  );
}

const ROW_STYLE_BASE = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(200,168,107,0.18)",
  borderRadius: "12px",
  padding: "13px 16px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  width: "100%",
  textAlign: "left" as const,
  transition: "border-color 0.15s, background 0.15s",
};

const LABEL_STYLE = {
  fontFamily: "var(--font-cass)",
  fontSize: "12px",
  fontWeight: 600,
  color: "#d4cec4",
  margin: 0,
  lineHeight: "1.3",
};

// ─── ChipRow ──────────────────────────────────────────────────────────────────

function ChipRow({
  chips,
  onPick,
}: {
  chips: readonly string[];
  onPick: (v: string) => void;
}) {
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [freeformValue, setFreeformValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function openFreeform() {
    setFreeformOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  function submitFreeform() {
    const v = freeformValue.trim();
    if (!v) return;
    onPick(v);
  }

  const freeformDelay = chips.length * 110;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
      {chips.map((chip, i) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          style={{
            ...ROW_STYLE_BASE,
            cursor: "pointer",
            opacity: 0,
            animation: "cassOptionIn 0.28s ease forwards",
            animationDelay: `${i * 110}ms`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)";
            e.currentTarget.style.background = "rgba(200,168,107,0.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
        >
          <RadioCircle />
          <p style={LABEL_STYLE}>{chip}</p>
        </button>
      ))}

      {/* 4th option — freeform */}
      {!freeformOpen ? (
        <button
          type="button"
          onClick={openFreeform}
          style={{
            ...ROW_STYLE_BASE,
            cursor: "pointer",
            opacity: 0,
            animation: "cassOptionIn 0.28s ease forwards",
            animationDelay: `${freeformDelay}ms`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.45)";
            e.currentTarget.style.background = "rgba(200,168,107,0.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,168,107,0.18)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
        >
          <RadioCircle />
          <p style={{ ...LABEL_STYLE, color: "#888" }}>Something else…</p>
        </button>
      ) : (
        <div
          style={{
            ...ROW_STYLE_BASE,
            borderColor: "rgba(200,168,107,0.4)",
            background: "rgba(200,168,107,0.04)",
          }}
        >
          <RadioCircle filled />
          <input
            ref={inputRef}
            type="text"
            value={freeformValue}
            onChange={(e) => setFreeformValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitFreeform()}
            placeholder="Type your answer…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-cass)",
              fontSize: "12px",
              color: "#d4cec4",
              lineHeight: "1.3",
            }}
          />
          <button
            type="button"
            onClick={submitFreeform}
            disabled={!freeformValue.trim()}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: freeformValue.trim() ? "rgba(200,168,107,0.2)" : "transparent",
              border: freeformValue.trim() ? "1px solid rgba(200,168,107,0.4)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: freeformValue.trim() ? "#c8a86b" : "#444",
              cursor: freeformValue.trim() ? "pointer" : "default",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <Send size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CassShareChat({
  onComplete,
  onPhaseChange,
}: {
  onComplete: (format: string) => void;
  onPhaseChange?: (phase: Phase) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "cass", text: INTRO },
  ]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedFormat, setSelectedFormat] = useState<FormatKey | null>(null);
  const [chipsReady, setChipsReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Notify parent whenever phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const latestCassIndex = messages.reduce<number>(
    (acc, msg, i) => (msg.role === "cass" ? i : acc),
    -1,
  );

  function pushCass(text: string, afterMs = 400) {
    setChipsReady(false);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "cass", text }]);
    }, afterMs);
  }

  function pushUser(text: string) {
    setMessages((prev) => [...prev, { role: "user", text }]);
  }

  function handleFormatPick(key: FormatKey, label: string) {
    setSelectedFormat(key);
    pushUser(label);
    pushCass(REFINEMENTS[key][0].q);
    setPhase("refine1");
  }

  function handleRefine1(answer: string) {
    pushUser(answer);
    pushCass(REFINEMENTS[selectedFormat!][1].q);
    setPhase("refine2");
  }

  function handleRefine2(answer: string) {
    pushUser(answer);
    pushCass(HANG_TIGHT);
    setPhase("generating");
  }

  function handleAnswer(value: string) {
    if (phase === "refine1") handleRefine1(value);
    else if (phase === "refine2") handleRefine2(value);
  }

  // When the "hang tight" typewriter finishes, fire onComplete after a pause
  function handleCassDone() {
    setChipsReady(true);
    if (phase === "generating") {
      setTimeout(() => onComplete(selectedFormat!), 900);
    }
  }

  const currentChips =
    phase === "refine1" && selectedFormat
      ? REFINEMENTS[selectedFormat][0].chips
      : phase === "refine2" && selectedFormat
        ? REFINEMENTS[selectedFormat][1].chips
        : ([] as string[]);

  const showFormatPicker = phase === "intro" && chipsReady;
  const showChips = (phase === "refine1" || phase === "refine2") && chipsReady;

  return (
    <>
      <style>{`
        @keyframes cassCaretBlink {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0; }
        }
        @keyframes cassOptionIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "8px 24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.map((msg, i) =>
          msg.role === "cass" ? (
            <CassBubble
              key={i}
              text={msg.text}
              isLatest={i === latestCassIndex}
              onDone={i === latestCassIndex ? handleCassDone : undefined}
            />
          ) : (
            <UserBubble key={i} text={msg.text} />
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, padding: "0 24px 28px" }}>
        {showFormatPicker && <FormatPicker onPick={handleFormatPick} />}

        {showChips && (
          <ChipRow chips={currentChips} onPick={handleAnswer} />
        )}

      </div>
    </>
  );
}
