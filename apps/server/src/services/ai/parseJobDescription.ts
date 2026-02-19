// Step 1: Parse a raw job description into structured data (fast model).

import {
  ParsedJobDescriptionSchema,
  type ParsedJobDescription,
  type GenerationConfig,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';

export interface ParseJDResult {
  parsedJD: ParsedJobDescription;
  tokenUsage: TokenUsage;
  cost: number;
}

export async function parseJobDescription(
  jdText: string,
  config?: GenerationConfig,
): Promise<ParseJDResult> {
  const systemPrompt = loadPrompt('parseJD');

  // If the user provided company name or role title, hint the parser
  let userMessage = `Job Description:\n\n${jdText}`;
  if (config?.companyName) {
    userMessage += `\n\nNote: The company is "${config.companyName}".`;
  }
  if (config?.roleTitle) {
    userMessage += `\n\nNote: The role title is "${config.roleTitle}".`;
  }

  const result = await chatCompletion({
    modelTier: 'fast',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.1, // Low temp for factual extraction
  });

  const parsed = JSON.parse(result.content);
  const validated = ParsedJobDescriptionSchema.parse(parsed);

  return {
    parsedJD: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}
