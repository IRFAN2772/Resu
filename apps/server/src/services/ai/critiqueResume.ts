// Critic Agent: reviews generated resume and provides actionable critique
// for the self-improvement iteration loop.
// Token optimization: compressed context, downgraded to 'fast' model tier.

import {
  ResumeCritiqueSchema,
  type ResumeCritique,
  type ResumeData,
  type ParsedJobDescription,
  type UserAIConfig,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';
import {
  compressJDMinimal,
  compressIntelligenceBrief,
} from './contextCompressor.js';

export interface CritiqueResumeResult {
  critique: ResumeCritique;
  tokenUsage: TokenUsage;
  cost: number;
}

export async function critiqueResume(
  resumeData: ResumeData,
  parsedJD: ParsedJobDescription,
  intelligenceBrief: string,
  userAI?: UserAIConfig,
): Promise<CritiqueResumeResult> {
  const systemPrompt = loadPrompt('critiqueResume');

  // Compressed user message: resume in compact text, JD minimal, brief compressed
  const sections: string[] = [];

  // Resume summary
  sections.push(`[RESUME SUMMARY]\n${resumeData.summary}`);

  // Experience bullets — compact
  const expLines = resumeData.experience.map(
    (e) => `• ${e.title} @ ${e.company}: ${e.bullets.slice(0, 3).join(' | ')}`,
  );
  sections.push(`[EXPERIENCE]\n${expLines.join('\n')}`);

  // Skills
  const skillNames = resumeData.skills.categories.flatMap((c) => c.skills);
  sections.push(`[SKILLS]\n${skillNames.join(', ')}`);

  // JD — minimal (role + top requirements)
  sections.push(`[JOB TARGET]\n${compressJDMinimal(parsedJD)}`);

  // Intelligence brief — compressed
  if (intelligenceBrief) {
    sections.push(`[SKILL INTELLIGENCE]\n${compressIntelligenceBrief(intelligenceBrief)}`);
  }

  const userMessage = sections.join('\n\n');

  const result = await chatCompletion({
    modelTier: 'fast',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.2,
    userAI,
  });

  const raw = safeJSONParse(result.content);
  const normalized = normalizeCritiqueResponse(raw);
  const validated = ResumeCritiqueSchema.parse(normalized);

  return {
    critique: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}

function safeJSONParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch { /* continue */ }

  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* continue */ }
  }

  throw new Error('Failed to parse critique response as JSON');
}

function normalizeCritiqueResponse(raw: any): any {
  if (raw.critique) raw = raw.critique;
  if (raw.result) raw = raw.result;

  return {
    overallScore: raw.overallScore ?? raw.overall_score ?? 5,
    keywordCoverage: normalizeKeywordCoverage(raw.keywordCoverage ?? raw.keyword_coverage ?? {}),
    impactQuality: normalizeImpactQuality(raw.impactQuality ?? raw.impact_quality ?? {}),
    summaryQuality: normalizeSummaryQuality(raw.summaryQuality ?? raw.summary_quality ?? {}),
    skillsAssessment: normalizeSkillsAssessment(raw.skillsAssessment ?? raw.skills_assessment ?? {}),
    improvements: normalizeImprovements(raw.improvements ?? []),
    needsRevision: raw.needsRevision ?? raw.needs_revision ?? false,
  };
}

function normalizeKeywordCoverage(raw: any): any {
  return {
    score: raw.score ?? 5,
    missingCritical: raw.missingCritical ?? raw.missing_critical ?? [],
    missingNice: raw.missingNice ?? raw.missing_nice ?? [],
    suggestion: raw.suggestion ?? '',
  };
}

function normalizeImpactQuality(raw: any): any {
  return {
    score: raw.score ?? 5,
    weakBullets: (raw.weakBullets ?? raw.weak_bullets ?? []).map((b: any) => ({
      experienceTitle: b.experienceTitle ?? b.experience_title ?? b.title ?? '',
      bulletText: b.bulletText ?? b.bullet_text ?? b.text ?? '',
      issue: b.issue ?? '',
      suggestedFix: b.suggestedFix ?? b.suggested_fix ?? b.fix ?? '',
    })),
  };
}

function normalizeSummaryQuality(raw: any): any {
  return {
    score: raw.score ?? 5,
    issues: raw.issues ?? [],
    suggestedRewrite: raw.suggestedRewrite ?? raw.suggested_rewrite ?? undefined,
  };
}

function normalizeSkillsAssessment(raw: any): any {
  return {
    score: raw.score ?? 5,
    missingFoundational: raw.missingFoundational ?? raw.missing_foundational ?? [],
    unnecessarySkills: raw.unnecessarySkills ?? raw.unnecessary_skills ?? [],
    recategorizations: raw.recategorizations ?? [],
  };
}

function normalizeImprovements(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => ({
    priority: item.priority ?? 'medium',
    area: item.area ?? 'general',
    instruction: item.instruction ?? item.message ?? '',
  }));
}
