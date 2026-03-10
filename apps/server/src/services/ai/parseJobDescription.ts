// Step 1: Parse a raw job description into structured data (fast model).

import {
  ParsedJobDescriptionSchema,
  type ParsedJobDescription,
  type GenerationConfig,
  type UserAIConfig,
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
  userAI?: UserAIConfig,
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
    temperature: 0.1,
    userAI,
  });

  const parsed = safeJSONParse(result.content);
  const normalized = normalizeJDResponse(parsed);
  const validated = ParsedJobDescriptionSchema.parse(normalized);

  return {
    parsedJD: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
}

/** Normalize AI response field name variations to match our schema */
function normalizeJDResponse(raw: any): any {
  // Unwrap if wrapped
  if (raw.parsedJobDescription) raw = raw.parsedJobDescription;
  if (raw.parsed_job_description) raw = raw.parsed_job_description;
  if (raw.result) raw = raw.result;

  const validLevels = [
    'intern', 'junior', 'mid', 'senior', 'staff',
    'principal', 'lead', 'manager', 'director', 'unknown',
  ];
  let level = raw.seniorityLevel ?? raw.seniority_level ?? raw.seniority ?? raw.level ?? 'unknown';
  if (!validLevels.includes(level)) level = 'unknown';

  return {
    companyName: raw.companyName ?? raw.company_name ?? raw.company ?? '',
    roleTitle: raw.roleTitle ?? raw.role_title ?? raw.role ?? raw.title ?? raw.jobTitle ?? raw.job_title ?? '',
    seniorityLevel: level,
    requiredSkills: ensureStringArray(raw.requiredSkills ?? raw.required_skills ?? []),
    preferredSkills: ensureStringArray(raw.preferredSkills ?? raw.preferred_skills ?? []),
    keywords: ensureStringArray(raw.keywords ?? raw.key_words ?? []),
    responsibilities: ensureStringArray(raw.responsibilities ?? []),
    qualifications: ensureStringArray(raw.qualifications ?? []),
    niceToHaves: ensureStringArray(raw.niceToHaves ?? raw.nice_to_haves ?? raw.niceToHave ?? []),
    industryDomain: raw.industryDomain ?? raw.industry_domain ?? raw.industry ?? null,
    teamSize: raw.teamSize ?? raw.team_size ?? null,
    techStack: ensureStringArray(raw.techStack ?? raw.tech_stack ?? []),
  };
}

function ensureStringArray(val: any): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((v: any) => (typeof v === 'string' ? v : String(v)));
}

/** Safely extract JSON from AI response, handling stray text/code fences */
function safeJSONParse(text: string): any {
  // First try direct parse
  try { return JSON.parse(text); } catch { /* continue */ }

  // Strip markdown code fences
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Extract first JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* continue */ }
  }

  throw new Error('Failed to parse AI response as JSON');
}
