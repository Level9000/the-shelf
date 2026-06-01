/**
 * Press DOCX Generator
 *
 * Generates a .docx file from a PressContent payload + template spec.
 * Uses the `docx` npm package for in-memory generation.
 *
 * TODO (design task): Update BRAND tokens to match your visual identity.
 * Fonts, colors, header/footer branding, section styling — all live here.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  PageBreak,
  SectionType,
} from "docx";
import type { PressTemplate } from "./templates";
import type { PressContent } from "./generate-pptx";

// ── Brand tokens (placeholder — update to match Authored By design) ───────────
const BRAND_COLOR  = "C8A86B"; // gold accent
const HEADING_FONT = "Georgia"; // TODO: Literata when embedded
const BODY_FONT    = "Georgia";
const HEADING_SIZE = 28; // half-points (14pt)
const BODY_SIZE    = 22; // half-points (11pt)
const MUTED_COLOR  = "888888";

// ── Helpers ───────────────────────────────────────────────────────────────────

function docTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 240 },
    children: [
      new TextRun({
        text,
        font: HEADING_FONT,
        size: 52,  // 26pt
        bold: true,
        color: "111111",
      }),
    ],
  });
}

function docSubtitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 480 },
    children: [
      new TextRun({
        text,
        font: BODY_FONT,
        size: BODY_SIZE + 2,
        color: BRAND_COLOR,
        italics: true,
      }),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_COLOR, space: 4 },
    },
    children: [
      new TextRun({
        text,
        font: HEADING_FONT,
        size: HEADING_SIZE,
        bold: true,
        color: "111111",
      }),
    ],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [
      new TextRun({
        text: text || "(content placeholder)",
        font: BODY_FONT,
        size: BODY_SIZE,
        color: "222222",
      }),
    ],
  });
}

function placeholderNote(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 160 },
    children: [
      new TextRun({
        text: `[Press placeholder: ${text}]`,
        font: BODY_FONT,
        size: BODY_SIZE - 2,
        color: MUTED_COLOR,
        italics: true,
      }),
    ],
  });
}

function memoHeader(projectName: string, extra: string): Paragraph[] {
  const lines = [
    `To: Team / Board`,
    `From: ${projectName}`,
    `Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    extra ? `Re: ${extra}` : "",
  ].filter(Boolean);

  return lines.map((line) =>
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: line, font: BODY_FONT, size: BODY_SIZE, bold: line.startsWith("Re:") }),
      ],
    }),
  );
}

function resolveBody(fields: string[], content: PressContent, placeholder: string): string {
  const parts = fields.map((f) => {
    const val = content[f];
    if (!val) return null;
    return Array.isArray(val) ? val.join("\n") : val;
  }).filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : "";
}

// ── Generator ─────────────────────────────────────────────────────────────────

export async function generateDocx(
  template: PressTemplate,
  content: PressContent,
): Promise<Buffer> {
  if (template.format !== "docx" || !template.sections) {
    throw new Error(`Template "${template.id}" is not a DOCX template.`);
  }

  const projectName = String(content.project_name ?? "Project");
  const children: Paragraph[] = [];

  // Cover block
  children.push(docTitle(projectName));
  if (content.north_star) {
    children.push(docSubtitle(String(content.north_star)));
  }

  // Memo-style header for founder-memo and quarterly-update
  if (template.id === "founder-memo" || template.id === "quarterly-update") {
    const period = String(content.period_covered ?? content.quarter ?? "");
    children.push(...memoHeader(projectName, period));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Sections
  for (const spec of template.sections) {
    children.push(sectionHeading(spec.heading));

    const body = resolveBody(spec.fields, content, spec.placeholder);
    if (body) {
      // Split on double newlines → separate paragraphs
      const paras = body.split(/\n\n+/);
      for (const p of paras) {
        children.push(bodyParagraph(p.trim()));
      }
    } else {
      children.push(placeholderNote(spec.placeholder));
    }
  }

  const doc = new Document({
    creator: "Authored By — Press",
    title: `${template.label} — ${projectName}`,
    description: template.description,
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1-inch margins
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
