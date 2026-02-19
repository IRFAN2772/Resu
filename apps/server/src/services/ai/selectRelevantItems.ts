// Step 2: Select relevant profile items based on parsed JD (smart model).

import {
  RelevanceSelectionSchema,
  type RelevanceSelection,
  type PersonalProfile,
  type ParsedJobDescription,
  type GenerationConfig,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';

export interface SelectRelevantResult {
  selection: RelevanceSelection;
  tokenUsage: TokenUsage;
  cost: number;
}

export async function selectRelevantItems(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  config?: GenerationConfig,
): Promise<SelectRelevantResult> {
  const systemPrompt = loadPrompt('selectRelevant');

  const userMessage = JSON.stringify(
    {
      profile,
      parsedJobDescription: parsedJD,
      userPreferences: {
        skillsToEmphasize: config?.skillsToEmphasize ?? [],
        targetPageLength: config?.targetPageLength ?? 1,
      },
    },
    null,
    2,
  );

  const result = await chatCompletion({
    modelTier: 'smart',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.3,
  });

  const raw = JSON.parse(result.content);

  // Normalize common AI format variations before Zod validation
  const normalized = normalizeSelectionResponse(raw);
  const validated = RelevanceSelectionSchema.parse(normalized);

  return {
    selection: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}

/**
 * Normalize AI response to match our schema.
 * Handles cases where the AI returns objects instead of strings, or wraps the result.
 */
function normalizeSelectionResponse(raw: any): any {
  // If the AI wrapped the response in a container, unwrap it
  if (raw.relevanceSelection) raw = raw.relevanceSelection;
  if (raw.result) raw = raw.result;
  if (raw.selection) raw = raw.selection;

  return {
    proposedSummary: raw.proposedSummary ?? raw.proposed_summary ?? raw.summary ?? '',
    selectedExperiences: normalizeExperiences(raw.selectedExperiences ?? raw.selected_experiences ?? raw.experiences ?? []),
    selectedSkills: normalizeStringArray(raw.selectedSkills ?? raw.selected_skills ?? raw.skills ?? []),
    selectedProjects: normalizeStringArray(raw.selectedProjects ?? raw.selected_projects ?? raw.projects ?? [], 'id'),
    selectedCertifications: normalizeStringArray(raw.selectedCertifications ?? raw.selected_certifications ?? raw.certifications ?? [], 'id'),
    overallMatchScore: raw.overallMatchScore ?? raw.overall_match_score ?? raw.matchScore ?? 50,
  };
}

function normalizeStringArray(arr: any[], idField = 'name'): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (typeof item === 'string') return item;
    // If the AI returned objects, extract the string value
    return item?.[idField] ?? item?.name ?? item?.id ?? item?.title ?? String(item);
  });
}

function normalizeExperiences(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((exp) => ({
    experienceId: exp.experienceId ?? exp.experience_id ?? exp.id ?? '',
    include: exp.include ?? true,
    selectedBullets: (exp.selectedBullets ?? exp.selected_bullets ?? exp.bullets ?? []).map((b: any) => ({
      experienceId: b.experienceId ?? b.experience_id ?? exp.experienceId ?? exp.experience_id ?? exp.id ?? '',
      bulletIndex: b.bulletIndex ?? b.bullet_index ?? b.index ?? 0,
      originalText: b.originalText ?? b.original_text ?? b.text ?? '',
      relevanceScore: b.relevanceScore ?? b.relevance_score ?? b.score ?? 50,
      matchedKeywords: b.matchedKeywords ?? b.matched_keywords ?? b.keywords ?? [],
    })),
  }));
}
