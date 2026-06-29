// Step 3: Generate polished resume from confirmed selection (smart model).
// Now supports: strategy-guided generation, skill graph intelligence, and critique-driven revision.
// Token optimization: compressed JD/strategy in user message; delta-based revision.

import {
  ResumeDataSchema,
  type ResumeData,
  type PersonalProfile,
  type ParsedJobDescription,
  type RelevanceSelection,
  type GenerationConfig,
  type UserAIConfig,
  type ResumeStrategy,
  type ResumeCritique,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';
import {
  compressJDMinimal,
  compressStrategy,
  compressIntelligenceBrief,
  compressCritiqueToInstructions,
} from './contextCompressor.js';

export interface GenerateResumeResult {
  resumeData: ResumeData;
  tokenUsage: TokenUsage;
  cost: number;
}

export interface GenerateResumeContext {
  /** Strategic plan from the planning agent */
  strategy?: ResumeStrategy;
  /** Intelligence brief from the skill graph */
  intelligenceBrief?: string;
  /** Critique from previous iteration (for revision mode) */
  previousCritique?: ResumeCritique;
  /** The previous resume (for revision mode - so AI knows what to improve) */
  previousResume?: ResumeData;
}

export async function generateResume(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  selection: RelevanceSelection,
  config: GenerationConfig,
  userAI?: UserAIConfig,
  context?: GenerateResumeContext,
): Promise<GenerateResumeResult> {
  const systemPrompt = loadPrompt('generateResume', {
    targetPageLength: String(config.targetPageLength ?? 1),
    tone: config.tone ?? 'professional',
  });

  // Build context: only include selected items from the profile
  const selectedExperiences = selection.selectedExperiences
    .filter((se) => se.include)
    .map((se) => {
      const fullExp = profile.experience.find((e) => e.id === se.experienceId);
      if (!fullExp) return null;
      return {
        title: fullExp.title,
        company: fullExp.company,
        location: fullExp.location,
        startDate: fullExp.startDate,
        endDate: fullExp.endDate,
        selectedBullets: se.selectedBullets.map((b) => b.originalText),
      };
    })
    .filter(Boolean);

  const selectedSkills = profile.skills.filter((s) =>
    selection.selectedSkills.some((sel) => sel.toLowerCase() === s.name.toLowerCase()),
  );

  // Include skills added via ATS gap chips that don't exist in the profile
  // Deduplicate by lowercase name to avoid "full-stack development" + "Full-stack development"
  const profileSkillNames = new Set(profile.skills.map((s) => s.name.toLowerCase()));
  const seenExtra = new Set<string>();
  const extraSkills = selection.selectedSkills
    .filter((s) => {
      const lower = s.toLowerCase();
      if (profileSkillNames.has(lower) || seenExtra.has(lower)) return false;
      seenExtra.add(lower);
      return true;
    })
    .map((name) => ({
      name,
      aliases: [],
      proficiency: 'intermediate' as const,
      category: 'other',
    }));

  const allSelectedSkills = [...selectedSkills, ...extraSkills];

  const selectedProjects = profile.projects.filter((p) =>
    selection.selectedProjects.includes(p.id),
  );

  const selectedCerts = profile.certifications.filter((c) =>
    selection.selectedCertifications.includes(c.id),
  );

  // Build a compressed text payload instead of verbose JSON.
  // Uses compressJDMinimal (role/company/top-reqs only) since the full JD
  // was already consumed by selectRelevant. Strategy & intelligence are also
  // compressed to brief bullets. Revision mode uses delta instructions (~200-300
  // tokens) instead of sending the full previous critique + resume (~3-5K).
  const sections: string[] = [];

  sections.push(
    `[CONTACT]\n${profile.contact.name} | ${profile.contact.email} | ${profile.contact.location || ''}`,
  );
  sections.push(`[SUMMARY PROPOSAL]\n${selection.proposedSummary}`);

  // Experiences — compact representation
  const expLines = selectedExperiences
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .map(
      (e) =>
        `• ${e.title} @ ${e.company} (${e.startDate}–${e.endDate || 'present'})\n  ${e.selectedBullets.slice(0, 4).join(' | ')}`,
    );
  sections.push(`[EXPERIENCES]\n${expLines.join('\n')}`);

  // Skills — names only, grouped
  const skillNames = allSelectedSkills.map((s) => s.name);
  sections.push(`[SKILLS]\n${skillNames.join(', ')}`);

  // Education
  const eduLines = profile.education.map(
    (e) => `${e.degree} — ${e.institution} (${e.endDate || ''})`,
  );
  sections.push(`[EDUCATION]\n${eduLines.join('\n')}`);

  // Projects — brief
  if (selectedProjects.length) {
    const projLines = selectedProjects.map(
      (p) => `• ${p.name}${p.url ? ` [${p.url}]` : ''}: ${p.description?.slice(0, 120) || ''}`,
    );
    sections.push(`[PROJECTS]\n${projLines.join('\n')}`);
  }

  // Certifications
  if (selectedCerts.length) {
    sections.push(
      `[CERTIFICATIONS]\n${selectedCerts.map((c) => `${c.name} (${c.issuer})`).join(', ')}`,
    );
  }

  // Compressed JD (minimal — role + company + top requirements only)
  sections.push(`[JOB TARGET]\n${compressJDMinimal(parsedJD)}`);

  sections.push(`[FORMAT]\ntargetPages: ${config.targetPageLength}, tone: ${config.tone}`);

  // Strategy — compressed to key bullets
  if (context?.strategy) {
    sections.push(`[STRATEGY]\n${compressStrategy(context.strategy)}`);
  }

  // Skill graph intelligence — compressed
  if (context?.intelligenceBrief) {
    sections.push(`[SKILL INTELLIGENCE]\n${compressIntelligenceBrief(context.intelligenceBrief)}`);
  }

  // Revision mode — delta-only instructions instead of full critique + previous resume
  if (context?.previousCritique && context?.previousResume) {
    sections.push(
      `[REVISION MODE]\n${compressCritiqueToInstructions(context.previousCritique, context.previousResume)}`,
    );
  }

  const userMessage = sections.join('\n\n');

  const result = await chatCompletion({
    modelTier: 'smart',
    systemPrompt,
    userMessage,
    jsonMode: true,
    temperature: 0.25,
    userAI,
  });

  const raw = safeJSONParse(result.content);
  const normalized = normalizeResumeResponse(raw);
  const validated = ResumeDataSchema.parse(normalized);

  return {
    resumeData: validated,
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
 * Normalize AI response to match our ResumeData schema.
 * Handles field name variations and structural differences.
 */
function normalizeResumeResponse(raw: any): any {
  // Unwrap if the AI wrapped in a container
  if (raw.resumeData) raw = raw.resumeData;
  if (raw.resume) raw = raw.resume;
  if (raw.result) raw = raw.result;

  return {
    contact: raw.contact ?? {},
    summary:
      raw.summary ?? raw.professionalSummary ?? raw.professional_summary ?? raw.objective ?? '',
    experience: normalizeExperience(
      raw.experience ?? raw.workExperience ?? raw.work_experience ?? [],
    ),
    education: normalizeEducation(raw.education ?? []),
    skills: normalizeSkills(raw.skills ?? raw.technicalSkills ?? raw.technical_skills ?? {}),
    projects: normalizeProjects(raw.projects ?? []),
    certifications: normalizeCertifications(raw.certifications ?? []),
  };
}

function normalizeExperience(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => ({
    title: e.title ?? e.role ?? e.position ?? '',
    company: e.company ?? e.organization ?? '',
    location: e.location,
    startDate: e.startDate ?? e.start_date ?? e.from ?? '',
    endDate: e.endDate ?? e.end_date ?? e.to,
    bullets: Array.isArray(e.bullets)
      ? e.bullets.map((b: any) => (typeof b === 'string' ? b : (b.text ?? b.bullet ?? String(b))))
      : Array.isArray(e.achievements)
        ? e.achievements
        : [],
  }));
}

function normalizeEducation(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => ({
    institution: e.institution ?? e.school ?? e.university ?? '',
    degree: e.degree ?? '',
    field: e.field ?? e.major ?? e.fieldOfStudy ?? e.field_of_study ?? '',
    startDate: e.startDate ?? e.start_date ?? '',
    endDate: e.endDate ?? e.end_date,
    gpa: e.gpa,
    highlights: e.highlights ?? [],
  }));
}

function normalizeSkills(skills: any): any {
  // Already correct format
  if (skills?.categories && Array.isArray(skills.categories)) {
    return {
      categories: skills.categories.map((c: any) => ({
        name: c.name ?? c.category ?? 'Other',
        skills: Array.isArray(c.skills) ? c.skills.map(String) : [],
      })),
    };
  }

  // If it's an array of objects with name+skills
  if (Array.isArray(skills)) {
    const hasCategories =
      skills.length > 0 && typeof skills[0] === 'object' && (skills[0].name || skills[0].category);
    if (hasCategories) {
      return {
        categories: skills.map((c: any) => ({
          name: c.name ?? c.category ?? 'Other',
          skills: Array.isArray(c.skills) ? c.skills.map(String) : [],
        })),
      };
    }
    // Flat array of strings — group into one category
    return { categories: [{ name: 'Technical Skills', skills: skills.map(String) }] };
  }

  // If it's an object with category names as keys (e.g., { "Languages": [...], "Frameworks": [...] })
  if (typeof skills === 'object' && !skills.categories) {
    const categories = Object.entries(skills)
      .filter(([_, v]) => Array.isArray(v))
      .map(([name, skillList]) => ({
        name,
        skills: (skillList as any[]).map(String),
      }));
    if (categories.length > 0) return { categories };
  }

  return { categories: [] };
}

function normalizeProjects(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((p) => ({
    name: p.name ?? p.title ?? '',
    description: p.description ?? '',
    url: p.url ?? p.link,
    highlights: p.highlights ?? p.achievements ?? [],
  }));
}

function normalizeCertifications(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((c) => ({
    name: c.name ?? c.title ?? '',
    issuer: c.issuer ?? c.organization ?? c.issuedBy ?? '',
    date: c.date ?? c.issuedDate ?? c.issued_date ?? '',
  }));
}
