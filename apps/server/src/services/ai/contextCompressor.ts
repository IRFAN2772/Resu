// ─── Context Compressor ───
// Implements Strategy 1 (Context Compression) and Strategy 3 (Progressive Narrowing).
//
// Instead of sending raw objects (parsedJD, profile, etc.) to every AI call,
// we create right-sized compressed context that contains ONLY what each agent needs.
// This cuts 40-50% of token waste from data duplication.

import type {
  ParsedJobDescription,
  PersonalProfile,
  ResumeData,
  ResumeStrategy,
  ResumeCritique,
} from '@resu/shared';

// ─── JD Compression ───

/**
 * Full JD context — used by planning and selection agents that need everything.
 * ~300-400 tokens instead of ~800-1200 for the raw object.
 */
export function compressJDFull(jd: ParsedJobDescription): string {
  const lines: string[] = [
    `Role: ${jd.roleTitle} at ${jd.companyName} (${jd.seniorityLevel})`,
    `Industry: ${jd.industryDomain ?? 'N/A'}`,
    `Required: ${jd.requiredSkills.join(', ')}`,
    `Preferred: ${jd.preferredSkills.join(', ')}`,
    `Keywords: ${jd.keywords.join(', ')}`,
    `Tech Stack: ${jd.techStack.join(', ')}`,
    `Responsibilities: ${jd.responsibilities.slice(0, 5).join('; ')}`,
    `Qualifications: ${jd.qualifications.join('; ')}`,
  ];
  if (jd.niceToHaves.length) lines.push(`Nice-to-haves: ${jd.niceToHaves.join('; ')}`);
  if (jd.teamSize) lines.push(`Team: ${jd.teamSize}`);
  return lines.join('\n');
}

/**
 * Minimal JD context — used by resume generator and cover letter
 * that only need keywords/skills to weave in. ~150-200 tokens.
 */
export function compressJDMinimal(jd: ParsedJobDescription): string {
  return [
    `Role: ${jd.roleTitle} at ${jd.companyName} (${jd.seniorityLevel})`,
    `Required: ${jd.requiredSkills.join(', ')}`,
    `Preferred: ${jd.preferredSkills.join(', ')}`,
    `Keywords: ${jd.keywords.join(', ')}`,
    `Industry: ${jd.industryDomain ?? 'N/A'}`,
  ].join('\n');
}

// ─── Profile Compression ───

/**
 * Full profile text — used by selection agent. ~600-800 tokens instead of ~2000+.
 * Formats experience bullets inline instead of sending the full JSON structure.
 */
export function compressProfileFull(profile: PersonalProfile): string {
  const lines: string[] = [
    `Name: ${profile.contact.name}`,
    `Summary: ${profile.summary.slice(0, 200)}...`,
    '',
    '--- EXPERIENCE ---',
  ];

  for (const exp of profile.experience) {
    lines.push(`[${exp.id}] ${exp.title} @ ${exp.company} (${exp.startDate} - ${exp.endDate ?? 'Present'})`);
    exp.bullets.forEach((b, i) => {
      lines.push(`  [${i}] ${b.text} [tags: ${b.tags.join(',')}] [strength: ${b.strength}]`);
    });
  }

  lines.push('', '--- SKILLS ---');
  lines.push(
    profile.skills
      .map((s) => `${s.name} (${s.proficiency}, ${s.category})${s.aliases.length ? ` aka ${s.aliases.join('/')}` : ''}`)
      .join('; '),
  );

  lines.push('', '--- EDUCATION ---');
  for (const edu of profile.education) {
    lines.push(`[${edu.id}] ${edu.degree} in ${edu.field} @ ${edu.institution} (${edu.startDate} - ${edu.endDate ?? 'Present'})${edu.gpa ? ` GPA: ${edu.gpa}` : ''}`);
    if (edu.highlights.length) lines.push(`  Highlights: ${edu.highlights.join('; ')}`);
  }

  lines.push('', '--- PROJECTS ---');
  for (const proj of profile.projects) {
    lines.push(`[${proj.id}] ${proj.name}: ${proj.description} [tags: ${proj.tags.join(',')}]`);
    if (proj.highlights.length) lines.push(`  ${proj.highlights.join('; ')}`);
  }

  lines.push('', '--- CERTIFICATIONS ---');
  for (const cert of profile.certifications) {
    lines.push(`[${cert.id}] ${cert.name} by ${cert.issuer}${cert.date ? ` (${cert.date})` : ''}`);
  }

  if (profile.achievements.length) {
    lines.push('', '--- ACHIEVEMENTS ---');
    for (const ach of profile.achievements) {
      lines.push(`[${ach.id}] ${ach.title}: ${ach.description}`);
    }
  }

  return lines.join('\n');
}

// ─── Strategy Compression ───

/**
 * Compressed strategy — used by selection and generation agents.
 * ~150-200 tokens instead of ~400-600 for full JSON.
 */
export function compressStrategy(s: ResumeStrategy): string {
  return [
    `Narrative: ${s.narrativeAngle}`,
    `Strengths: ${s.topStrengths.join('; ')}`,
    `Gaps: ${s.gapMitigations.map((g) => `${g.gap} → ${g.mitigation}`).join('; ')}`,
    `Experience priority: ${s.experiencePriority.map((e) => `${e.experienceId}: ${e.keyAngle}`).join('; ')}`,
    `Must-include skills: ${s.skillStrategy.mustInclude.join(', ')}`,
    `Should-include skills: ${s.skillStrategy.shouldInclude.join(', ')}`,
    `Skip: ${s.skillStrategy.skipReasons.map((r) => r.skill).join(', ')}`,
    `Positioning: ${s.positioningStatement}`,
  ].join('\n');
}

// ─── Critique Compression (for revision mode) ───

/**
 * Strategy 4: Delta-Based Revision.
 * Instead of sending the FULL critique + FULL previous resume,
 * extract only the actionable instructions the AI needs to execute.
 * ~200-300 tokens instead of ~2000+ for full critique + resume.
 */
export function compressCritiqueToInstructions(
  critique: ResumeCritique,
  previousResume: ResumeData,
): string {
  const instructions: string[] = ['=== REVISION INSTRUCTIONS (execute ALL) ==='];

  // 1. Missing keywords — most impactful
  if (critique.keywordCoverage.missingCritical.length) {
    instructions.push(
      `ADD MISSING KEYWORDS to skills/bullets: ${critique.keywordCoverage.missingCritical.join(', ')}`,
    );
    if (critique.keywordCoverage.suggestion) {
      instructions.push(`  How: ${critique.keywordCoverage.suggestion}`);
    }
  }

  // 2. Weak bullets — send only the specific fixes
  for (const wb of critique.impactQuality.weakBullets) {
    instructions.push(`FIX BULLET in "${wb.experienceTitle}": "${wb.bulletText}" → "${wb.suggestedFix}"`);
  }

  // 3. Summary rewrite
  if (critique.summaryQuality.suggestedRewrite) {
    instructions.push(`REWRITE SUMMARY: ${critique.summaryQuality.suggestedRewrite}`);
  } else if (critique.summaryQuality.issues.length) {
    instructions.push(`FIX SUMMARY issues: ${critique.summaryQuality.issues.join('; ')}`);
  }

  // 4. Missing foundational skills
  if (critique.skillsAssessment.missingFoundational.length) {
    instructions.push(
      `ADD FOUNDATIONAL SKILLS: ${critique.skillsAssessment.missingFoundational.join(', ')}`,
    );
  }

  // 5. Remove unnecessary skills
  if (critique.skillsAssessment.unnecessarySkills.length) {
    instructions.push(
      `REMOVE IRRELEVANT SKILLS: ${critique.skillsAssessment.unnecessarySkills.join(', ')}`,
    );
  }

  // 6. Critical/high priority improvements only
  const criticalImprovements = critique.improvements.filter(
    (i) => i.priority === 'critical' || i.priority === 'high',
  );
  for (const imp of criticalImprovements) {
    instructions.push(`[${imp.priority.toUpperCase()}] ${imp.area}: ${imp.instruction}`);
  }

  return instructions.join('\n');
}

// ─── Intelligence Brief Compression ───

/**
 * Compressed intelligence brief for later-stage agents that don't
 * need the full analysis. ~150-200 tokens vs ~600-800.
 */
export function compressIntelligenceBrief(brief: string): string {
  // Extract just the strategic directives and key findings
  const lines = brief.split('\n');
  const compressed: string[] = [];
  let inDirectives = false;
  let inCoverage = false;

  for (const line of lines) {
    if (line.includes('JD COVERAGE')) {
      inCoverage = true;
      compressed.push(line);
      continue;
    }
    if (line.includes('STRATEGIC DIRECTIVES')) {
      inDirectives = true;
      compressed.push(line);
      continue;
    }
    if (line.startsWith('===') && !line.includes('STRATEGIC') && !line.includes('COVERAGE')) {
      inCoverage = false;
      inDirectives = false;
      continue;
    }
    if (inCoverage || inDirectives) {
      compressed.push(line);
    }
  }

  // If parsing didn't find sections, return truncated version
  if (compressed.length < 3) {
    return brief.slice(0, 800);
  }

  return compressed.join('\n');
}
