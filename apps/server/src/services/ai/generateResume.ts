// Step 3: Generate polished resume from confirmed selection (smart model).

import {
  ResumeDataSchema,
  type ResumeData,
  type PersonalProfile,
  type ParsedJobDescription,
  type RelevanceSelection,
  type GenerationConfig,
} from '@resu/shared';
import { chatCompletion, type TokenUsage } from './aiClient.js';
import { loadPrompt } from './promptLoader.js';

export interface GenerateResumeResult {
  resumeData: ResumeData;
  tokenUsage: TokenUsage;
  cost: number;
}

export async function generateResume(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  selection: RelevanceSelection,
  config: GenerationConfig,
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
    selection.selectedSkills.includes(s.name),
  );

  const selectedProjects = profile.projects.filter((p) =>
    selection.selectedProjects.includes(p.id),
  );

  const selectedCerts = profile.certifications.filter((c) =>
    selection.selectedCertifications.includes(c.id),
  );

  const userMessage = JSON.stringify(
    {
      contact: profile.contact,
      proposedSummary: selection.proposedSummary,
      selectedExperiences,
      selectedSkills,
      education: profile.education,
      selectedProjects,
      selectedCertifications: selectedCerts,
      parsedJobDescription: parsedJD,
      targetPageLength: config.targetPageLength,
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
    temperature: 0.4,
  });

  const raw = JSON.parse(result.content);
  const normalized = normalizeResumeResponse(raw);
  const validated = ResumeDataSchema.parse(normalized);

  return {
    resumeData: validated,
    tokenUsage: result.tokenUsage,
    cost: result.cost,
  };
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
    summary: raw.summary ?? raw.professionalSummary ?? raw.professional_summary ?? raw.objective ?? '',
    experience: normalizeExperience(raw.experience ?? raw.workExperience ?? raw.work_experience ?? []),
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
      ? e.bullets.map((b: any) => typeof b === 'string' ? b : b.text ?? b.bullet ?? String(b))
      : Array.isArray(e.achievements) ? e.achievements : [],
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
    const hasCategories = skills.length > 0 && typeof skills[0] === 'object' && (skills[0].name || skills[0].category);
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
