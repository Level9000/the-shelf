"use client";

/**
 * Thin progress bar for Cass dark-themed chat panels.
 * Sits at the top of each Cass drawer / full-screen chat,
 * above the recorder avatar, giving users a sense of
 * how far through the conversation they are.
 */
export function CassProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      style={{
        width: "100%",
        height: "3px",
        background: "rgba(200,168,107,0.12)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${clamped}%`,
          background: "linear-gradient(90deg, rgba(200,168,107,0.55) 0%, #c8a86b 100%)",
          transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
