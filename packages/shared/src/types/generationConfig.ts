// ─── Generation Config Types ───
// User-provided optional context fields when generating a resume.

import { z } from 'zod';

export const GenerationConfigSchema = z.object({
  companyName: z.string().optional(),
  roleTitle: z.string().optional(),
  tone: z.enum(['formal', 'professional', 'conversational']).default('professional'),
  skillsToEmphasize: z.array(z.string()).default([]),
  targetPageLength: z.union([z.literal(1), z.literal(2)]).default(1),
  templateId: z.string().default('ats-classic'),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
