// ─── Profile Enricher ───
// Pre-processing step that enriches the raw profile with inferred data
// from the skill dependency graph BEFORE sending to AI.
// This ensures the AI has complete context about what the user can do.

import type { PersonalProfile, ParsedJobDescription } from '@resu/shared';
import { inferProfileSkills, type ProfileInferences } from './skillGraph.js';

export interface EnrichedProfile {
  /** The original profile, unmodified */
  original: PersonalProfile;
  /** All inferences computed from the skill graph */
  inferences: ProfileInferences;
  /**
   * A condensed "intelligence brief" for the AI — a text summary of
   * what the skill graph found, designed to be prepended to AI prompts.
   */
  intelligenceBrief: string;
}

/**
 * Enrich a user's profile by running the skill dependency graph against the JD.
 * Returns the original profile + computed inferences + a text brief for AI.
 */
export function enrichProfile(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
): EnrichedProfile {
  const inferences = inferProfileSkills(
    profile.skills,
    profile.certifications,
    profile.projects,
    profile.experience,
    parsedJD.keywords,
    parsedJD.requiredSkills,
    parsedJD.preferredSkills,
  );

  const intelligenceBrief = buildIntelligenceBrief(profile, parsedJD, inferences);

  return { original: profile, inferences, intelligenceBrief };
}

/**
 * Build a text brief summarizing the graph analysis for the AI to consume.
 */
function buildIntelligenceBrief(
  profile: PersonalProfile,
  parsedJD: ParsedJobDescription,
  inferences: ProfileInferences,
): string {
  const sections: string[] = [];

  // Section 1: Skill coverage analysis
  sections.push('=== SKILL GRAPH ANALYSIS ===');
  sections.push(`Explicit skills: ${inferences.skills.explicit.join(', ')}`);
  if (inferences.skills.inferred.length > 0) {
    sections.push(
      `Inferred foundational skills (from dependency graph): ${inferences.skills.inferred.join(', ')}`,
    );
    sections.push(
      'IMPORTANT: These inferred skills are REAL competencies — if someone knows React, they know JavaScript. Always include foundational skills when their child frameworks are selected.',
    );
  }

  // Section 2: JD gap analysis
  const matchPct =
    parsedJD.keywords.length > 0
      ? Math.round((inferences.matchedJDSkills.length / parsedJD.keywords.length) * 100)
      : 0;
  sections.push(`\n=== JD COVERAGE: ${matchPct}% ===`);
  sections.push(`Matched JD skills: ${inferences.matchedJDSkills.join(', ')}`);
  if (inferences.missingJDSkills.length > 0) {
    sections.push(
      `Missing JD skills (candidate does NOT have): ${inferences.missingJDSkills.join(', ')}`,
    );
    sections.push(
      'NOTE: Do NOT add skills the candidate does not possess. Focus on maximizing coverage from what they DO have.',
    );
  }

  // Section 3: Certification intelligence
  const relevantCerts = inferences.certifications.filter((c) => c.validatesSkills.length > 0);
  if (relevantCerts.length > 0) {
    sections.push('\n=== CERTIFICATION INTELLIGENCE ===');
    for (const cert of relevantCerts) {
      sections.push(`• "${cert.certName}" validates: ${cert.validatesSkills.join(', ')}`);
    }
    sections.push(
      'IMPORTANT: Include certifications that validate JD-required skills, even if the cert name doesn\'t exactly match a JD keyword. A "JavaScript + DSA" cert is highly relevant for React/Node.js roles because JavaScript is their foundation.',
    );
  }

  // Section 4: Project intelligence
  const relevantProjects = inferences.projects.filter((p) => p.demonstratesSkills.length > 0);
  if (relevantProjects.length > 0) {
    sections.push('\n=== PROJECT INTELLIGENCE ===');
    for (const proj of relevantProjects) {
      sections.push(`• "${proj.projectName}" demonstrates: ${proj.demonstratesSkills.join(', ')}`);
    }
    sections.push(
      'IMPORTANT: Include projects that demonstrate JD-required skills through their tags and technologies, not just by name match.',
    );
  }

  // Section 5: Experience inference
  if (inferences.experiences.length > 0) {
    sections.push('\n=== EXPERIENCE SKILL INFERENCE ===');
    for (const exp of inferences.experiences) {
      const fullExp = profile.experience.find((e) => e.id === exp.experienceId);
      const label = fullExp ? `${fullExp.title} @ ${fullExp.company}` : exp.experienceId;
      sections.push(`• ${label} also demonstrates: ${exp.inferredSkills.join(', ')}`);
    }
  }

  // Section 6: Strategic recommendations
  sections.push('\n=== STRATEGIC DIRECTIVES ===');
  sections.push(
    '1. ALWAYS include foundational language skills when selecting framework skills (React → JavaScript, Node.js → JavaScript, Django → Python)',
  );
  sections.push(
    '2. ALWAYS include certifications that validate ANY JD-required skill through the dependency chain',
  );
  sections.push('3. Select projects that fill skill gaps not covered by work experience');
  sections.push(
    '4. When a JD requires a technology, include ALL profile evidence for it: skills, experience bullets, projects, AND certifications',
  );
  sections.push('5. Treat inferred skills as REAL skills — they represent genuine competency');

  return sections.join('\n');
}
