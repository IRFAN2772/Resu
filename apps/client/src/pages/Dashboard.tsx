import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listResumes } from '../lib/api';
import styles from './Dashboard.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: listResumes,
  });

  const filtered = (resumes ?? []).filter(
    (r) =>
      r.company.toLowerCase().includes(search.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(search.toLowerCase()),
  );

  function getScoreColor(score: number) {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  }

  function getStatusBadge(status: string) {
    const map: Record<string, string> = {
      draft: 'badge badge-neutral',
      exported: 'badge badge-success',
      archived: 'badge badge-warning',
    };
    return map[status] || 'badge badge-neutral';
  }

  return (
    <div className={styles.dashboard}>
      <h1>Dashboard</h1>
      <p className={styles.subtitle}>All your generated resumes in one place</p>

      <div className={styles['actions-row']}>
        <input
          className={styles['search-input']}
          type="text"
          placeholder="Search by company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => navigate('/generate')}>
          + Generate New
        </button>
      </div>

      {isLoading ? (
        <div className={styles['resume-list']}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 72, borderRadius: 'var(--radius)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles['empty-state']}>
          <h3>{search ? 'No matches found' : 'No resumes yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Generate your first tailored resume'}</p>
          {!search && (
            <Link to="/generate" className="btn btn-primary">
              Generate Resume
            </Link>
          )}
        </div>
      ) : (
        <div className={styles['resume-list']}>
          {filtered.map((resume) => (
            <Link key={resume.id} to={`/resume/${resume.id}`} className={styles['resume-card']}>
              <div className={styles['resume-info']}>
                <span className={styles['resume-company']}>{resume.company}</span>
                <span className={styles['resume-title']}>{resume.jobTitle}</span>
              </div>
              <div className={styles['resume-meta']}>
                <span className={getStatusBadge(resume.status)}>{resume.status}</span>
                <span
                  className={styles['ats-score']}
                  style={{ color: getScoreColor(resume.atsScore) }}
                >
                  ATS: {resume.atsScore}
                </span>
                <span className={styles['resume-date']}>
                  {new Date(resume.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
