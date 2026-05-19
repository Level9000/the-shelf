import React from "react";

/**
 * Splits text on double-newlines and renders each paragraph as a <p> tag.
 * Single newlines within a paragraph are collapsed to a space.
 * Falls back to a single <p> when no paragraph breaks are found.
 */
export function renderParagraphs(
  text: string,
  style?: React.CSSProperties,
  paragraphGap = "1.3em",
): React.ReactNode {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return <p style={style}>{text.trim()}</p>;
  }

  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} style={i === 0 ? style : { ...style, marginTop: paragraphGap }}>
          {para}
        </p>
      ))}
    </>
  );
}
