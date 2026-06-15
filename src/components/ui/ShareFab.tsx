"use client";

/**
 * ShareFab — share circle FAB for the story tab.
 * Mirrors MobileFab's style but uses a share/upload icon, bottom-left.
 */
export function ShareFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share story"
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
      {/* Share / upload arrow icon */}
      <svg
        width="22" height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Arrow shaft */}
        <line x1="11" y1="13" x2="11" y2="3" stroke="var(--app-bg)" strokeWidth="2.2" strokeLinecap="round" />
        {/* Arrow head */}
        <polyline points="7,7 11,3 15,7" stroke="var(--app-bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Tray base */}
        <path d="M4 14 v3 a1 1 0 0 0 1 1 h12 a1 1 0 0 0 1 -1 v-3" stroke="var(--app-bg)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    </button>
  );
}
