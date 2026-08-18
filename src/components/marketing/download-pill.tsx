"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { APP_IS_LIVE } from "@/lib/site";
import { LaunchNotice } from "./launch-notice";

/// The page's call to action, in two sizes.
///
/// One component because there are two of it — the hero and the closing ask show
/// the full-size pill, the phone app bar shows the small one — and they were
/// separate copies of the same seven values until a restyle had to be made twice.
///
/// This is lib/widgets/ui/gold_pill_button.dart as it renders on the app's paper
/// theme, which is the look it was asked to have: 22/12 padding, a 999 radius, the
/// gold border at 55%, the 18px gold glow at 12%, Literata 14/600, and the app's
/// ink-on-gold label. Every one of those numbers is the widget's.
///
/// The fill is the one thing added. The Flutter pill has no fill — it is
/// transparent, and reads as cream because the app's page behind it is cream.
/// Two of the three pills here sit on `.on-dark` bands, where transparent means
/// black, which is how this ended up gold-on-black and looking borrowed from
/// somewhere else. Painting the cream in makes the paper look travel.
///
/// So `CREAM` is a literal on purpose: `--story-bg` is exactly this on paper but
/// #1a1814 inside `.on-dark`, and the token would paint a dark pill in the two
/// places the pill matters most. Same reasoning as intro-film's "Play with sound".
/// The ink needs no literal — `--ink-on-gold` is #1a0e00 in both palettes, which
/// is the point of it.
const CREAM = "#f0ebe0";
const INK = "var(--ink-on-gold)";

export function DownloadPill({
  href,
  /// `sm` is the app bar's. Its label is shorter for the reason it always was:
  /// the full one is ~150px wide and would leave a 375px bar no room for the
  /// wordmark beside it.
  size = "md",
  /// Which pill this is, recorded against any address left in the launch
  /// notice. Answers "where did people actually ask from".
  source,
}: {
  href: string;
  size?: "sm" | "md";
  source: string;
}) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const small = size === "sm";

  const shape = `font-literata inline-flex flex-none cursor-pointer items-center justify-center rounded-full font-semibold transition-colors hover:bg-[#e5ddca] ${
    small ? "gap-1.5 px-4 py-2 text-[13px]" : "gap-2 px-[22px] py-3 text-[14px]"
  }`;
  const paint = {
    background: CREAM,
    border: "1px solid rgba(200,168,107,0.55)",
    color: INK,
    boxShadow: small
      ? "0 0 14px rgba(200,168,107,0.10)"
      : "0 0 18px rgba(200,168,107,0.12)",
  };
  const face = (
    <>
      <Download size={small ? 14 : 16} aria-hidden />
      {small ? "Get started" : "Get started for free"}
    </>
  );

  // Until the app clears review there is nowhere to send anyone, so the pill
  // stops being a link and becomes a button that says so. A <button> rather
  // than an <a href="#">: it does not navigate, and the element should say
  // which of those it is.
  if (!APP_IS_LIVE) {
    return (
      <>
        <button type="button" onClick={() => setNoticeOpen(true)} className={shape} style={paint}>
          {face}
        </button>
        <LaunchNotice
          open={noticeOpen}
          onClose={() => setNoticeOpen(false)}
          source={source}
        />
      </>
    );
  }

  return (
    <a href={href} className={shape} style={paint}>
      {face}
    </a>
  );
}
