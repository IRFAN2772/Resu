import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getResume, updateResume, exportResumePDF, listTemplates } from '../lib/api';
import { ATSClassicTemplate } from '../components/templates/ATSClassic';
import { CleanMinimalTemplate } from '../components/templates/CleanMinimal';
import { ModernTwoColumnTemplate } from '../components/templates/ModernTwoColumn';
import { ExecutiveTemplate } from '../components/templates/Executive';
import type { ResumeData, CoverLetterData } from '@resu/shared';
import styles from './Preview.module.css';

const TEMPLATE_MAP: Record<string, typeof ATSClassicTemplate> = {
  'ats-classic': ATSClassicTemplate,
  'clean-minimal': CleanMinimalTemplate,
  'modern-two-column': ModernTwoColumnTemplate,
  executive: ExecutiveTemplate,
};

function getScoreColor(score: number) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Work';
}

function getScoreEmoji(score: number) {
  if (score >= 90) return '🏆';
  if (score >= 80) return '✅';
  if (score >= 70) return '👍';
  if (score >= 60) return '⚠️';
  return '🔴';
}

export function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
  const [editMode, setEditMode] = useState(false);
  const [editCoverLetter, setEditCoverLetter] = useState(false);
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData | null>(null);
  const [expandedSidebar, setExpandedSidebar] = useState<string | null>('actions');
  const [exporting, setExporting] = useState(false);

  const { data: resume, isLoading } = useQuery({
    queryKey: ['resume', id],
    queryFn: () => getResume(id!),
    enabled: !!id,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
  });

  // ─── Template switching ───
  const handleTemplateChange = useCallback(
    async (templateId: string) => {
      if (!id || templateId === resume?.templateId) return;
      try {
        await updateResume(id, {
          templateId,
          changeDescription: `Switched template to ${templateId}`,
        });
        queryClient.invalidateQueries({ queryKey: ['resume', id] });
        toast.success('Template updated');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Template switch failed');
      }
    },
    [id, resume?.templateId, queryClient],
  );

  // ─── PDF Export ───
  const handleExport = useCallback(async () => {
    if (!id) return;
    setExporting(true);
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
    } finally {
      setExporting(false);
    }
  }, [id, resume, queryClient]);

  // ─── Cover Letter PDF Export ───
  const handleExportCoverLetter = useCallback(async () => {
    if (!id) return;
    setExporting(true);
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
    } finally {
      setExporting(false);
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

  // ─── Restore a version ───
  const handleRestoreVersion = useCallback(
    async (version: { id: string; resumeData: ResumeData; changeDescription: string }) => {
      if (!id) return;
      try {
        await updateResume(id, {
          resumeData: version.resumeData,
          changeDescription: `Restored from: ${version.changeDescription}`,
        });
        toast.success('Version restored');
        queryClient.invalidateQueries({ queryKey: ['resume', id] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Restore failed');
      }
    },
    [id, queryClient],
  );

  const updateCLField = (field: 'opening' | 'closing', value: string) => {
    if (coverLetterData) setCoverLetterData({ ...coverLetterData, [field]: value });
  };

  const updateCLParagraph = (idx: number, value: string) => {
    if (!coverLetterData) return;
    const newBody = [...coverLetterData.bodyParagraphs];
    newBody[idx] = value;
    setCoverLetterData({ ...coverLetterData, bodyParagraphs: newBody });
  };

  const toggleSidebar = (section: string) => {
    setExpandedSidebar(expandedSidebar === section ? null : section);
  };

  if (isLoading || !resume) {
    return (
      <div className={styles['loading-page']}>
        <div className={styles['loading-skeleton-header']} />
        <div className={styles['loading-skeleton-body']} />
      </div>
    );
  }

  const TemplateComponent = TEMPLATE_MAP[resume.templateId] || ATSClassicTemplate;
  const atsScore = resume.atsScore;
  const scoreColor = getScoreColor(atsScore.score);

  return (
    <div className={styles['preview-page']}>
      {/* ─── Top Bar ─── */}
      <div className={styles['top-bar']}>
        <div className={styles['top-bar-left']}>
          <button className={styles['back-btn']} onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Dashboard
          </button>
          <div className={styles['top-bar-meta']}>
            <h1 className={styles['top-bar-title']}>
              {resume.resumeData.contact.name || 'Resume'}
            </h1>
            <div className={styles['top-bar-subtitle']}>
              {resume.jobTitle && <span>{resume.jobTitle}</span>}
              {resume.company && <span className={styles['meta-separator']}>at</span>}
              {resume.company && <span className={styles['company-name']}>{resume.company}</span>}
            </div>
          </div>
        </div>

        <div className={styles['top-bar-right']}>
          {/* ATS Score Pill */}
          <div className={styles['ats-pill']} style={{ borderColor: scoreColor }}>
            <span className={styles['ats-pill-emoji']}>{getScoreEmoji(atsScore.score)}</span>
            <span className={styles['ats-pill-score']} style={{ color: scoreColor }}>
              {atsScore.score}
            </span>
            <span className={styles['ats-pill-label']}>ATS</span>
          </div>

          {activeTab === 'resume' && (
            <>
              <button
                className={`${styles['action-btn']} ${editMode ? styles['action-btn-active'] : ''}`}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M12 4L4 12M4 4L12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {editMode ? 'Cancel' : 'Edit'}
              </button>
              <button
                className={`${styles['action-btn']} ${styles['action-btn-primary']}`}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <span className={styles['btn-spinner']} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 10V13H14V10M8 2V10M8 10L5 7M8 10L11 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                Export PDF
              </button>
            </>
          )}

          {activeTab === 'cover-letter' && resume.coverLetter && (
            <>
              {editCoverLetter ? (
                <>
                  <button
                    className={`${styles['action-btn']} ${styles['action-btn-primary']}`}
                    onClick={handleCoverLetterSave}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8L6.5 11.5L13 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Save
                  </button>
                  <button
                    className={styles['action-btn']}
                    onClick={() => setEditCoverLetter(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className={styles['action-btn']} onClick={startEditCoverLetter}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Edit
                  </button>
                  <button
                    className={`${styles['action-btn']} ${styles['action-btn-primary']}`}
                    onClick={handleExportCoverLetter}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <span className={styles['btn-spinner']} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 10V13H14V10M8 2V10M8 10L5 7M8 10L11 7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    Export PDF
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className={styles['content-area']}>
        {/* ─── Sidebar ─── */}
        <aside className={styles.sidebar}>
          {/* Tab Switcher */}
          <div className={styles['sidebar-tabs']}>
            <button
              className={`${styles['sidebar-tab']} ${activeTab === 'resume' ? styles['sidebar-tab-active'] : ''}`}
              onClick={() => setActiveTab('resume')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="1"
                  width="12"
                  height="14"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 5H11M5 8H11M5 11H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Resume
            </button>
            <button
              className={`${styles['sidebar-tab']} ${activeTab === 'cover-letter' ? styles['sidebar-tab-active'] : ''}`}
              onClick={() => setActiveTab('cover-letter')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4L8 9L14 4M2 4V12H14V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Cover Letter
            </button>
          </div>

          {/* ATS Score Card */}
          <div className={styles['ats-card']} onClick={() => toggleSidebar('ats')}>
            <div className={styles['ats-card-header']}>
              <div className={styles['ats-ring-container']}>
                <svg className={styles['ats-ring']} viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(atsScore.score / 100) * 213.6} 213.6`}
                    transform="rotate(-90 40 40)"
                    className={styles['ats-ring-progress']}
                  />
                </svg>
                <div className={styles['ats-ring-text']}>
                  <span className={styles['ats-ring-score']} style={{ color: scoreColor }}>
                    {atsScore.score}
                  </span>
                </div>
              </div>
              <div className={styles['ats-meta']}>
                <span className={styles['ats-label']}>ATS Score</span>
                <span className={styles['ats-verdict']} style={{ color: scoreColor }}>
                  {getScoreLabel(atsScore.score)}
                </span>
              </div>
              <svg
                className={`${styles['chevron']} ${expandedSidebar === 'ats' ? styles['chevron-open'] : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {expandedSidebar === 'ats' && (
              <div className={styles['ats-card-body']} onClick={(e) => e.stopPropagation()}>
                <div className={styles['ats-bars']}>
                  {[
                    { label: 'Keywords', value: atsScore.keywordMatch, icon: '🔑' },
                    { label: 'Sections', value: atsScore.sectionScore, icon: '📋' },
                    { label: 'Format', value: atsScore.formatScore, icon: '✨' },
                  ].map((item) => (
                    <div key={item.label} className={styles['ats-bar-row']}>
                      <div className={styles['ats-bar-label']}>
                        <span>
                          {item.icon} {item.label}
                        </span>
                        <span style={{ color: getScoreColor(item.value), fontWeight: 600 }}>
                          {item.value}%
                        </span>
                      </div>
                      <div className={styles['ats-bar-track']}>
                        <div
                          className={styles['ats-bar-fill']}
                          style={{ width: `${item.value}%`, background: getScoreColor(item.value) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {atsScore.suggestions.length > 0 && (
                  <div className={styles['ats-suggestions']}>
                    <div className={styles['ats-suggestions-title']}>Suggestions</div>
                    {atsScore.suggestions.map((s, i) => (
                      <div
                        key={i}
                        className={`${styles['ats-suggestion']} ${styles[`ats-suggestion-${s.severity}`]}`}
                      >
                        <span className={styles['ats-suggestion-icon']}>
                          {s.severity === 'critical'
                            ? '🔴'
                            : s.severity === 'warning'
                              ? '🟡'
                              : '🔵'}
                        </span>
                        {s.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Template Selector */}
          {templates && templates.length > 0 && activeTab === 'resume' && (
            <div className={styles['sidebar-section']}>
              <button
                className={styles['sidebar-section-header']}
                onClick={() => toggleSidebar('templates')}
              >
                <span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="1"
                      y="1"
                      width="6"
                      height="6"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="9"
                      y="1"
                      width="6"
                      height="6"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="1"
                      y="9"
                      width="6"
                      height="6"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="9"
                      y="9"
                      width="6"
                      height="6"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Templates
                </span>
                <svg
                  className={`${styles['chevron']} ${expandedSidebar === 'templates' ? styles['chevron-open'] : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {expandedSidebar === 'templates' && (
                <div className={styles['sidebar-section-body']}>
                  <div className={styles['template-grid']}>
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        className={`${styles['template-card']} ${resume.templateId === t.id ? styles['template-card-active'] : ''}`}
                        onClick={() => handleTemplateChange(t.id)}
                      >
                        <div className={styles['template-card-preview']}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <rect
                              x="3"
                              y="2"
                              width="18"
                              height="20"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M7 7H17M7 11H17M7 15H13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <span className={styles['template-card-name']}>{t.name}</span>
                        {resume.templateId === t.id && (
                          <span className={styles['template-check']}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3 8L6.5 11.5L13 4.5"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Version History */}
          {resume.versions.length > 0 && (
            <div className={styles['sidebar-section']}>
              <button
                className={styles['sidebar-section-header']}
                onClick={() => toggleSidebar('versions')}
              >
                <span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M8 4.5V8L10.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  History
                  <span className={styles['history-count']}>{resume.versions.length}</span>
                </span>
                <svg
                  className={`${styles['chevron']} ${expandedSidebar === 'versions' ? styles['chevron-open'] : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {expandedSidebar === 'versions' && (
                <div className={styles['sidebar-section-body']}>
                  <div className={styles['version-timeline']}>
                    {resume.versions.map((v, i) => (
                      <div key={v.id} className={styles['version-entry']}>
                        <div className={styles['version-dot-line']}>
                          <div className={styles['version-dot']} />
                          {i < resume.versions.length - 1 && (
                            <div className={styles['version-line']} />
                          )}
                        </div>
                        <div className={styles['version-content']}>
                          <div className={styles['version-desc']}>{v.changeDescription}</div>
                          <div className={styles['version-time']}>
                            {new Date(v.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <button
                            className={styles['version-restore-btn']}
                            onClick={() => handleRestoreVersion(v)}
                          >
                            Restore this version
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ─── Main Content ─── */}
        <main className={styles['preview-main']}>
          {/* Edit mode banner */}
          {editMode && activeTab === 'resume' && (
            <div className={styles['edit-banner']}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                Edit mode — click on any text to edit inline. Changes are auto-saved when you press
                Enter or click away.
              </span>
            </div>
          )}

          {/* Resume Preview */}
          {activeTab === 'resume' && (
            <div className={styles['document-wrapper']}>
              <div className={styles['document-paper']}>
                <TemplateComponent
                  data={resume.resumeData}
                  mode={editMode ? 'edit' : 'preview'}
                  onSave={handleSave}
                />
              </div>
            </div>
          )}

          {/* Cover Letter Preview */}
          {activeTab === 'cover-letter' && resume.coverLetter && (
            <div className={styles['document-wrapper']}>
              <div className={styles['document-paper']}>
                {editCoverLetter && coverLetterData ? (
                  <div className={styles['cl-editor']}>
                    <div className={styles['cl-section']}>
                      <div className={styles['cl-section-label']}>
                        <span className={styles['cl-section-number']}>1</span>
                        Opening Paragraph
                      </div>
                      <textarea
                        className={styles['cl-textarea']}
                        value={coverLetterData.opening}
                        onChange={(e) => updateCLField('opening', e.target.value)}
                        rows={4}
                        placeholder="Write your opening paragraph..."
                      />
                    </div>

                    {coverLetterData.bodyParagraphs.map((p, i) => (
                      <div key={i} className={styles['cl-section']}>
                        <div className={styles['cl-section-label']}>
                          <span className={styles['cl-section-number']}>{i + 2}</span>
                          Body Paragraph {i + 1}
                        </div>
                        <textarea
                          className={styles['cl-textarea']}
                          value={p}
                          onChange={(e) => updateCLParagraph(i, e.target.value)}
                          rows={5}
                          placeholder={`Write body paragraph ${i + 1}...`}
                        />
                      </div>
                    ))}

                    <div className={styles['cl-section']}>
                      <div className={styles['cl-section-label']}>
                        <span className={styles['cl-section-number']}>
                          {coverLetterData.bodyParagraphs.length + 2}
                        </span>
                        Closing Paragraph
                      </div>
                      <textarea
                        className={styles['cl-textarea']}
                        value={coverLetterData.closing}
                        onChange={(e) => updateCLField('closing', e.target.value)}
                        rows={4}
                        placeholder="Write your closing paragraph..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className={styles['cl-preview']}>
                    <div className={styles['cl-date']}>
                      {new Date().toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div className={styles['cl-body']}>
                      <p>{resume.coverLetter.opening}</p>
                      {resume.coverLetter.bodyParagraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                      <p>{resume.coverLetter.closing}</p>
                    </div>
                    <div className={styles['cl-signature']}>
                      <div className={styles['cl-signature-name']}>
                        {resume.resumeData.contact.name}
                      </div>
                      {resume.resumeData.contact.email && (
                        <div className={styles['cl-signature-detail']}>
                          {resume.resumeData.contact.email}
                        </div>
                      )}
                      {resume.resumeData.contact.phone && (
                        <div className={styles['cl-signature-detail']}>
                          {resume.resumeData.contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cover-letter' && !resume.coverLetter && (
            <div className={styles['empty-state']}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path
                  d="M6 12L24 24L42 12M6 12V36H42V12"
                  stroke="var(--text-secondary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3>No Cover Letter</h3>
              <p>Generate a new resume with cover letter enabled to get one.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
