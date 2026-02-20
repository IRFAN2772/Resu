import { useState, useEffect, useCallback } from 'react';
import type { ResumeTemplateProps } from './types';
import type { ResumeData } from '@resu/shared';
import { EditableText } from './EditableText';
import styles from './Executive.module.css';

export function ExecutiveTemplate({ data, mode, onSave }: ResumeTemplateProps) {
  const [editData, setEditData] = useState<ResumeData>(data);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    setEditData(data);
  }, [data]);

  const isEdit = mode === 'edit';
  const handleFieldClick = (field: string) => {
    if (isEdit) setEditingField(field);
  };
  const handleSave = () => {
    onSave?.(editData);
    setEditingField(null);
  };
  const clearEditing = useCallback(() => setEditingField(null), []);

  // ── Updaters ──
  const updateSummary = (v: string) => setEditData({ ...editData, summary: v });
  const updateBullet = (ei: number, bi: number, v: string) => {
    const e = [...editData.experience];
    const b = [...e[ei].bullets];
    b[bi] = v;
    e[ei] = { ...e[ei], bullets: b };
    setEditData({ ...editData, experience: e });
  };
  const updateExpField = (i: number, f: string, v: string) => {
    const e = [...editData.experience];
    e[i] = { ...e[i], [f]: v };
    setEditData({ ...editData, experience: e });
  };
  const updateSkillCategory = (i: number, f: 'name' | 'skills', v: string) => {
    const c = [...editData.skills.categories];
    c[i] =
      f === 'name'
        ? { ...c[i], name: v }
        : {
            ...c[i],
            skills: v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          };
    setEditData({ ...editData, skills: { categories: c } });
  };
  const updateEduField = (i: number, f: string, v: string) => {
    const e = [...editData.education];
    e[i] = { ...e[i], [f]: v };
    setEditData({ ...editData, education: e });
  };
  const updateProjectField = (i: number, f: string, v: string) => {
    const p = [...editData.projects];
    p[i] = { ...p[i], [f]: v };
    setEditData({ ...editData, projects: p });
  };
  const updateProjectHighlight = (pi: number, hi: number, v: string) => {
    const p = [...editData.projects];
    const h = [...p[pi].highlights];
    h[hi] = v;
    p[pi] = { ...p[pi], highlights: h };
    setEditData({ ...editData, projects: p });
  };
  const updateCertField = (i: number, f: string, v: string) => {
    const c = [...editData.certifications];
    c[i] = { ...c[i], [f]: v };
    setEditData({ ...editData, certifications: c });
  };

  // ── Add/Remove ──
  const addExpBullet = (i: number) => {
    const e = [...editData.experience];
    e[i] = { ...e[i], bullets: [...e[i].bullets, 'New bullet'] };
    setEditData({ ...editData, experience: e });
  };
  const removeExpBullet = (ei: number, bi: number) => {
    const e = [...editData.experience];
    e[ei] = { ...e[ei], bullets: e[ei].bullets.filter((_, i) => i !== bi) };
    setEditData({ ...editData, experience: e });
  };
  const addExperience = () =>
    setEditData({
      ...editData,
      experience: [
        ...editData.experience,
        {
          title: 'New Role',
          company: 'Company',
          location: '',
          startDate: 'YYYY-MM',
          endDate: 'Present',
          bullets: ['Achievement...'],
        },
      ],
    });
  const removeExperience = (i: number) =>
    setEditData({ ...editData, experience: editData.experience.filter((_, idx) => idx !== i) });
  const addEducation = () =>
    setEditData({
      ...editData,
      education: [
        ...editData.education,
        {
          institution: 'University',
          degree: 'Degree',
          field: 'Field',
          startDate: 'YYYY',
          endDate: 'YYYY',
          gpa: '',
          highlights: [],
        },
      ],
    });
  const removeEducation = (i: number) =>
    setEditData({ ...editData, education: editData.education.filter((_, idx) => idx !== i) });
  const addSkillCategory = () =>
    setEditData({
      ...editData,
      skills: {
        categories: [...editData.skills.categories, { name: 'Category', skills: ['Skill'] }],
      },
    });
  const removeSkillCategory = (i: number) =>
    setEditData({
      ...editData,
      skills: { categories: editData.skills.categories.filter((_, idx) => idx !== i) },
    });
  const addProject = () =>
    setEditData({
      ...editData,
      projects: [
        ...editData.projects,
        { name: 'Project', description: 'Description...', highlights: [] },
      ],
    });
  const removeProject = (i: number) =>
    setEditData({ ...editData, projects: editData.projects.filter((_, idx) => idx !== i) });
  const addProjectHighlight = (pi: number) => {
    const p = [...editData.projects];
    p[pi] = { ...p[pi], highlights: [...p[pi].highlights, 'Highlight'] };
    setEditData({ ...editData, projects: p });
  };
  const removeProjectHighlight = (pi: number, hi: number) => {
    const p = [...editData.projects];
    p[pi] = { ...p[pi], highlights: p[pi].highlights.filter((_, i) => i !== hi) };
    setEditData({ ...editData, projects: p });
  };
  const addCertification = () =>
    setEditData({
      ...editData,
      certifications: [
        ...editData.certifications,
        { name: 'Cert', issuer: 'Issuer', date: 'YYYY-MM' },
      ],
    });
  const removeCertification = (i: number) =>
    setEditData({
      ...editData,
      certifications: editData.certifications.filter((_, idx) => idx !== i),
    });

  const d = isEdit ? editData : data;
  const c = d.contact;
  const ep = { isEdit, editingField, onFieldClick: handleFieldClick, onBlur: clearEditing, styles };

  return (
    <div className={styles.template}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <h1 className={styles.name}>{c.name}</h1>
        <div className={styles.contactRow}>
          {[c.email, c.phone, c.location].filter(Boolean).map((v, i) => (
            <span key={i} className={styles.contactItem}>
              {v}
            </span>
          ))}
        </div>
        <div className={styles.contactRow}>
          {[c.linkedin, c.github, c.website].filter(Boolean).map((v, i) => (
            <span key={i} className={styles.contactItem}>
              {v}
            </span>
          ))}
        </div>
      </header>

      {/* ── Summary ── */}
      {d.summary && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Executive Summary</h2>
          <EditableText
            {...ep}
            fieldKey="summary"
            value={d.summary}
            onChange={updateSummary}
            tag="p"
            className={styles.summaryText}
            multiline
          />
        </section>
      )}

      {/* ── Experience ── */}
      {d.experience.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Professional Experience</h2>
          {d.experience.map((exp, i) => (
            <div key={i} className={styles.entry}>
              {isEdit && (
                <button className={styles.removeBtn} onClick={() => removeExperience(i)}>
                  ×
                </button>
              )}
              <div className={styles.entryHeader}>
                <EditableText
                  {...ep}
                  fieldKey={`exp-title-${i}`}
                  value={exp.title}
                  onChange={(v) => updateExpField(i, 'title', v)}
                  className={styles.entryTitle}
                />
                <span className={styles.entryDates}>
                  <EditableText
                    {...ep}
                    fieldKey={`exp-start-${i}`}
                    value={exp.startDate}
                    onChange={(v) => updateExpField(i, 'startDate', v)}
                  />
                  {' – '}
                  <EditableText
                    {...ep}
                    fieldKey={`exp-end-${i}`}
                    value={exp.endDate || 'Present'}
                    onChange={(v) => updateExpField(i, 'endDate', v)}
                  />
                </span>
              </div>
              <div className={styles.entrySubheader}>
                <EditableText
                  {...ep}
                  fieldKey={`exp-company-${i}`}
                  value={exp.company}
                  onChange={(v) => updateExpField(i, 'company', v)}
                  className={styles.entryCompany}
                />
                {exp.location && (
                  <span className={styles.entryLocation}>
                    <EditableText
                      {...ep}
                      fieldKey={`exp-loc-${i}`}
                      value={exp.location}
                      onChange={(v) => updateExpField(i, 'location', v)}
                    />
                  </span>
                )}
              </div>
              <ul className={styles.bullets}>
                {exp.bullets.map((b, bi) => (
                  <li key={bi}>
                    <EditableText
                      {...ep}
                      fieldKey={`exp-${i}-${bi}`}
                      value={b}
                      onChange={(v) => updateBullet(i, bi, v)}
                      multiline
                    />
                    {isEdit && (
                      <button
                        className={styles.removeBtnInline}
                        onClick={() => removeExpBullet(i, bi)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {isEdit && (
                <button className={styles.addBtn} onClick={() => addExpBullet(i)}>
                  + Bullet
                </button>
              )}
            </div>
          ))}
          {isEdit && (
            <button className={styles.addBtn} onClick={addExperience}>
              + Experience
            </button>
          )}
        </section>
      )}

      {/* ── Skills ── */}
      {d.skills.categories.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Core Competencies</h2>
          <div className={styles.skillGrid}>
            {d.skills.categories.map((cat, i) => (
              <div key={i} className={styles.skillGroup}>
                <EditableText
                  {...ep}
                  fieldKey={`skill-name-${i}`}
                  value={cat.name}
                  onChange={(v) => updateSkillCategory(i, 'name', v)}
                  tag="strong"
                  className={styles.skillLabel}
                />
                <EditableText
                  {...ep}
                  fieldKey={`skill-list-${i}`}
                  value={cat.skills.join(' · ')}
                  onChange={(v) => updateSkillCategory(i, 'skills', v)}
                  className={styles.skillItems}
                />
                {isEdit && (
                  <button className={styles.removeBtnInline} onClick={() => removeSkillCategory(i)}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {isEdit && (
            <button className={styles.addBtn} onClick={addSkillCategory}>
              + Category
            </button>
          )}
        </section>
      )}

      {/* ── Education ── */}
      {d.education.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Education</h2>
          {d.education.map((edu, i) => (
            <div key={i} className={styles.eduEntry}>
              {isEdit && (
                <button className={styles.removeBtn} onClick={() => removeEducation(i)}>
                  ×
                </button>
              )}
              <div className={styles.entryHeader}>
                <div>
                  <EditableText
                    {...ep}
                    fieldKey={`edu-degree-${i}`}
                    value={edu.degree}
                    onChange={(v) => updateEduField(i, 'degree', v)}
                    tag="strong"
                  />
                  <span> in </span>
                  <EditableText
                    {...ep}
                    fieldKey={`edu-field-${i}`}
                    value={edu.field}
                    onChange={(v) => updateEduField(i, 'field', v)}
                  />
                </div>
                <span className={styles.entryDates}>
                  <EditableText
                    {...ep}
                    fieldKey={`edu-start-${i}`}
                    value={edu.startDate}
                    onChange={(v) => updateEduField(i, 'startDate', v)}
                  />
                  {edu.endDate && (
                    <>
                      <span> – </span>
                      <EditableText
                        {...ep}
                        fieldKey={`edu-end-${i}`}
                        value={edu.endDate}
                        onChange={(v) => updateEduField(i, 'endDate', v)}
                      />
                    </>
                  )}
                </span>
              </div>
              <div className={styles.eduInst}>
                <EditableText
                  {...ep}
                  fieldKey={`edu-inst-${i}`}
                  value={edu.institution}
                  onChange={(v) => updateEduField(i, 'institution', v)}
                />
              </div>
            </div>
          ))}
          {isEdit && (
            <button className={styles.addBtn} onClick={addEducation}>
              + Education
            </button>
          )}
        </section>
      )}

      {/* ── Projects ── */}
      {d.projects.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Key Projects</h2>
          {d.projects.map((p, i) => (
            <div key={i} className={styles.entry}>
              {isEdit && (
                <button className={styles.removeBtn} onClick={() => removeProject(i)}>
                  ×
                </button>
              )}
              <EditableText
                {...ep}
                fieldKey={`proj-name-${i}`}
                value={p.name}
                onChange={(v) => updateProjectField(i, 'name', v)}
                tag="strong"
                className={styles.entryTitle}
              />
              <EditableText
                {...ep}
                fieldKey={`proj-desc-${i}`}
                value={p.description}
                onChange={(v) => updateProjectField(i, 'description', v)}
                tag="p"
                multiline
              />
              {p.highlights.length > 0 && (
                <ul className={styles.bullets}>
                  {p.highlights.map((h, j) => (
                    <li key={j}>
                      <EditableText
                        {...ep}
                        fieldKey={`proj-h-${i}-${j}`}
                        value={h}
                        onChange={(v) => updateProjectHighlight(i, j, v)}
                        multiline
                      />
                      {isEdit && (
                        <button
                          className={styles.removeBtnInline}
                          onClick={() => removeProjectHighlight(i, j)}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {isEdit && (
                <button className={styles.addBtn} onClick={() => addProjectHighlight(i)}>
                  + Highlight
                </button>
              )}
            </div>
          ))}
          {isEdit && (
            <button className={styles.addBtn} onClick={addProject}>
              + Project
            </button>
          )}
        </section>
      )}

      {/* ── Certifications ── */}
      {d.certifications.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Certifications</h2>
          <div className={styles.certGrid}>
            {d.certifications.map((cert, i) => (
              <div key={i} className={styles.certEntry}>
                {isEdit && (
                  <button className={styles.removeBtnInline} onClick={() => removeCertification(i)}>
                    ×
                  </button>
                )}
                <EditableText
                  {...ep}
                  fieldKey={`cert-name-${i}`}
                  value={cert.name}
                  onChange={(v) => updateCertField(i, 'name', v)}
                  tag="strong"
                />
                <span className={styles.certMeta}>
                  <EditableText
                    {...ep}
                    fieldKey={`cert-issuer-${i}`}
                    value={cert.issuer}
                    onChange={(v) => updateCertField(i, 'issuer', v)}
                  />
                  <span> · </span>
                  <EditableText
                    {...ep}
                    fieldKey={`cert-date-${i}`}
                    value={cert.date}
                    onChange={(v) => updateCertField(i, 'date', v)}
                  />
                </span>
              </div>
            ))}
          </div>
          {isEdit && (
            <button className={styles.addBtn} onClick={addCertification}>
              + Certification
            </button>
          )}
        </section>
      )}

      {isEdit && (
        <div className={styles.editActions}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
