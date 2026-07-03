/**
 * Press Template Registry
 *
 * Each template defines:
 *  - metadata (id, label, format, description)
 *  - structure (slides for .pptx, sections for .docx)
 *  - the Press prompt fields it expects from the gap analysis
 *
 * TODO (owner task): Customize the visual design for each template —
 * colors, fonts, logo placement, slide layouts. The structure and content
 * logic is owned by code; the design is owned by you.
 */

export type TemplateFormat = "pptx" | "docx";

export type SlideSpec = {
  id: string;
  title: string;
  /** Placeholder description of what this slide should contain */
  placeholder: string;
  /** Field keys from PressContent that map to this slide */
  fields: string[];
};

export type SectionSpec = {
  id: string;
  heading: string;
  placeholder: string;
  fields: string[];
};

export type PressTemplate = {
  id: string;
  label: string;
  format: TemplateFormat;
  description: string;
  /** What Press asks the author to fill in */
  requiredFields: string[];
  slides?: SlideSpec[];   // pptx only
  sections?: SectionSpec[]; // docx only
};

// ── Template definitions ──────────────────────────────────────────────────────

export const PRESS_TEMPLATES: PressTemplate[] = [
  // ── 1. Investor Pitch Deck ──────────────────────────────────────────────────
  {
    id: "investor-pitch",
    label: "Investor Pitch Deck",
    format: "pptx",
    description: "A 10-slide investor deck. Problem → Solution → Traction → Team → Ask.",
    requiredFields: [
      "project_name",
      "north_star",
      "problem_statement",
      "solution_summary",
      "traction_highlights",
      "market_opportunity",
      "business_model",
      "team_description",
      "ask_amount",
      "use_of_funds",
    ],
    slides: [
      { id: "cover",    title: "Cover",              placeholder: "Project name, tagline, author name, date",                             fields: ["project_name", "north_star"] },
      { id: "problem",  title: "The Problem",        placeholder: "One clear problem statement. Who feels it. How painful.",               fields: ["problem_statement"] },
      { id: "solution", title: "Our Solution",       placeholder: "What you've built. Why it works. The insight behind it.",              fields: ["solution_summary", "north_star"] },
      { id: "traction", title: "Traction",           placeholder: "Key milestones, metrics, or proof points from completed chapters.",    fields: ["traction_highlights"] },
      { id: "market",   title: "Market Opportunity", placeholder: "Market size, who you're targeting, and why now.",                     fields: ["market_opportunity"] },
      { id: "model",    title: "Business Model",     placeholder: "How you make money. Pricing, channels, unit economics.",               fields: ["business_model"] },
      { id: "roadmap",  title: "What's Next",        placeholder: "Upcoming chapters — what the next 2–3 bets are.",                     fields: ["upcoming_chapters"] },
      { id: "team",     title: "Team",               placeholder: "Who's building this. Relevant experience and why you.",               fields: ["team_description"] },
      { id: "ask",      title: "The Ask",            placeholder: "How much you're raising, at what terms, from whom.",                  fields: ["ask_amount"] },
      { id: "use",      title: "Use of Funds",       placeholder: "Where the money goes. Milestones it unlocks.",                        fields: ["use_of_funds"] },
    ],
  },

  // ── 2. Demo Day Deck ────────────────────────────────────────────────────────
  {
    id: "demo-day",
    label: "Demo Day Deck",
    format: "pptx",
    description: "A punchy 6-slide demo day deck. Built for 3-minute pitches.",
    requiredFields: [
      "project_name",
      "north_star",
      "problem_statement",
      "solution_summary",
      "traction_highlights",
      "ask_amount",
    ],
    slides: [
      { id: "hook",     title: "The Hook",    placeholder: "One sentence that makes the room lean in. What you do and for whom.",       fields: ["project_name", "north_star"] },
      { id: "problem",  title: "Problem",     placeholder: "The pain in one slide. Real, specific, felt.",                             fields: ["problem_statement"] },
      { id: "solution", title: "Solution",    placeholder: "Your solution. What makes it different. Why now.",                         fields: ["solution_summary"] },
      { id: "proof",    title: "Proof",       placeholder: "Your best numbers. Users, revenue, retention, or a killer testimonial.",   fields: ["traction_highlights"] },
      { id: "team",     title: "Team",        placeholder: "Two lines max. Why you are the ones to build this.",                       fields: ["team_description"] },
      { id: "ask",      title: "The Ask",     placeholder: "Amount, use, contact. Simple.",                                            fields: ["ask_amount"] },
    ],
  },

  // ── 3. Author Memo ─────────────────────────────────────────────────────────
  {
    id: "author-memo",
    label: "Author Memo",
    format: "docx",
    description: "A narrative memo for your team or board. Story-led, 2–4 pages.",
    requiredFields: [
      "project_name",
      "period_covered",
      "north_star",
      "chapter_stories",
      "key_decisions",
      "what_changed",
      "next_chapter_thesis",
    ],
    sections: [
      { id: "header",    heading: "Memo Header",         placeholder: "To, From, Date, Subject — formal memo header block",                  fields: ["project_name", "period_covered"] },
      { id: "opening",   heading: "Where We Are",        placeholder: "One paragraph: the state of the project right now, written honestly.", fields: ["north_star", "what_changed"] },
      { id: "story",     heading: "The Story So Far",    placeholder: "Narrative recap of completed chapters. What happened, what mattered.", fields: ["chapter_stories"] },
      { id: "decisions", heading: "Key Decisions Made",  placeholder: "The 2–3 decisions that shaped the period. Why you made them.",         fields: ["key_decisions"] },
      { id: "next",      heading: "What's Next",         placeholder: "The thesis for the next chapter. What you're betting on and why.",     fields: ["next_chapter_thesis"] },
    ],
  },

  // ── 4. Case Study ───────────────────────────────────────────────────────────
  {
    id: "case-study",
    label: "Case Study",
    format: "docx",
    description: "A structured project or product story. Great for partners, press, or portfolio.",
    requiredFields: [
      "project_name",
      "subject",        // e.g. a customer, a product launch, a partnership
      "challenge",
      "approach",
      "outcome",
      "chapter_stories",
      "key_quote",
    ],
    sections: [
      { id: "cover",     heading: "Overview",           placeholder: "Project name, subject, one-sentence summary of outcome.",              fields: ["project_name", "subject"] },
      { id: "challenge", heading: "The Challenge",      placeholder: "What problem were you solving? Who was affected? Why did it matter?",  fields: ["challenge"] },
      { id: "approach",  heading: "The Approach",       placeholder: "How did you approach it? Key decisions, pivots, and chapter arc.",      fields: ["approach", "chapter_stories"] },
      { id: "outcome",   heading: "The Outcome",        placeholder: "What changed? Metrics, qualitative impact, what you learned.",         fields: ["outcome"] },
      { id: "quote",     heading: "In Their Words",     placeholder: "A pull-quote from the author or key stakeholder.",                   fields: ["key_quote"] },
    ],
  },

  // ── 5. Quarterly Update ─────────────────────────────────────────────────────
  {
    id: "quarterly-update",
    label: "Quarterly Update",
    format: "docx",
    description: "A quarterly narrative update for investors, advisors, or your team.",
    requiredFields: [
      "project_name",
      "quarter",
      "north_star",
      "chapter_stories",
      "wins",
      "challenges",
      "next_quarter_focus",
      "asks",
    ],
    sections: [
      { id: "header",     heading: "Q[N] Update — [Project Name]",  placeholder: "Formal header: quarter, date, from the author.",                    fields: ["project_name", "quarter"] },
      { id: "state",      heading: "State of the Project",          placeholder: "Where are we relative to the north star? Honest one-paragraph view.", fields: ["north_star"] },
      { id: "chapters",   heading: "What We Did",                   placeholder: "Narrative recap of the quarter's chapters. What shipped, what shifted.", fields: ["chapter_stories"] },
      { id: "wins",       heading: "Wins",                          placeholder: "The 3–5 things worth celebrating. Be specific.",                      fields: ["wins"] },
      { id: "challenges", heading: "Challenges",                    placeholder: "What was hard. What you learned. No spin.",                           fields: ["challenges"] },
      { id: "next",       heading: "Next Quarter",                  placeholder: "The thesis for Q[N+1]. What you're focused on and why.",              fields: ["next_quarter_focus"] },
      { id: "asks",       heading: "Where We Need Help",            placeholder: "Specific asks for investors or advisors. Be direct.",                 fields: ["asks"] },
    ],
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getTemplate(id: string): PressTemplate | undefined {
  return PRESS_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByFormat(format: TemplateFormat): PressTemplate[] {
  return PRESS_TEMPLATES.filter((t) => t.format === format);
}

/**
 * YOUR DESIGN TASK — Templates to create:
 *
 * PRESENTATIONS (.pptx) — save to public/templates/press/
 * ─────────────────────────────────────────────────────────
 * 1. press-investor-pitch.pptx
 *    10 slides. Slides: Cover, Problem, Solution, Traction, Market,
 *    Business Model, Roadmap, Team, The Ask, Use of Funds.
 *    Style: Dark background (ink/charcoal), gold (#c8a86b) accents,
 *    Special Elite or Literata headings, clean body text.
 *
 * 2. press-demo-day.pptx
 *    6 slides. Slides: Hook, Problem, Solution, Proof, Team, Ask.
 *    Style: Same dark palette but bolder — big type, minimal text per slide.
 *    Each slide should have breathing room. No bullet lists.
 *
 * DOCUMENTS (.docx) — save to public/templates/press/
 * ─────────────────────────────────────────────────────
 * 3. press-author-memo.docx
 *    4 sections: Where We Are, The Story So Far, Key Decisions, What's Next.
 *    Style: Clean serif (Literata or Georgia), memo-style header block,
 *    subtle gold rule under the header, no decorative elements.
 *
 * 4. press-case-study.docx
 *    5 sections: Overview, The Challenge, The Approach, The Outcome, In Their Words.
 *    Style: Professional but warm. Pull-quote styling for the final section.
 *    Could include a sidebar column for key metrics.
 *
 * 5. press-quarterly-update.docx
 *    7 sections: Header, State of the Project, What We Did, Wins,
 *    Challenges, Next Quarter, Where We Need Help.
 *    Style: Structured like an investor update. Clean, scannable,
 *    but written like a human — not a board report template.
 *
 * NOTES:
 * - Use placeholder text (Lorem ipsum or [FIELD_NAME]) in each slot.
 * - The generator will replace placeholder text with real story content.
 * - Keep fonts embedded or use system-safe fonts (Georgia, Arial, Times).
 * - Include your logo/wordmark placeholder on cover slides and doc headers.
 */
