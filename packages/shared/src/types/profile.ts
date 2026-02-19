// ─── Personal Profile Types ───
// Your master profile: the single source of truth for all your career data.

import { z } from 'zod';

// ─── Bullet Point ───
export const BulletPointSchema = z.object({
  text: z.string(),
  tags: z.array(z.string()),
  category: z.enum(['technical', 'leadership', 'impact', 'collaboration', 'process', 'other']),
  strength: z.number().min(1).max(5),
});
export type BulletPoint = z.infer<typeof BulletPointSchema>;

// ─── Experience Entry ───
export const ExperienceEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  titleAliases: z.array(z.string()).default([]),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(), // undefined = "Present"
  bullets: z.array(BulletPointSchema),
  tags: z.array(z.string()),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

// ─── Skill ───
export const SkillSchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  proficiency: z.enum(['expert', 'advanced', 'intermediate']),
  category: z.string(), // e.g., "frontend", "backend", "devops", "tools"
});
export type Skill = z.infer<typeof SkillSchema>;

// ─── Project ───
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  tags: z.array(z.string()),
  highlights: z.array(z.string()),
});
export type Project = z.infer<typeof ProjectSchema>;

// ─── Education ───
export const EducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  highlights: z.array(z.string()).default([]),
});
export type Education = z.infer<typeof EducationSchema>;

// ─── Certification ───
export const CertificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  url: z.string().optional(),
  tags: z.array(z.string()),
});
export type Certification = z.infer<typeof CertificationSchema>;

// ─── Achievement ───
export const AchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});
export type Achievement = z.infer<typeof AchievementSchema>;

// ─── Contact Info ───
export const ContactInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

// ─── Full Personal Profile ───
export const PersonalProfileSchema = z.object({
  contact: ContactInfoSchema,
  summary: z.string(), // Default/base professional summary
  experience: z.array(ExperienceEntrySchema),
  skills: z.array(SkillSchema),
  education: z.array(EducationSchema),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
});
export type PersonalProfile = z.infer<typeof PersonalProfileSchema>;
