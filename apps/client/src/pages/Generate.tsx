import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGenerationStore, type PipelineStage } from '../stores/generationStore';
import { parseJD, confirmGeneration, listTemplates } from '../lib/api';
import type { RelevanceSelection, SelectedBullet, GenerationConfig } from '@resu/shared';
import styles from './Generate.module.css';

export function GeneratePage() {
  const navigate = useNavigate();
  const store = useGenerationStore();
  const [showOptions, setShowOptions] = useState(false);

  // Local editable copy of selection for the checkpoint
  const [editableSelection, setEditableSelection] = useState<RelevanceSelection | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
  });

  // ─── Step 1+2: Parse JD ───
  const handleAnalyze = useCallback(async () => {
    if (store.jdText.trim().length < 50) {
      toast.error('Job description must be at least 50 characters');
      return;
    }

    try {
      store.setStage('parsing');
      const result = await parseJD({
        jdText: store.jdText,
        config: store.config,
      });

      store.setParsedJD(result.parsedJD);
      store.setRelevanceSelection(result.relevanceSelection);
      setEditableSelection(result.relevanceSelection);
      store.setStage('reviewing');
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to analyze JD');
      toast.error('Failed to analyze job description');
    }
  }, [store]);

  // ─── Step 3+4+5: Confirm and generate ───
  const handleConfirmAndGenerate = useCallback(async () => {
    if (!store.parsedJD || !editableSelection) return;

    try {
      store.setStage('generating');
      const result = await confirmGeneration({
        jdText: store.jdText,
        parsedJD: store.parsedJD,
        relevanceSelection: editableSelection,
        config: store.config,
      });

      store.setResumeData(result.resumeData);
      store.setCoverLetter(result.coverLetter);
      store.setATSScore(result.atsScore);
      store.setResumeId(result.id);
      store.setStage('complete');

      toast.success('Resume generated successfully!');
      navigate(`/resume/${result.id}`);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to generate resume');
      toast.error('Failed to generate resume');
    }
  }, [store, editableSelection, navigate]);

  // ─── Toggle bullet selection ───
  const toggleBullet = (expId: string, bulletIdx: number) => {
    if (!editableSelection) return;
    setEditableSelection({
      ...editableSelection,
      selectedExperiences: editableSelection.selectedExperiences.map((se) => {
        if (se.experienceId !== expId) return se;
        const bulletExists = se.selectedBullets.some((b) => b.bulletIndex === bulletIdx);
        return {
          ...se,
          selectedBullets: bulletExists
            ? se.selectedBullets.filter((b) => b.bulletIndex !== bulletIdx)
            : [
                ...se.selectedBullets,
                {
                  experienceId: expId,
                  bulletIndex: bulletIdx,
                  originalText: '',
                  relevanceScore: 50,
                  matchedKeywords: [],
                } as SelectedBullet,
              ],
        };
      }),
    });
  };

  // ─── Toggle skill selection ───
  const toggleSkill = (skillName: string) => {
    if (!editableSelection) return;
    const exists = editableSelection.selectedSkills.includes(skillName);
    setEditableSelection({
      ...editableSelection,
      selectedSkills: exists
        ? editableSelection.selectedSkills.filter((s) => s !== skillName)
        : [...editableSelection.selectedSkills, skillName],
    });
  };

  // ─── Render based on stage ───
  const stage = store.stage;

  const stageLabels: { key: PipelineStage; label: string }[] = [
    { key: 'parsing', label: 'Parsing job description...' },
    { key: 'selecting', label: 'Selecting relevant items...' },
    { key: 'generating', label: 'Generating resume...' },
    { key: 'scoring', label: 'Scoring ATS compatibility...' },
    { key: 'cover-letter', label: 'Generating cover letter...' },
  ];

  const isProcessing = ['parsing', 'selecting', 'generating', 'scoring', 'cover-letter'].includes(
    stage,
  );

  return (
    <div className={styles['generate-page']}>
      <h1>Generate Resume</h1>

      {/* Step indicator */}
      <div className={styles.steps}>
        <div
          className={`${styles.step} ${stage === 'idle' || isProcessing ? styles.active : ''} ${stage === 'reviewing' || stage === 'complete' ? styles.done : ''}`}
        >
          <span className={styles['step-dot']}>1</span>
          <span>Input JD</span>
        </div>
        <div className={styles['step-line']} />
        <div
          className={`${styles.step} ${stage === 'reviewing' ? styles.active : ''} ${stage === 'generating' || stage === 'complete' ? styles.done : ''}`}
        >
          <span className={styles['step-dot']}>2</span>
          <span>Review</span>
        </div>
        <div className={styles['step-line']} />
        <div
          className={`${styles.step} ${['generating', 'scoring', 'cover-letter'].includes(stage) ? styles.active : ''} ${stage === 'complete' ? styles.done : ''}`}
        >
          <span className={styles['step-dot']}>3</span>
          <span>Generate</span>
        </div>
      </div>

      {/* Error display */}
      {store.error && (
        <div className={styles['error-box']}>
          <span>{store.error}</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              store.setStage('idle');
              store.setError(null);
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stage: Input JD */}
      {stage === 'idle' && (
        <div className={styles['jd-section']}>
          <textarea
            className={styles['jd-textarea']}
            placeholder="Paste the full job description here..."
            value={store.jdText}
            onChange={(e) => store.setJdText(e.target.value)}
          />

          <button className={styles['options-toggle']} onClick={() => setShowOptions(!showOptions)}>
            {showOptions ? '▾ Hide options' : '▸ Show options'}
          </button>

          {showOptions && (
            <div className={styles['options-panel']}>
              <div className={styles.field}>
                <label>Company Name</label>
                <input
                  type="text"
                  placeholder="e.g., Google"
                  value={store.config.companyName || ''}
                  onChange={(e) => store.setConfig({ companyName: e.target.value || undefined })}
                />
              </div>
              <div className={styles.field}>
                <label>Role Title</label>
                <input
                  type="text"
                  placeholder="e.g., Senior Frontend Engineer"
                  value={store.config.roleTitle || ''}
                  onChange={(e) => store.setConfig({ roleTitle: e.target.value || undefined })}
                />
              </div>
              <div className={styles.field}>
                <label>Tone</label>
                <select
                  value={store.config.tone}
                  onChange={(e) =>
                    store.setConfig({ tone: e.target.value as GenerationConfig['tone'] })
                  }
                >
                  <option value="professional">Professional</option>
                  <option value="formal">Formal</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Target Length</label>
                <select
                  value={store.config.targetPageLength}
                  onChange={(e) =>
                    store.setConfig({ targetPageLength: Number(e.target.value) as 1 | 2 })
                  }
                >
                  <option value={1}>1 Page</option>
                  <option value={2}>2 Pages</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Template</label>
                <select
                  value={store.config.templateId}
                  onChange={(e) => store.setConfig({ templateId: e.target.value })}
                >
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Skills to Emphasize (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., React, TypeScript, AWS"
                  value={store.config.skillsToEmphasize?.join(', ') || ''}
                  onChange={(e) =>
                    store.setConfig({
                      skillsToEmphasize: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={store.jdText.trim().length < 50}
          >
            Analyze Job Description
          </button>
        </div>
      )}

      {/* Stage: Processing (parsing / generating) */}
      {isProcessing && (
        <div className={styles['progress-section']}>
          <div className={styles['progress-stages']}>
            {stageLabels.map((sl) => {
              const stageOrder: PipelineStage[] = [
                'parsing',
                'selecting',
                'generating',
                'scoring',
                'cover-letter',
              ];
              const currentIdx = stageOrder.indexOf(stage);
              const thisIdx = stageOrder.indexOf(sl.key);
              let className = styles['progress-stage'];
              if (thisIdx < currentIdx) className += ` ${styles.done}`;
              else if (thisIdx === currentIdx) className += ` ${styles.active}`;

              return (
                <div key={sl.key} className={className}>
                  {thisIdx === currentIdx ? (
                    <div className={styles.spinner} />
                  ) : thisIdx < currentIdx ? (
                    <span>✓</span>
                  ) : (
                    <span>○</span>
                  )}
                  <span>{sl.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage: Checkpoint / Review */}
      {stage === 'reviewing' && editableSelection && store.parsedJD && (
        <div className={styles['review-section']}>
          <div className={styles['review-header']}>
            <h2>Review Selected Items</h2>
            <span
              className={styles['match-score']}
              style={{
                color:
                  editableSelection.overallMatchScore >= 80
                    ? 'var(--success)'
                    : editableSelection.overallMatchScore >= 60
                      ? 'var(--warning)'
                      : 'var(--danger)',
              }}
            >
              {editableSelection.overallMatchScore}% match
            </span>
          </div>

          {/* Proposed Summary */}
          <div className={styles['review-group']}>
            <div className={styles['review-group-header']}>Professional Summary</div>
            <div className={styles['review-summary']} style={{ padding: 16 }}>
              <textarea
                value={editableSelection.proposedSummary}
                onChange={(e) =>
                  setEditableSelection({ ...editableSelection, proposedSummary: e.target.value })
                }
              />
            </div>
          </div>

          {/* Selected Experiences */}
          {editableSelection.selectedExperiences.map((se) => (
            <div key={se.experienceId} className={styles['review-group']}>
              <div className={styles['review-group-header']}>
                <span>{se.experienceId}</span>
                <label style={{ fontSize: 13, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={se.include}
                    onChange={() => {
                      setEditableSelection({
                        ...editableSelection,
                        selectedExperiences: editableSelection.selectedExperiences.map((s) =>
                          s.experienceId === se.experienceId ? { ...s, include: !s.include } : s,
                        ),
                      });
                    }}
                  />{' '}
                  Include
                </label>
              </div>
              {se.include &&
                se.selectedBullets.map((bullet, i) => (
                  <div key={i} className={styles['review-bullet']}>
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => toggleBullet(se.experienceId, bullet.bulletIndex)}
                    />
                    <div>
                      <div>{bullet.originalText}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Relevance: {bullet.relevanceScore}% | Keywords:{' '}
                        {bullet.matchedKeywords.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ))}

          {/* Skills */}
          <div className={styles['review-group']}>
            <div className={styles['review-group-header']}>Skills</div>
            <div style={{ padding: 16 }}>
              <div className={styles['skills-list']}>
                {store.parsedJD.requiredSkills
                  .concat(store.parsedJD.preferredSkills)
                  .map((skill) => (
                    <span
                      key={skill}
                      className={`${styles['skill-chip']} ${editableSelection.selectedSkills.includes(skill) ? styles.selected : ''}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles['review-actions']}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                store.setStage('idle');
              }}
            >
              ← Back to Edit
            </button>
            <button className="btn btn-primary" onClick={handleConfirmAndGenerate}>
              Confirm & Generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
