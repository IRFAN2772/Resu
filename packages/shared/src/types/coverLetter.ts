// ─── Cover Letter Data Types ───

import { z } from 'zod';

export const CoverLetterDataSchema = z.object({
  opening: z.string(),
  bodyParagraphs: z.array(z.string()),
  closing: z.string(),
  tone: z.enum(['formal', 'professional', 'conversational']),
});
export type CoverLetterData = z.infer<typeof CoverLetterDataSchema>;
