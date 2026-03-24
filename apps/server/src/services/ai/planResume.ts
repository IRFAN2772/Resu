// Step 0: Planning Agent — creates a strategic blueprint before any selection/generation.
// Token optimization: Uses compressed profile + JD instead of raw JSON objects.

import {
  ResumeStrategySchema,
  type ResumeStrategy,
  type ParsedJobDescription,
  type GenerationConfig,
  type UserAIConfig,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';
import type { EnrichedProfile } from './profileEnricher.js';
import { compressProfileFull, compressJDFull } from './contextCompressor.js';

export interface PlanResumeResult {
  strategy: ResumeStrategy;
  tokenUsage: TokenUsage;
  cost: number;
}

export async function planResume(
  enriched: EnrichedProfile,
  parsedJD: ParsedJobDescription,
  config?: GenerationConfig,
  userAI?: UserAIConfig,
): Promise<PlanResumeResult> {
  const systemPrompt = loadPrompt('planResume');

  // Token optimization: send compressed text representations instead of full JSON
  const userMessage = [
    '=== CANDIDATE PROFILE ===',
    compressProfileFull(enriched.original),
    '',
    '=== JOB DESCRIPTION ===',
    compressJDFull(parsedJD),
    '',
    '=== SKILL GRAPH ANALYSIS ===',
    enriched.intelligenceBrief,
    '',
    '=== USER PREFERENCES ===',
    `Skills to emphasize: ${(config?.skillsToEmphasize ?? []).join(', ') || 'none'}`,
    `Target page length: ${config?.targetPageLength ?? 1}`,
    `Tone: ${config?.tone ?? 'professional'}`,
  ].join('\n');

  const result = await chatCompletion({
    modelTier: 'smart',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.3,
    userAI,
  });

  const raw = safeJSONParse(result.content);
  const normalized = normalizeStrategyResponse(raw);
  const validated = ResumeStrategySchema.parse(normalized);

  return {
    strategy: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}

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

  throw new Error('Failed to parse planning agent response as JSON');
}

function normalizeStrategyResponse(raw: any): any {
  if (raw.strategy) raw = raw.strategy;
  if (raw.result) raw = raw.result;

  return {
    narrativeAngle: raw.narrativeAngle ?? raw.narrative_angle ?? raw.narrative ?? '',
    topStrengths: raw.topStrengths ?? raw.top_strengths ?? raw.strengths ?? [],
    gapMitigations: (raw.gapMitigations ?? raw.gap_mitigations ?? raw.gaps ?? []).map((g: any) => ({
      gap: g.gap ?? '',
      mitigation: g.mitigation ?? g.strategy ?? '',
    })),
    experiencePriority: (
      raw.experiencePriority ??
      raw.experience_priority ??
      raw.experiences ??
      []
    ).map((e: any) => ({
      experienceId: e.experienceId ?? e.experience_id ?? e.id ?? '',
      reason: e.reason ?? '',
      keyAngle: e.keyAngle ?? e.key_angle ?? e.angle ?? '',
    })),
    skillStrategy: normalizeSkillStrategy(
      raw.skillStrategy ?? raw.skill_strategy ?? raw.skills ?? {},
    ),
    positioningStatement:
      raw.positioningStatement ?? raw.positioning_statement ?? raw.positioning ?? '',
    strategySummary: raw.strategySummary ?? raw.strategy_summary ?? raw.summary ?? '',
  };
}

function normalizeSkillStrategy(raw: any): any {
  return {
    mustInclude: raw.mustInclude ?? raw.must_include ?? [],
    shouldInclude: raw.shouldInclude ?? raw.should_include ?? [],
    skipReasons: (raw.skipReasons ?? raw.skip_reasons ?? raw.skip ?? []).map((s: any) => ({
      skill: s.skill ?? '',
      reason: s.reason ?? '',
    })),
  };
}
