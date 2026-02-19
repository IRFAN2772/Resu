// ─── ATS Score Types ───

import { z } from 'zod';

export const ATSSuggestionSchema = z.object({
  type: z.enum(['keyword', 'format', 'section', 'length', 'density']),
  severity: z.enum(['critical', 'warning', 'info']),
  message: z.string(),
});
export type ATSSuggestion = z.infer<typeof ATSSuggestionSchema>;

export const ATSScoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  keywordMatch: z.number().min(0).max(100), // % of JD keywords found in resume
  sectionScore: z.number().min(0).max(100), // section headers + ordering
  formatScore: z.number().min(0).max(100), // dates, bullet density, length
  suggestions: z.array(ATSSuggestionSchema),
});
export type ATSScoreResult = z.infer<typeof ATSScoreResultSchema>;
