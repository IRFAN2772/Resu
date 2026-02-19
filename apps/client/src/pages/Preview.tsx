import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getResume, updateResume, exportResumePDF } from '../lib/api';
import { ATSClassicTemplate } from '../components/templates/ATSClassic';
import { CleanMinimalTemplate } from '../components/templates/CleanMinimal';
import type { ResumeData, CoverLetterData } from '@resu/shared';
import styles from './Preview.module.css';

export function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
  const [editMode, setEditMode] = useState(false);
  const [editCoverLetter, setEditCoverLetter] = useState(false);
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData | null>(null);

  const { data: resume, isLoading } = useQuery({
    queryKey: ['resume', id],
    queryFn: () => getResume(id!),
    enabled: !!id,
  });

  // ─── PDF Export ───
  const handleExport = useCallback(async () => {
    if (!id) return;
    try {
      const blob = await exportResumePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume?.company ?? 'resume'}-${resume?.jobTitle ?? 'resume'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported!');
      queryClient.invalidateQueries({ queryKey: ['resume', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  }, [id, resume, queryClient]);

  // ─── Cover Letter PDF Export ───
  const handleExportCoverLetter = useCallback(async () => {
    if (!id) return;
    try {
      const blob = await exportResumePDF(id, { type: 'cover-letter', pageSize: 'letter' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume?.company ?? 'cover-letter'}-${resume?.jobTitle ?? 'cover-letter'}-cover-letter.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Cover letter PDF exported!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  }, [id, resume]);

  // ─── Save edits ───
  const handleSave = useCallback(
    async (updatedData: ResumeData) => {
      if (!id) return;
      try {
        await updateResume(id, { resumeData: updatedData, changeDescription: 'Manual edit' });
        toast.success('Changes saved');
        queryClient.invalidateQueries({ queryKey: ['resume', id] });
        setEditMode(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed');
      }
    },
    [id, queryClient],
  );

  // ─── Save cover letter edits ───
  const handleCoverLetterSave = useCallback(async () => {
    if (!id || !coverLetterData) return;
    try {
      await updateResume(id, {
        coverLetter: coverLetterData,
        changeDescription: 'Cover letter edit',
      });
      toast.success('Cover letter saved');
      queryClient.invalidateQueries({ queryKey: ['resume', id] });
      setEditCoverLetter(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }, [id, coverLetterData, queryClient]);

  const startEditCoverLetter = useCallback(() => {
    if (resume?.coverLetter) {
      setCoverLetterData({ ...resume.coverLetter });
      setEditCoverLetter(true);
    }
  }, [resume]);

  const updateCLField = (field: 'opening' | 'closing', value: string) => {
    if (coverLetterData) setCoverLetterData({ ...coverLetterData, [field]: value });
  };

  const updateCLParagraph = (idx: number, value: string) => {
    if (!coverLetterData) return;
    const newBody = [...coverLetterData.bodyParagraphs];
    newBody[idx] = value;
    setCoverLetterData({ ...coverLetterData, bodyParagraphs: newBody });
  };

  if (isLoading || !resume) {
    return (
      <div className={styles['loading-page']}>
        <div className="skeleton" style={{ height: 40, width: 300 }} />
        <div className="skeleton" style={{ height: 600 }} />
      </div>
    );
  }

  const TemplateComponent =
    resume.templateId === 'clean-minimal' ? CleanMinimalTemplate : ATSClassicTemplate;

  function getScoreColor(score: number) {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  }

  return (
    <div className={styles['preview-page']}>
      {/* Main content */}
      <div className={styles['preview-main']}>
        {/* Tabs */}
        <div className={styles['preview-tabs']}>
          <button
            className={`${styles['preview-tab']} ${activeTab === 'resume' ? styles.active : ''}`}
            onClick={() => setActiveTab('resume')}
          >
            Resume
          </button>
          <button
            className={`${styles['preview-tab']} ${activeTab === 'cover-letter' ? styles.active : ''}`}
            onClick={() => setActiveTab('cover-letter')}
          >
            Cover Letter
          </button>
        </div>

        {/* Resume Preview */}
        {activeTab === 'resume' && (
          <div className={styles['resume-preview']}>
            <TemplateComponent
              data={resume.resumeData}
              mode={editMode ? 'edit' : 'preview'}
              onSave={handleSave}
            />
          </div>
        )}

        {/* Cover Letter Preview */}
        {activeTab === 'cover-letter' && resume.coverLetter && (
          <div className={styles['cover-letter-preview']}>
            {editCoverLetter && coverLetterData ? (
              <>
                <label className={styles['cl-label']}>Opening</label>
                <textarea
                  className={styles['cl-textarea']}
                  value={coverLetterData.opening}
                  onChange={(e) => updateCLField('opening', e.target.value)}
                  rows={3}
                />

                {coverLetterData.bodyParagraphs.map((p, i) => (
                  <div key={i}>
                    <label className={styles['cl-label']}>Body Paragraph {i + 1}</label>
                    <textarea
                      className={styles['cl-textarea']}
                      value={p}
                      onChange={(e) => updateCLParagraph(i, e.target.value)}
                      rows={4}
                    />
                  </div>
                ))}

                <label className={styles['cl-label']}>Closing</label>
                <textarea
                  className={styles['cl-textarea']}
                  value={coverLetterData.closing}
                  onChange={(e) => updateCLField('closing', e.target.value)}
                  rows={3}
                />

                <div className={styles['cl-actions']}>
                  <button className="btn btn-primary btn-sm" onClick={handleCoverLetterSave}>
                    Save Changes
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditCoverLetter(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{resume.coverLetter.opening}</p>
                {resume.coverLetter.bodyParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <p>{resume.coverLetter.closing}</p>
                <div className={styles['cl-actions']}>
                  <button className="btn btn-primary btn-sm" onClick={handleExportCoverLetter}>
                    Download Cover Letter PDF
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={startEditCoverLetter}>
                    Edit Cover Letter
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={styles.sidebar}>
        {/* Actions */}
        <div className={styles['sidebar-card']}>
          <div className={styles['sidebar-card-header']}>Actions</div>
          <div className={styles['sidebar-card-body']}>
            <div className={styles['sidebar-actions']}>
              <button className="btn btn-primary" onClick={handleExport} style={{ width: '100%' }}>
                Export PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setEditMode(!editMode)}
                style={{ width: '100%' }}
              >
                {editMode ? 'Cancel Edit' : 'Edit Resume'}
              </button>
            </div>
          </div>
        </div>

        {/* ATS Score */}
        <div className={styles['sidebar-card']}>
          <div className={styles['sidebar-card-header']}>ATS Score</div>
          <div className={styles['sidebar-card-body']}>
            <div className={styles['ats-score-display']}>
              <div
                className={styles['ats-score-number']}
                style={{ color: getScoreColor(resume.atsScore.score) }}
              >
                {resume.atsScore.score}
              </div>
              <div className={styles['ats-score-label']}>out of 100</div>
            </div>
            <div className={styles['ats-breakdown']}>
              {[
                { label: 'Keywords', value: resume.atsScore.keywordMatch },
                { label: 'Sections', value: resume.atsScore.sectionScore },
                { label: 'Format', value: resume.atsScore.formatScore },
              ].map((item) => (
                <div key={item.label}>
                  <div className={styles['ats-breakdown-item']}>
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className={styles['ats-breakdown-bar']}>
                    <div
                      className={styles['ats-breakdown-fill']}
                      style={{
                        width: `${item.value}%`,
                        background: getScoreColor(item.value),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {resume.atsScore.suggestions.length > 0 && (
          <div className={styles['sidebar-card']}>
            <div className={styles['sidebar-card-header']}>
              Suggestions ({resume.atsScore.suggestions.length})
            </div>
            <div className={styles['sidebar-card-body']}>
              <div className={styles['suggestions-list']}>
                {resume.atsScore.suggestions.map((s, i) => (
                  <div key={i} className={`${styles.suggestion} ${styles[s.severity]}`}>
                    {s.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Version History */}
        {resume.versions.length > 0 && (
          <div className={styles['sidebar-card']}>
            <div className={styles['sidebar-card-header']}>
              Version History ({resume.versions.length})
            </div>
            <div className={styles['sidebar-card-body']}>
              <div className={styles['version-list']}>
                {resume.versions.map((v) => (
                  <div key={v.id} className={styles['version-item']}>
                    <div>{v.changeDescription}</div>
                    <div className={styles['version-date']}>
                      {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
