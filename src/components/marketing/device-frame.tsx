/// The hand-built handset. Two users: the intro film in the hero, and the two
/// phones standing on the table in the payoff shot.
///
/// Hand-drawn rather than a device mockup PNG, because everything it wraps is a
/// raw screen recording at the exact screen resolution — there is no hardware
/// in any of the source footage, so the hardware has to be drawn around it.

/// One of the four side rails. Drawn as a sliver protruding from the band
/// rather than an outline, which is all that reads at this size.
function SideButton({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-[2px] rounded-[1px] ${className}`}
      style={{
        background: "linear-gradient(180deg, #4a4a4d, #6a6a6f, #3d3d40)",
      }}
    />
  );
}

/// The default island: a resting Dynamic Island, centred, at the proportions a
/// real one has. Overridable because footage recorded *while the screen was
/// being recorded* has the expanded island burned into it, and the drawn one
/// then has to match the burned-in shape instead of the resting one.
const RESTING_ISLAND = "left-1/2 top-[1.6%] h-[4.2%] w-[31%] -translate-x-1/2";

/// A phone-shaped hole with `children` in it.
///
/// Sizing is the caller's: this fills whatever box it's given, and the screen's
/// 9:19.5 aspect ratio sets the height. So a caller only ever sets a width —
/// as a max-width in a flow layout, or as a percentage of the stage for the
/// absolutely-positioned phones on the table.
export function DeviceFrame({
  children,
  className,
  islandClassName = RESTING_ISLAND,
  /// The shadow the device casts. The default is a card-on-a-page shadow, which
  /// is right for the film sitting in the hero's flow; a phone standing on a
  /// table needs a shorter, harder one directly under it instead.
  boxShadow = "0 26px 60px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.28)",
}: {
  children: React.ReactNode;
  className?: string;
  islandClassName?: string;
  boxShadow?: string;
}) {
  return (
    // Corner radii are elliptical (x / y) rather than a single percentage: a
    // percentage radius resolves against each axis separately, so on a shape
    // this tall one number would give badly stretched corners. The pair keeps
    // them close to round.
    <div
      className={`relative p-[2.7%] ${className ?? ""}`}
      style={{
        borderRadius: "15.8% / 7.5%",
        // Titanium band: the light catches the two long edges and falls off
        // through the middle, which is what reads as a rounded metal rail.
        background:
          "linear-gradient(145deg, #3a3a3c 0%, #5c5c60 16%, #2c2c2e 48%, #56565b 84%, #333336 100%)",
        boxShadow,
      }}
    >
      <SideButton className="left-[-2px] top-[17%] h-[5%]" />
      <SideButton className="left-[-2px] top-[26%] h-[8.5%]" />
      <SideButton className="left-[-2px] top-[37%] h-[8.5%]" />
      <SideButton className="right-[-2px] top-[28%] h-[12%]" />

      <div
        className="relative overflow-hidden bg-black"
        style={{
          borderRadius: "14.4% / 6.7%",
          // Reserved up front, so nothing below shifts when the metadata lands.
          aspectRatio: "9 / 19.5",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6)",
        }}
      >
        {children}

        {/* Dynamic island, over everything in the screen so it stays put.
            When it is masking something in the picture — see the payoff shot —
            "over" has to hold on iOS too, where a playsInline <video> gets its
            own compositing layer and can paint through an overlay above it. The
            z-index states the order and will-change puts this on a layer of its
            own so the order is honoured. `will-change` rather than a
            translateZ(0): an inline transform here would silently override the
            -translate-x-1/2 that the centred default positions itself with. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute z-10 rounded-full bg-black ${islandClassName}`}
          style={{ willChange: "transform" }}
        />
      </div>
    </div>
  );
}
