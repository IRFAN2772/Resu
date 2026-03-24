// Step 2: Select relevant profile items based on parsed JD (smart model).
// Now enhanced with: strategy guidance, skill graph intelligence, and post-selection enforcement.
// Token optimization: Uses compressed profile text + compressed strategy.

import {
  RelevanceSelectionSchema,
  type RelevanceSelection,
  type PersonalProfile,
  type ParsedJobDescription,
  type GenerationConfig,
  type UserAIConfig,
  type ResumeStrategy,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';
import { expandSelectedSkills, findRelevantCerts, findRelevantProjects } from './skillGraph.js';
import { compressProfileFull, compressJDFull, compressStrategy } from './contextCompressor.js';

export interface SelectRelevantResult {
  selection: RelevanceSelection;
  tokenUsage: TokenUsage;
  cost: number;
}

export interface SelectionContext {
  /** Strategic plan from the planning agent */
  strategy?: ResumeStrategy;
  /** Intelligence brief from the skill graph */
  intelligenceBrief?: string;
}

export async function selectRelevantItems(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  config?: GenerationConfig,
  userAI?: UserAIConfig,
  context?: SelectionContext,
): Promise<SelectRelevantResult> {
  const systemPrompt = loadPrompt('selectRelevant');

  // Token optimization: compressed text instead of full JSON objects.
  // selectRelevant needs full profile (to pick bullets) + full JD (to match skills)
  // but strategy and intelligence can be compressed.
  const sections: string[] = [
    '=== CANDIDATE PROFILE ===',
    compressProfileFull(profile),
    '',
    '=== JOB DESCRIPTION ===',
    compressJDFull(parsedJD),
    '',
    `=== USER PREFERENCES ===`,
    `Skills to emphasize: ${(config?.skillsToEmphasize ?? []).join(', ') || 'none'}`,
    `Target page length: ${config?.targetPageLength ?? 1}`,
  ];

  if (context?.strategy) {
    sections.push('', '=== STRATEGIC PLAN ===', compressStrategy(context.strategy));
  }

  if (context?.intelligenceBrief) {
    sections.push('', '=== SKILL GRAPH ANALYSIS ===', context.intelligenceBrief);
  }

  const userMessage = sections.join('\n');

  const result = await chatCompletion({
    modelTier: 'smart',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.3,
    userAI,
  });

  const raw = safeJSONParse(result.content);

  // Normalize common AI format variations before Zod validation
  const normalized = normalizeSelectionResponse(raw);
  const validated = RelevanceSelectionSchema.parse(normalized);

  // ─── POST-SELECTION ENFORCEMENT (code-based, deterministic) ───
  // The AI sometimes misses foundational skills despite prompt instructions.
  // This code guarantees they're always included.

  // 1. Expand skills to include foundational parents
  const expandedSkills = expandSelectedSkills(validated.selectedSkills);
  // Only add inferred skills that the user actually has (explicit or in profile)
  const profileSkillNamesLower = new Set(
    profile.skills.flatMap((s) => [s.name.toLowerCase(), ...s.aliases.map((a) => a.toLowerCase())]),
  );
  validated.selectedSkills = expandedSkills.filter(
    (s) =>
      validated.selectedSkills.some((vs) => vs.toLowerCase() === s.toLowerCase()) ||
      profileSkillNamesLower.has(s.toLowerCase()),
  );

  // 2. Ensure certifications that validate JD-required skills are included
  const allJDSkills = [
    ...parsedJD.requiredSkills,
    ...parsedJD.preferredSkills,
    ...parsedJD.keywords,
  ];
  const relevantCertIds = findRelevantCerts(profile.certifications, allJDSkills);
  for (const certId of relevantCertIds) {
    if (!validated.selectedCertifications.includes(certId)) {
      validated.selectedCertifications.push(certId);
    }
  }

  // 3. Ensure projects demonstrating JD skills are included
  const relevantProjIds = findRelevantProjects(profile.projects, allJDSkills);
  for (const projId of relevantProjIds) {
    if (!validated.selectedProjects.includes(projId)) {
      validated.selectedProjects.push(projId);
    }
  }

  return {
    selection: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}

/** Safely extract JSON from AI response, handling stray text/code fences */
function safeJSONParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue */
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      /* continue */
    }
  }

  throw new Error('Failed to parse AI response as JSON');
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
    selectedExperiences: normalizeExperiences(
      raw.selectedExperiences ?? raw.selected_experiences ?? raw.experiences ?? [],
    ),
    selectedSkills: normalizeStringArray(
      raw.selectedSkills ?? raw.selected_skills ?? raw.skills ?? [],
    ),
    selectedProjects: normalizeStringArray(
      raw.selectedProjects ?? raw.selected_projects ?? raw.projects ?? [],
      'id',
    ),
    selectedCertifications: normalizeStringArray(
      raw.selectedCertifications ?? raw.selected_certifications ?? raw.certifications ?? [],
      'id',
    ),
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
    selectedBullets: (exp.selectedBullets ?? exp.selected_bullets ?? exp.bullets ?? []).map(
      (b: any) => ({
        experienceId:
          b.experienceId ??
          b.experience_id ??
          exp.experienceId ??
          exp.experience_id ??
          exp.id ??
          '',
        bulletIndex: b.bulletIndex ?? b.bullet_index ?? b.index ?? 0,
        originalText: b.originalText ?? b.original_text ?? b.text ?? '',
        relevanceScore: b.relevanceScore ?? b.relevance_score ?? b.score ?? 50,
        matchedKeywords: b.matchedKeywords ?? b.matched_keywords ?? b.keywords ?? [],
      }),
    ),
  }));
}
