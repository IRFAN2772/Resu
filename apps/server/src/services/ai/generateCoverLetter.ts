// Step 5: Generate cover letter from confirmed selection (smart model).
// Now receives the final generated resume to complement (not repeat) it.

import {
  CoverLetterDataSchema,
  type CoverLetterData,
  type PersonalProfile,
  type ParsedJobDescription,
  type RelevanceSelection,
  type GenerationConfig,
  type UserAIConfig,
  type ResumeData,
  type ATSScoreResult,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';

export interface GenerateCoverLetterResult {
  coverLetter: CoverLetterData;
  tokenUsage: TokenUsage;
  cost: number;
}

export interface CoverLetterContext {
  /** The final generated resume — so cover letter can complement, not repeat */
  finalResume?: ResumeData;
  /** ATS score — so cover letter can compensate for weak areas */
  atsScore?: ATSScoreResult;
}

export async function generateCoverLetter(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  selection: RelevanceSelection,
  config: GenerationConfig,
  userAI?: UserAIConfig,
  context?: CoverLetterContext,
): Promise<GenerateCoverLetterResult> {
  const systemPrompt = loadPrompt('generateCoverLetter', {
    tone: config.tone ?? 'professional',
  });

  // Build a compressed text payload — already selective, now even leaner
  const sections: string[] = [];

  sections.push(`[CANDIDATE] ${profile.contact.name}`);
  sections.push(`[ROLE] ${parsedJD.roleTitle} at ${parsedJD.companyName}`);
  sections.push(`[SUMMARY PROPOSAL]\n${selection.proposedSummary}`);

  // Top experiences — compact
  const expEntries = selection.selectedExperiences
    .filter((se) => se.include)
    .map((se) => {
      const fullExp = profile.experience.find((e) => e.id === se.experienceId);
      return `• ${fullExp?.title} @ ${fullExp?.company}: ${se.selectedBullets.slice(0, 3).map((b) => b.originalText).join(' | ')}`;
    });
  sections.push(`[KEY EXPERIENCES]\n${expEntries.join('\n')}`);

  sections.push(`[KEY SKILLS]\n${selection.selectedSkills.slice(0, 8).join(', ')}`);

  // JD essentials — inline instead of nested JSON
  const jdLines = [
    `Required: ${parsedJD.requiredSkills.join(', ')}`,
    `Responsibilities: ${parsedJD.responsibilities.slice(0, 5).join('; ')}`,
    parsedJD.industryDomain ? `Domain: ${parsedJD.industryDomain}` : '',
  ].filter(Boolean);
  sections.push(`[JOB REQUIREMENTS]\n${jdLines.join('\n')}`);

  sections.push(`[TONE] ${config.tone}`);

  // Resume awareness — compact
  if (context?.finalResume) {
    const resumeSkills = context.finalResume.skills.categories.flatMap((c) => c.skills);
    sections.push(`[RESUME CONTEXT]\nSummary: ${context.finalResume.summary}\nSkills: ${resumeSkills.join(', ')}`);
  }

  // ATS weak areas to compensate
  if (context?.atsScore) {
    const critical = context.atsScore.suggestions
      .filter((s) => s.severity === 'critical' || s.severity === 'warning')
      .map((s) => s.message);
    if (critical.length > 0) {
      sections.push(`[RESUME WEAK AREAS TO COMPENSATE]\n${critical.join('\n')}`);
    }
  }

  const userMessage = sections.join('\n\n');

  const result = await chatCompletion({
    modelTier: 'smart',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.5,
    userAI,
  });

  const raw = safeJSONParse(result.content);
  const normalized = normalizeCoverLetterResponse(raw);
  const validated = CoverLetterDataSchema.parse(normalized);

  return {
    coverLetter: validated,
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

/** Normalize AI response to match our CoverLetterData schema */
function normalizeCoverLetterResponse(raw: any): any {
  // Unwrap if the AI wrapped in a container
  if (raw.coverLetter) raw = raw.coverLetter;
  if (raw.cover_letter) raw = raw.cover_letter;
  if (raw.result) raw = raw.result;

  // Resolve body paragraphs from various key names
  let bodyParagraphs =
    raw.bodyParagraphs ?? raw.body_paragraphs ?? raw.body ?? raw.paragraphs ?? [];
  if (typeof bodyParagraphs === 'string') bodyParagraphs = [bodyParagraphs];
  if (!Array.isArray(bodyParagraphs)) bodyParagraphs = [];

  // Resolve tone with fallback
  const validTones = ['formal', 'professional', 'conversational'];
  let tone = raw.tone ?? 'professional';
  if (!validTones.includes(tone)) tone = 'professional';

  return {
    opening: raw.opening ?? raw.openingParagraph ?? raw.opening_paragraph ?? raw.intro ?? '',
    bodyParagraphs,
    closing: raw.closing ?? raw.closingParagraph ?? raw.closing_paragraph ?? raw.conclusion ?? '',
    tone,
  };
}
