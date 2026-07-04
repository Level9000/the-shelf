// A hand-torn strip of tape. Same clip-path convention already used for the
// chapter pull-quote and project masthead (see project-overview-shell.tsx) —
// pixel-based notches at the corners/edges so it stays subtle at any size.
const TORN_EDGE_CLIP_PATH =
  "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

const SIZE_STYLES: Record<"xs" | "sm" | "md", { fontSize: string; padding: string }> = {
  xs: { fontSize: "10px", padding: "3px 12px 4px" },
  sm: { fontSize: "12px", padding: "4px 14px 5px" },
  md: { fontSize: "15px", padding: "5px 18px 7px" },
};

export function TornTape({
  children,
  background = "#f5c84a",
  color = "#1a0e00",
  rotate = -1.5,
  size = "xs",
  className,
}: {
  children: React.ReactNode;
  background?: string;
  color?: string;
  rotate?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const s = SIZE_STYLES[size];
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        background,
        color,
        fontFamily: "var(--font-cass)",
        letterSpacing: "0.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        clipPath: TORN_EDGE_CLIP_PATH,
        boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
        fontSize: s.fontSize,
        padding: s.padding,
      }}
    >
      {children}
    </span>
  );
}
