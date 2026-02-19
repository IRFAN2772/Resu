// ─── Parsed Job Description Types ───
// Structured output from JD parsing (Step 1 of the AI pipeline).

import { z } from 'zod';

export const ParsedJobDescriptionSchema = z.object({
  companyName: z.string(),
  roleTitle: z.string(),
  seniorityLevel: z.enum([
    'intern',
    'junior',
    'mid',
    'senior',
    'staff',
    'principal',
    'lead',
    'manager',
    'director',
    'unknown',
  ]),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  keywords: z.array(z.string()), // All important terms extracted from JD
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  niceToHaves: z.array(z.string()).default([]),
  industryDomain: z.string().nullish().default(null), // e.g., "fintech", "healthcare", "e-commerce"
  teamSize: z.string().nullish().default(null),
  techStack: z.array(z.string()).default([]),
});
export type ParsedJobDescription = z.infer<typeof ParsedJobDescriptionSchema>;
