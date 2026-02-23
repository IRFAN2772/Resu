// Step 4: ATS Scoring — pure code, no LLM needed.

import type { ResumeData, ParsedJobDescription, ATSScoreResult, ATSSuggestion } from '@resu/shared';

/**
 * Normalize text for ATS comparison:
 * - lowercase
 * - strip parentheses, brackets, and special characters
 * - collapse whitespace
 */
function normalizeForATS(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[+#./@&*,;:!?'"\\]/g, ' ')
    .replace(/\-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a single JD keyword matches the resume text using fuzzy rules:
 * 1. Direct substring match after normalization
 * 2. Token-level match: every word in the keyword appears in the resume
 *    - Short tokens (≤2 chars) require exact word match
 *    - Longer tokens (≥3 chars) allow substring match (e.g., "rest" in "restful")
 */
function keywordMatches(normalizedResumeText: string, rawKeyword: string): boolean {
  const normalized = normalizeForATS(rawKeyword);
  if (!normalized) return true; // empty keyword counts as matched

  // 1. Direct normalized substring match
  if (normalizedResumeText.includes(normalized)) return true;

  // 2. Token-level fuzzy matching
  const kwTokens = normalized.split(' ').filter((t) => t.length > 0);
  if (kwTokens.length === 0) return true;

  const resumeWords = normalizedResumeText.split(' ');
  return kwTokens.every((token) => {
    // Short tokens (like "go", "js", "c") — require exact word match
    if (token.length <= 2) {
      return resumeWords.includes(token);
    }
    // Longer tokens — allow substring match (e.g., "rest" found inside "restful")
    return resumeWords.some((rw) => rw.includes(token));
  });
}

export function scoreATS(resumeData: ResumeData, parsedJD: ParsedJobDescription): ATSScoreResult {
  const suggestions: ATSSuggestion[] = [];

  // ─── 1. Keyword Match Score ───
  const jdKeywords = new Set(
    [
      ...parsedJD.requiredSkills,
      ...parsedJD.preferredSkills,
      ...parsedJD.keywords,
      ...parsedJD.techStack,
    ].map((k) => k.toLowerCase().trim()),
  );

  // Flatten all resume text and normalize for comparison
  const resumeText = normalizeForATS(
    [
      resumeData.summary,
      ...resumeData.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
      ...resumeData.skills.categories.flatMap((c) => c.skills),
      ...resumeData.projects.flatMap((p) => [p.name, p.description, ...p.highlights]),
      ...resumeData.certifications.map((c) => c.name),
    ].join(' '),
  );

  let matchedKeywords = 0;
  const missingKeywords: string[] = [];
  for (const keyword of jdKeywords) {
    if (keywordMatches(resumeText, keyword)) {
      matchedKeywords++;
    } else {
      missingKeywords.push(keyword);
    }
  }

  const keywordMatch =
    jdKeywords.size > 0 ? Math.round((matchedKeywords / jdKeywords.size) * 100) : 100;

  if (missingKeywords.length > 0) {
    // Only suggest top 5 missing required skills
    const missingRequired = missingKeywords.filter((k) =>
      parsedJD.requiredSkills.map((s) => s.toLowerCase()).includes(k),
    );
    if (missingRequired.length > 0) {
      suggestions.push({
        type: 'keyword',
        severity: 'critical',
        message: `Missing required keywords: ${missingRequired.slice(0, 5).join(', ')}`,
      });
    }

    const missingPreferred = missingKeywords.filter(
      (k) => !parsedJD.requiredSkills.map((s) => s.toLowerCase()).includes(k),
    );
    if (missingPreferred.length > 0) {
      suggestions.push({
        type: 'keyword',
        severity: 'warning',
        message: `Missing preferred keywords: ${missingPreferred.slice(0, 5).join(', ')}`,
      });
    }
  }

  // ─── 2. Section Score ───
  let sectionScore = 100;
  const expectedSections = ['summary', 'experience', 'education', 'skills'];
  const hasSummary = resumeData.summary.length > 0;
  const hasExperience = resumeData.experience.length > 0;
  const hasEducation = resumeData.education.length > 0;
  const hasSkills = resumeData.skills.categories.length > 0;

  const sectionChecks = [
    { name: 'Summary', present: hasSummary },
    { name: 'Experience', present: hasExperience },
    { name: 'Education', present: hasEducation },
    { name: 'Skills', present: hasSkills },
  ];

  for (const section of sectionChecks) {
    if (!section.present) {
      sectionScore -= 25;
      suggestions.push({
        type: 'section',
        severity: 'critical',
        message: `Missing "${section.name}" section — most ATS systems expect this`,
      });
    }
  }

  // ─── 3. Format Score ───
  let formatScore = 100;

  // Check bullet density per role
  for (const exp of resumeData.experience) {
    if (exp.bullets.length < 2) {
      formatScore -= 10;
      suggestions.push({
        type: 'density',
        severity: 'warning',
        message: `"${exp.title} @ ${exp.company}" has only ${exp.bullets.length} bullet(s) — aim for 3-5`,
      });
    }
    if (exp.bullets.length > 8) {
      formatScore -= 5;
      suggestions.push({
        type: 'density',
        severity: 'info',
        message: `"${exp.title} @ ${exp.company}" has ${exp.bullets.length} bullets — consider trimming to 5-6`,
      });
    }
  }

  // Check total resume length estimation (rough: ~6 bullets per page)
  const totalBullets = resumeData.experience.reduce((sum, e) => sum + e.bullets.length, 0);
  const estimatedPages = Math.ceil(totalBullets / 6);
  if (estimatedPages > 2) {
    formatScore -= 10;
    suggestions.push({
      type: 'length',
      severity: 'warning',
      message: `Resume may be too long (~${estimatedPages} pages estimated). Consider trimming.`,
    });
  }

  // Check for date presence
  for (const exp of resumeData.experience) {
    if (!exp.startDate) {
      formatScore -= 5;
      suggestions.push({
        type: 'format',
        severity: 'warning',
        message: `"${exp.title} @ ${exp.company}" is missing a start date`,
      });
    }
  }

  formatScore = Math.max(0, formatScore);

  // ─── Compute final score ───
  const score = Math.round(keywordMatch * 0.5 + sectionScore * 0.3 + formatScore * 0.2);

  return {
    score: Math.min(100, Math.max(0, score)),
    keywordMatch,
    sectionScore: Math.max(0, sectionScore),
    formatScore,
    suggestions,
  };
}
