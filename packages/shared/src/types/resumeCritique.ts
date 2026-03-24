// ─── Resume Critique Types ───
// Output of the Critic Agent: a review of the generated resume
// that drives the self-improvement iteration loop.

import { z } from 'zod';

export const ResumeCritiqueSchema = z.object({
  /** Overall quality score 1-10 */
  overallScore: z.number().min(1).max(10),
  /** Keyword coverage assessment */
  keywordCoverage: z.object({
    score: z.number().min(1).max(10),
    missingCritical: z.array(z.string()),
    missingNice: z.array(z.string()),
    suggestion: z.string(),
  }),
  /** Impact & metrics quality per experience */
  impactQuality: z.object({
    score: z.number().min(1).max(10),
    weakBullets: z.array(
      z.object({
        experienceTitle: z.string(),
        bulletText: z.string(),
        issue: z.string(),
        suggestedFix: z.string(),
      }),
    ),
  }),
  /** Summary effectiveness */
  summaryQuality: z.object({
    score: z.number().min(1).max(10),
    issues: z.array(z.string()),
    suggestedRewrite: z.string().optional(),
  }),
  /** Skills section assessment */
  skillsAssessment: z.object({
    score: z.number().min(1).max(10),
    missingFoundational: z.array(z.string()),
    unnecessarySkills: z.array(z.string()),
    recategorizations: z.array(z.string()),
  }),
  /** Specific actionable improvements, ranked by priority */
  improvements: z.array(
    z.object({
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      area: z.string(),
      instruction: z.string(),
    }),
  ),
  /** Whether revision is recommended */
  needsRevision: z.boolean(),
});
export type ResumeCritique = z.infer<typeof ResumeCritiqueSchema>;
