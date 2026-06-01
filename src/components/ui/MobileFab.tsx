"use client";

/**
 * MobileFab — shown on touch/small screens in place of the animated avatar FABs.
 * A simple filled circle with a + icon, fixed bottom-right.
 */
export function MobileFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open assistant"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 40,
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: "var(--ink)",
        border: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)";
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <svg
        width="22" height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <line x1="11" y1="4" x2="11" y2="18" stroke="var(--app-bg)" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="4"  y1="11" x2="18" y2="11" stroke="var(--app-bg)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
