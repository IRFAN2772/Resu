// ─── Resume Strategy Types ───
// Output of the Planning Agent (Step 0): a strategic plan
// that guides all subsequent generation steps.

import { z } from 'zod';

export const ResumeStrategySchema = z.object({
  /** The core narrative angle: what story should this resume tell? */
  narrativeAngle: z.string(),
  /** Top 3-5 strengths to emphasize, ranked by JD relevance */
  topStrengths: z.array(z.string()),
  /** Skills/experience gaps and how to mitigate them via transferable skills */
  gapMitigations: z.array(
    z.object({
      gap: z.string(),
      mitigation: z.string(),
    }),
  ),
  /** Which experience roles are most relevant and why (in priority order) */
  experiencePriority: z.array(
    z.object({
      experienceId: z.string(),
      reason: z.string(),
      keyAngle: z.string(),
    }),
  ),
  /** Recommended skills to highlight (with reasoning) */
  skillStrategy: z.object({
    mustInclude: z.array(z.string()),
    shouldInclude: z.array(z.string()),
    skipReasons: z.array(
      z.object({
        skill: z.string(),
        reason: z.string(),
      }),
    ),
  }),
  /** How to position the candidate for this specific role */
  positioningStatement: z.string(),
  /** The overall strategy summary in 2-3 sentences */
  strategySummary: z.string(),
});
export type ResumeStrategy = z.infer<typeof ResumeStrategySchema>;
