import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import type {
  ResumeListItem,
  ResumeDetail,
  ResumeData,
  CoverLetterData,
  ATSScoreResult,
  ParsedJobDescription,
  GenerationConfig,
  RelevanceSelection,
} from '@resu/shared';

// ─── Insert a new resume ───
export function insertResume(
  db: Database.Database,
  data: {
    company: string;
    jobTitle: string;
    jdText: string;
    parsedJD: ParsedJobDescription;
    generationConfig: GenerationConfig;
    relevanceSelection: RelevanceSelection;
    resumeData: ResumeData;
    coverLetter: CoverLetterData | null;
    templateId: string;
    atsScore: ATSScoreResult;
    promptVersion: string;
    tokenUsage: Record<string, number>;
  },
): string {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT INTO resumes (id, company, job_title, jd_text, parsed_jd, generation_config, relevance_selection, resume_data, cover_letter, template_id, ats_score, prompt_version, token_usage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.company,
    data.jobTitle,
    data.jdText,
    JSON.stringify(data.parsedJD),
    JSON.stringify(data.generationConfig),
    JSON.stringify(data.relevanceSelection),
    JSON.stringify(data.resumeData),
    data.coverLetter ? JSON.stringify(data.coverLetter) : null,
    data.templateId,
    JSON.stringify(data.atsScore),
    data.promptVersion,
    JSON.stringify(data.tokenUsage),
  );

  return id;
}

// ─── List all resumes ───
export function listResumes(db: Database.Database): ResumeListItem[] {
  const rows = db
    .prepare(
      `SELECT id, company, job_title, ats_score, status, template_id, created_at, updated_at
       FROM resumes ORDER BY created_at DESC`,
    )
    .all() as Array<{
    id: string;
    company: string;
    job_title: string;
    ats_score: string;
    status: string;
    template_id: string;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    company: r.company,
    jobTitle: r.job_title,
    atsScore: (JSON.parse(r.ats_score) as ATSScoreResult).score,
    status: r.status as 'draft' | 'exported' | 'archived',
    templateId: r.template_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// ─── Get a single resume with version history ───
export function getResume(db: Database.Database, id: string): ResumeDetail | null {
  const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id) as
    | Record<string, string>
    | undefined;

  if (!row) return null;

  const versions = db
    .prepare(
      'SELECT id, resume_data, change_description, created_at FROM resume_versions WHERE resume_id = ? ORDER BY created_at DESC',
    )
    .all(id) as Array<{
    id: string;
    resume_data: string;
    change_description: string;
    created_at: string;
  }>;

  return {
    id: row.id,
    company: row.company,
    jobTitle: row.job_title,
    jdText: row.jd_text,
    parsedJD: JSON.parse(row.parsed_jd),
    generationConfig: JSON.parse(row.generation_config),
    relevanceSelection: JSON.parse(row.relevance_selection),
    resumeData: JSON.parse(row.resume_data),
    coverLetter: row.cover_letter ? JSON.parse(row.cover_letter) : null,
    atsScore: JSON.parse(row.ats_score),
    templateId: row.template_id,
    promptVersion: row.prompt_version,
    status: row.status as 'draft' | 'exported' | 'archived',
    tokenUsage: row.token_usage ? JSON.parse(row.token_usage) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versions: versions.map((v) => ({
      id: v.id,
      resumeData: JSON.parse(v.resume_data),
      changeDescription: v.change_description,
      createdAt: v.created_at,
    })),
  };
}

// ─── Update a resume (creates a version snapshot first) ───
export function updateResume(
  db: Database.Database,
  id: string,
  updates: {
    resumeData?: ResumeData;
    coverLetter?: CoverLetterData;
    templateId?: string;
    status?: string;
    changeDescription?: string;
  },
): boolean {
  const existing = db
    .prepare('SELECT resume_data FROM resumes WHERE id = ?')
    .get(id) as { resume_data: string } | undefined;

  if (!existing) return false;

  // Create version snapshot of current state before updating
  if (updates.resumeData) {
    const versionId = uuid();
    db.prepare(
      'INSERT INTO resume_versions (id, resume_id, resume_data, change_description) VALUES (?, ?, ?, ?)',
    ).run(versionId, id, existing.resume_data, updates.changeDescription || 'Manual edit');
  }

  // Build dynamic update
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const values: unknown[] = [];

  if (updates.resumeData) {
    sets.push('resume_data = ?');
    values.push(JSON.stringify(updates.resumeData));
  }
  if (updates.coverLetter) {
    sets.push('cover_letter = ?');
    values.push(JSON.stringify(updates.coverLetter));
  }
  if (updates.templateId) {
    sets.push('template_id = ?');
    values.push(updates.templateId);
  }
  if (updates.status) {
    sets.push('status = ?');
    values.push(updates.status);
  }

  values.push(id);
  db.prepare(`UPDATE resumes SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  return true;
}

// ─── Delete a resume ───
export function deleteResume(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM resumes WHERE id = ?').run(id);
  return result.changes > 0;
}
