// ─── Relevance Selection Types ───
// Output of Step 2: selected profile items for the user to review at the checkpoint.

import { z } from 'zod';

export const SelectedBulletSchema = z.object({
  experienceId: z.string(),
  bulletIndex: z.number(),
  originalText: z.string(),
  relevanceScore: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
});
export type SelectedBullet = z.infer<typeof SelectedBulletSchema>;

export const SelectedExperienceSchema = z.object({
  experienceId: z.string(),
  include: z.boolean().default(true),
  selectedBullets: z.array(SelectedBulletSchema),
});
export type SelectedExperience = z.infer<typeof SelectedExperienceSchema>;

export const RelevanceSelectionSchema = z.object({
  proposedSummary: z.string(),
  selectedExperiences: z.array(SelectedExperienceSchema),
  selectedSkills: z.array(z.string()), // skill names to feature
  selectedProjects: z.array(z.string()), // project IDs to include
  selectedCertifications: z.array(z.string()), // certification IDs to include
  overallMatchScore: z.number().min(0).max(100),
});
export type RelevanceSelection = z.infer<typeof RelevanceSelectionSchema>;
