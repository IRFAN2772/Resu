// Step 5: Generate cover letter from confirmed selection (smart model).

import {
  CoverLetterDataSchema,
  type CoverLetterData,
  type PersonalProfile,
  type ParsedJobDescription,
  type RelevanceSelection,
  type GenerationConfig,
  type UserAIConfig,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';

export interface GenerateCoverLetterResult {
  coverLetter: CoverLetterData;
  tokenUsage: TokenUsage;
  cost: number;
}

export async function generateCoverLetter(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  selection: RelevanceSelection,
  config: GenerationConfig,
  userAI?: UserAIConfig,
): Promise<GenerateCoverLetterResult> {
  const systemPrompt = loadPrompt('generateCoverLetter', {
    tone: config.tone ?? 'professional',
  });

  const userMessage = JSON.stringify(
    {
      candidateName: profile.contact.name,
      companyName: parsedJD.companyName,
      roleTitle: parsedJD.roleTitle,
      proposedSummary: selection.proposedSummary,
      selectedExperiences: selection.selectedExperiences
        .filter((se) => se.include)
        .map((se) => {
          const fullExp = profile.experience.find((e) => e.id === se.experienceId);
          return {
            title: fullExp?.title,
            company: fullExp?.company,
            topBullets: se.selectedBullets.slice(0, 3).map((b) => b.originalText),
          };
        }),
      keySkills: selection.selectedSkills.slice(0, 8),
      parsedJobDescription: {
        requiredSkills: parsedJD.requiredSkills,
        responsibilities: parsedJD.responsibilities,
        industryDomain: parsedJD.industryDomain,
      },
      tone: config.tone,
    },
    null,
    2,
  );

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
