import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/resu.db');

export function initDatabase(): Database.Database {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      job_title TEXT NOT NULL,
      jd_text TEXT NOT NULL,
      parsed_jd TEXT NOT NULL,           -- JSON
      generation_config TEXT NOT NULL,    -- JSON
      relevance_selection TEXT NOT NULL,  -- JSON
      resume_data TEXT NOT NULL,          -- JSON
      cover_letter TEXT,                  -- JSON (nullable)
      template_id TEXT NOT NULL DEFAULT 'ats-classic',
      ats_score TEXT NOT NULL,            -- JSON (ATSScoreResult)
      prompt_version TEXT NOT NULL DEFAULT 'v1',
      token_usage TEXT,                   -- JSON
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'exported', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY,
      resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      resume_data TEXT NOT NULL,          -- JSON snapshot
      change_description TEXT NOT NULL DEFAULT 'Manual edit',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);
    CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(status);
    CREATE INDEX IF NOT EXISTS idx_resumes_company ON resumes(company);
  `);

  return db;
}
