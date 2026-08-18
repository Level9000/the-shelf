// A hand-torn strip of tape. Same clip-path convention already used for the
// chapter pull-quote and project masthead: pixel notches at the corners and
// edges, so the tear reads as a tear rather than as a wobbly border.
//
// The notch size is per-size rather than a single constant. A 3px bite out of
// a 10px label is a visible tear; the same 3px out of a 32px section heading
// is a rounding error, and the tape goes back to looking like a plain
// rectangle. The notch grows with the type so the torn edge stays legible.
type TapeSize = "xs" | "sm" | "md" | "lg" | "xl";

function tornEdge(n: number) {
  const m = n - 1;
  return `polygon(${n}px 0%, calc(100% - ${m}px) 0%, 100% 22%, calc(100% - ${n}px) 55%, 100% 78%, calc(100% - ${m}px) 100%, ${n}px 100%, 0% 72%, ${m}px 48%, 0% 22%)`;
}

// Torn on the right only, with the left edge left dead straight — for a strip
// that runs off the side of the page rather than sitting inside it. A tear on
// that edge would read as a tear floating in space, since the edge it would be
// tearing away from is off screen; flat reads as tape that continues past the
// frame. Same right-hand notches as `tornEdge`, so the two match where it shows.
function tornRightEdge(n: number) {
  const m = n - 1;
  return `polygon(0% 0%, calc(100% - ${m}px) 0%, 100% 22%, calc(100% - ${n}px) 55%, 100% 78%, calc(100% - ${m}px) 100%, 0% 100%)`;
}

// The small sizes keep their hand-set px padding, unchanged. lg and xl use em
// padding instead, because their font size is fluid: the strip has to keep its
// proportions while the type moves between the clamp's two ends.
//
// xl is tuned against the section headings it sits above, which run 28px on a
// phone and 36px from sm up. It lands around 85% of that at both ends, which
// is the "nearly the same size" the label is meant to read as.
const SIZE_STYLES: Record<
  TapeSize,
  { fontSize: string; padding: string; notch: number; shadow: string }
> = {
  xs: { fontSize: "10px", padding: "3px 12px 4px", notch: 3, shadow: "2px 2px 5px rgba(0,0,0,0.3)" },
  sm: { fontSize: "12px", padding: "4px 14px 5px", notch: 3, shadow: "2px 2px 5px rgba(0,0,0,0.3)" },
  md: { fontSize: "15px", padding: "5px 18px 7px", notch: 4, shadow: "2px 2px 5px rgba(0,0,0,0.3)" },
  lg: {
    fontSize: "clamp(18px, 3vw, 24px)",
    padding: "0.30em 0.60em 0.42em",
    notch: 5,
    shadow: "3px 3px 7px rgba(0,0,0,0.28)",
  },
  xl: {
    fontSize: "clamp(24px, 3.8vw, 32px)",
    padding: "0.30em 0.60em 0.42em",
    notch: 6,
    shadow: "3px 4px 9px rgba(0,0,0,0.26)",
  },
};

export function TornTape({
  children,
  background = "#f5c84a",
  color = "#1a0e00",
  rotate = -1.5,
  size = "xs",
  className,
  /// Leave the left edge straight and tear only the right. For a strip anchored
  /// flush to the left edge of the page, where the tape reads as running off the
  /// side rather than as a torn-off piece sitting in the margin.
  flatLeft = false,
  /// Overrides for the two things this component sets inline, and therefore the
  /// two a caller cannot reach with a class. Both default to the tape's own
  /// look, so every existing strip is untouched.
  ///
  /// `size` still carries the padding and the notch when these are passed, so
  /// pair a large `fontSize` with `lg` or `xl` — those two use em padding, which
  /// keeps the strip in proportion to whatever type is set on it, where the
  /// smaller sizes' hand-set px padding would not.
  fontFamily,
  fontSize,
}: {
  children: React.ReactNode;
  background?: string;
  color?: string;
  rotate?: number;
  size?: TapeSize;
  className?: string;
  flatLeft?: boolean;
  fontFamily?: string;
  fontSize?: string;
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
        fontFamily: fontFamily ?? "var(--font-cass)",
        letterSpacing: "0.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        clipPath: flatLeft ? tornRightEdge(s.notch) : tornEdge(s.notch),
        boxShadow: s.shadow,
        fontSize: fontSize ?? s.fontSize,
        padding: s.padding,
      }}
    >
      {children}
    </span>
  );
}
