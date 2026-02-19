// ─── API Types ───
// Request/response shapes for API endpoints.

import { z } from 'zod';
import { GenerationConfigSchema } from './generationConfig.js';
import { ParsedJobDescriptionSchema } from './jobDescription.js';
import { RelevanceSelectionSchema } from './relevanceSelection.js';
import { ResumeDataSchema } from './resume.js';
import { CoverLetterDataSchema } from './coverLetter.js';
import { ATSScoreResultSchema } from './atsScore.js';

// POST /api/generate/parse
export const GenerateParseRequestSchema = z.object({
  jdText: z.string().min(50, 'Job description must be at least 50 characters'),
  config: GenerationConfigSchema.optional(),
});
export type GenerateParseRequest = z.infer<typeof GenerateParseRequestSchema>;

export const GenerateParseResponseSchema = z.object({
  parsedJD: ParsedJobDescriptionSchema,
  relevanceSelection: RelevanceSelectionSchema,
});
export type GenerateParseResponse = z.infer<typeof GenerateParseResponseSchema>;

// POST /api/generate/confirm
export const GenerateConfirmRequestSchema = z.object({
  jdText: z.string(),
  parsedJD: ParsedJobDescriptionSchema,
  relevanceSelection: RelevanceSelectionSchema,
  config: GenerationConfigSchema,
});
export type GenerateConfirmRequest = z.infer<typeof GenerateConfirmRequestSchema>;

export const GenerateConfirmResponseSchema = z.object({
  id: z.string(),
  resumeData: ResumeDataSchema,
  coverLetter: CoverLetterDataSchema,
  atsScore: ATSScoreResultSchema,
  tokenUsage: z.object({
    parseTokens: z.number(),
    selectTokens: z.number(),
    generateTokens: z.number(),
    coverLetterTokens: z.number(),
    totalCost: z.number(),
  }),
});
export type GenerateConfirmResponse = z.infer<typeof GenerateConfirmResponseSchema>;

// GET /api/resumes — list item
export const ResumeListItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  jobTitle: z.string(),
  atsScore: z.number(),
  status: z.enum(['draft', 'exported', 'archived']),
  templateId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResumeListItem = z.infer<typeof ResumeListItemSchema>;

// GET /api/resume/:id — full detail
export const ResumeDetailSchema = z.object({
  id: z.string(),
  company: z.string(),
  jobTitle: z.string(),
  jdText: z.string(),
  parsedJD: ParsedJobDescriptionSchema,
  generationConfig: GenerationConfigSchema,
  relevanceSelection: RelevanceSelectionSchema,
  resumeData: ResumeDataSchema,
  coverLetter: CoverLetterDataSchema.nullable(),
  atsScore: ATSScoreResultSchema,
  templateId: z.string(),
  promptVersion: z.string(),
  status: z.enum(['draft', 'exported', 'archived']),
  tokenUsage: z.any(),
  createdAt: z.string(),
  updatedAt: z.string(),
  versions: z.array(
    z.object({
      id: z.string(),
      resumeData: ResumeDataSchema,
      changeDescription: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type ResumeDetail = z.infer<typeof ResumeDetailSchema>;

// PUT /api/resume/:id
export const UpdateResumeRequestSchema = z.object({
  resumeData: ResumeDataSchema.optional(),
  coverLetter: CoverLetterDataSchema.optional(),
  templateId: z.string().optional(),
  status: z.enum(['draft', 'exported', 'archived']).optional(),
  changeDescription: z.string().default('Manual edit'),
});
export type UpdateResumeRequest = z.infer<typeof UpdateResumeRequestSchema>;

// POST /api/resume/:id/export
export const ExportRequestSchema = z.object({
  type: z.enum(['resume', 'cover-letter', 'both']).default('resume'),
  pageSize: z.enum(['letter', 'a4']).default('letter'),
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// Template listing
export const TemplateInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  thumbnail: z.string().optional(),
});
export type TemplateInfo = z.infer<typeof TemplateInfoSchema>;
