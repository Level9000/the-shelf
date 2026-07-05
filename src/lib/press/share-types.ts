/**
 * Share flow data model — Authored By.
 *
 * Audience (who's reading) and format (structural constraints) are kept as
 * distinct fields even though Step 1 of the UI conflates them into one tap:
 * each audience implies a default format, but the two can diverge later.
 */

export type AudienceId = "blog" | "social" | "network" | "leadership" | "investors" | "other";

export type FormatId = "blog" | "social" | "network" | "leadership" | "investors";

export type ScopeId = "just_chapter" | "chapter_recap" | "last_few" | "whole_story" | "specific";

export type GapResolutionAction = "added" | "skipped" | "tbd";

export type GapResolution = {
  beatKey: string;
  action: GapResolutionAction;
  /** Present when action === "added". */
  content?: string;
};

export type ShareRequest = {
  audienceId: AudienceId;
  /** Typed text when audienceId === "other"; otherwise the audience's display label. */
  audienceLabel: string;
  format: FormatId;
  scope: ScopeId;
  /** Freeform text for scope === "specific". */
  scopeDetail?: string;
  gapResolutions: GapResolution[];
};
