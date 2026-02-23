// ─── Pre-generation ATS Preview ───
// Computes a projected ATS keyword coverage from the user's selection
// BEFORE the resume is generated, so they can fill gaps at the review step.

import type { ParsedJobDescription, RelevanceSelection } from '@resu/shared';

export interface ATSGapItem {
  keyword: string;
  category: 'required' | 'preferred' | 'keyword' | 'techStack';
}

export interface ATSPreviewResult {
  projectedScore: number; // 0–100 estimated keyword match %
  totalKeywords: number;
  matchedCount: number;
  matchedKeywords: string[];
  missingRequired: ATSGapItem[];
  missingPreferred: ATSGapItem[];
  missingOther: ATSGapItem[];
}

/* ── Normalization (mirrors server atsScorer logic) ── */

function normalizeForATS(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[+#./@&*,;:!?'"\\]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordMatches(normalizedText: string, rawKeyword: string): boolean {
  const normalized = normalizeForATS(rawKeyword);
  if (!normalized) return true;

  if (normalizedText.includes(normalized)) return true;

  const kwTokens = normalized.split(' ').filter((t) => t.length > 0);
  if (kwTokens.length === 0) return true;

  const textWords = normalizedText.split(' ');
  return kwTokens.every((token) => {
    if (token.length <= 2) return textWords.includes(token);
    return textWords.some((w) => w.includes(token));
  });
}

/* ── Public API ── */

export function computeATSPreview(
  parsedJD: ParsedJobDescription,
  selection: RelevanceSelection,
): ATSPreviewResult {
  // Build a "projected resume text" from what the user has selected
  const textParts: string[] = [selection.proposedSummary];

  for (const se of selection.selectedExperiences) {
    if (!se.include) continue;
    for (const bullet of se.selectedBullets) {
      textParts.push(bullet.originalText);
    }
  }

  textParts.push(...selection.selectedSkills);
  // Project/certification IDs aren't textual, but skills + bullets + summary
  // cover the vast majority of keyword matches.

  const normalizedText = normalizeForATS(textParts.join(' '));

  // Build a map from lowercased key → original-cased keyword
  // so gap items preserve proper casing for display & skill insertion.
  const requiredSet = new Set(parsedJD.requiredSkills.map((s) => s.toLowerCase().trim()));
  const preferredSet = new Set(parsedJD.preferredSkills.map((s) => s.toLowerCase().trim()));

  const originalCaseMap = new Map<string, string>();
  for (const k of [
    ...parsedJD.requiredSkills,
    ...parsedJD.preferredSkills,
    ...parsedJD.keywords,
    ...parsedJD.techStack,
  ]) {
    const lower = k.toLowerCase().trim();
    if (!originalCaseMap.has(lower)) originalCaseMap.set(lower, k);
  }

  const allKeywords = new Set(originalCaseMap.keys());

  const matchedKeywords: string[] = [];
  const missingRequired: ATSGapItem[] = [];
  const missingPreferred: ATSGapItem[] = [];
  const missingOther: ATSGapItem[] = [];

  for (const kw of allKeywords) {
    const original = originalCaseMap.get(kw) ?? kw;
    if (keywordMatches(normalizedText, kw)) {
      matchedKeywords.push(original);
    } else {
      const category = requiredSet.has(kw)
        ? 'required'
        : preferredSet.has(kw)
          ? 'preferred'
          : 'keyword';
      const item: ATSGapItem = { keyword: original, category };
      if (category === 'required') missingRequired.push(item);
      else if (category === 'preferred') missingPreferred.push(item);
      else missingOther.push(item);
    }
  }

  const totalKeywords = allKeywords.size;
  const matchedCount = matchedKeywords.length;
  const projectedScore = totalKeywords > 0 ? Math.round((matchedCount / totalKeywords) * 100) : 100;

  return {
    projectedScore,
    totalKeywords,
    matchedCount,
    matchedKeywords,
    missingRequired,
    missingPreferred,
    missingOther,
  };
}
