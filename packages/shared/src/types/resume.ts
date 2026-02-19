// ─── Resume Data Types ───
// The final resume content output from the AI pipeline (Step 3).

import { z } from 'zod';

export const ResumeExperienceItemSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()), // Polished, keyword-optimized bullets
});
export type ResumeExperienceItem = z.infer<typeof ResumeExperienceItemSchema>;

export const ResumeEducationItemSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  highlights: z.array(z.string()).default([]),
});
export type ResumeEducationItem = z.infer<typeof ResumeEducationItemSchema>;

export const ResumeProjectItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  highlights: z.array(z.string()),
});
export type ResumeProjectItem = z.infer<typeof ResumeProjectItemSchema>;

export const ResumeSkillsSectionSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(), // e.g., "Languages", "Frameworks", "Tools"
      skills: z.array(z.string()),
    }),
  ),
});
export type ResumeSkillsSection = z.infer<typeof ResumeSkillsSectionSchema>;

export const ResumeDataSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
  }),
  summary: z.string(),
  experience: z.array(ResumeExperienceItemSchema),
  education: z.array(ResumeEducationItemSchema),
  skills: ResumeSkillsSectionSchema,
  projects: z.array(ResumeProjectItemSchema).default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        date: z.string(),
      }),
    )
    .default([]),
});
export type ResumeData = z.infer<typeof ResumeDataSchema>;
