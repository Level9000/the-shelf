/**
 * Press PPTX Generator
 *
 * Generates a .pptx file from a PressContent payload + template spec.
 * Uses pptxgenjs for in-memory generation — no binary template files needed yet.
 *
 * TODO (design task): Once you have designed .pptx template files,
 * replace the placeholder slide styling with your branded layouts.
 * Currently outputs a functional but plain-styled deck.
 */

import PptxGenJS from "pptxgenjs";
import type { PressTemplate } from "./templates";

export type PressContent = Record<string, string | string[]>;

// ── Authored By design tokens (placeholder — update to match your brand) ──────
const BRAND = {
  bg:         "111111",  // near-black background — TODO: replace with brand bg
  accent:     "C8A86B",  // gold
  text:       "E8E0D0",  // warm white
  muted:      "888888",
  fontTitle:  "Georgia", // TODO: embed Special Elite or Literata
  fontBody:   "Georgia",
};

function hex(h: string) { return { type: "solid", color: h } as const; }

function addCoverSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: PressContent) {
  slide.background = { color: BRAND.bg };

  // Gold rule at top
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.06, fill: hex(BRAND.accent) });

  // Project name
  slide.addText(String(content.project_name ?? "Project Name"), {
    x: 0.6, y: 1.8, w: 8.8, h: 1.0,
    fontSize: 40, bold: true, color: BRAND.text,
    fontFace: BRAND.fontTitle, align: "center",
  });

  // Tagline / north star
  slide.addText(String(content.north_star ?? "Your north star goes here"), {
    x: 0.6, y: 2.9, w: 8.8, h: 0.6,
    fontSize: 18, color: BRAND.accent,
    fontFace: BRAND.fontBody, align: "center", italic: true,
  });

  // Date placeholder
  slide.addText(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }), {
    x: 0.6, y: 4.6, w: 8.8, h: 0.4,
    fontSize: 12, color: BRAND.muted,
    fontFace: BRAND.fontBody, align: "center",
  });

  // Gold rule at bottom
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.38, w: "100%", h: 0.06, fill: hex(BRAND.accent) });
}

function addContentSlide(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  title: string,
  body: string,
) {
  slide.background = { color: BRAND.bg };

  // Gold accent bar on left
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: "100%", fill: hex(BRAND.accent) });

  // Slide title
  slide.addText(title, {
    x: 0.4, y: 0.35, w: 9.2, h: 0.65,
    fontSize: 22, bold: true, color: BRAND.accent,
    fontFace: BRAND.fontTitle,
  });

  // Divider
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.05, w: 9.2, h: 0.02,
    fill: { type: "solid", color: "333333" },
  });

  // Body content
  slide.addText(body || "(content goes here)", {
    x: 0.4, y: 1.25, w: 9.2, h: 4.0,
    fontSize: 16, color: BRAND.text,
    fontFace: BRAND.fontBody,
    valign: "top", wrap: true, breakLine: true,
  });
}

function resolveSlideBody(fields: string[], content: PressContent, placeholder: string): string {
  const parts = fields.map((f) => {
    const val = content[f];
    if (!val) return null;
    if (Array.isArray(val)) return val.join("\n• ");
    return val;
  }).filter(Boolean);

  return parts.length > 0 ? parts.join("\n\n") : placeholder;
}

export async function generatePptx(
  template: PressTemplate,
  content: PressContent,
): Promise<Buffer> {
  if (template.format !== "pptx" || !template.slides) {
    throw new Error(`Template "${template.id}" is not a PPTX template.`);
  }

  const pptx = new PptxGenJS();
  pptx.layout  = "LAYOUT_WIDE"; // 13.33 × 7.5 inches
  pptx.author  = "Authored By — Press";
  pptx.company = "Authored By";
  pptx.subject = template.label;
  pptx.title   = String(content.project_name ?? template.label);

  for (const spec of template.slides) {
    const slide = pptx.addSlide();

    if (spec.id === "cover") {
      addCoverSlide(pptx, slide, content);
    } else {
      const body = resolveSlideBody(spec.fields, content, spec.placeholder);
      addContentSlide(pptx, slide, spec.title, body);
    }
  }

  // pptxgenjs writeFile returns a base64 string when passed "base64"
  const base64 = await pptx.write({ outputType: "base64" }) as string;
  return Buffer.from(base64, "base64");
}
