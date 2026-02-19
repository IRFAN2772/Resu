// Step 5: Generate cover letter from confirmed selection (smart model).

import {
  CoverLetterDataSchema,
  type CoverLetterData,
  type PersonalProfile,
  type ParsedJobDescription,
  type RelevanceSelection,
  type GenerationConfig,
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
  });

  const parsed = JSON.parse(result.content);
  const validated = CoverLetterDataSchema.parse(parsed);

  return {
    coverLetter: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}
