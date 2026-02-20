import { useState, useEffect, useCallback } from 'react';
import type { ResumeTemplateProps } from './types';
import type { ResumeData } from '@resu/shared';
import { EditableText } from './EditableText';
import styles from './CleanMinimal.module.css';

export function CleanMinimalTemplate({ data, mode, onSave }: ResumeTemplateProps) {
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

  // ─── Update helpers ───
  const updateSummary = (value: string) => {
    setEditData({ ...editData, summary: value });
  };

  const updateBullet = (expIdx: number, bulletIdx: number, value: string) => {
    const newExp = [...editData.experience];
    const newBullets = [...newExp[expIdx].bullets];
    newBullets[bulletIdx] = value;
    newExp[expIdx] = { ...newExp[expIdx], bullets: newBullets };
    setEditData({ ...editData, experience: newExp });
  };

  const updateExpField = (expIdx: number, field: string, value: string) => {
    const newExp = [...editData.experience];
    newExp[expIdx] = { ...newExp[expIdx], [field]: value };
    setEditData({ ...editData, experience: newExp });
  };

  const updateSkillCategory = (catIdx: number, field: 'name' | 'skills', value: string) => {
    const newCats = [...editData.skills.categories];
    if (field === 'name') {
      newCats[catIdx] = { ...newCats[catIdx], name: value };
    } else {
      newCats[catIdx] = {
        ...newCats[catIdx],
        skills: value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
    }
    setEditData({ ...editData, skills: { categories: newCats } });
  };

  const updateEduField = (eduIdx: number, field: string, value: string) => {
    const newEdu = [...editData.education];
    newEdu[eduIdx] = { ...newEdu[eduIdx], [field]: value };
    setEditData({ ...editData, education: newEdu });
  };

  const updateProjectField = (projIdx: number, field: string, value: string) => {
    const newProj = [...editData.projects];
    newProj[projIdx] = { ...newProj[projIdx], [field]: value };
    setEditData({ ...editData, projects: newProj });
  };

  const updateProjectHighlight = (projIdx: number, hIdx: number, value: string) => {
    const newProj = [...editData.projects];
    const newH = [...newProj[projIdx].highlights];
    newH[hIdx] = value;
    newProj[projIdx] = { ...newProj[projIdx], highlights: newH };
    setEditData({ ...editData, projects: newProj });
  };

  const updateCertField = (certIdx: number, field: string, value: string) => {
    const newCerts = [...editData.certifications];
    newCerts[certIdx] = { ...newCerts[certIdx], [field]: value };
    setEditData({ ...editData, certifications: newCerts });
  };

  // ─── Add / Remove helpers ───
  const addExpBullet = (expIdx: number) => {
    const newExp = [...editData.experience];
    newExp[expIdx] = { ...newExp[expIdx], bullets: [...newExp[expIdx].bullets, 'New bullet point'] };
    setEditData({ ...editData, experience: newExp });
  };
  const removeExpBullet = (expIdx: number, bIdx: number) => {
    const newExp = [...editData.experience];
    newExp[expIdx] = { ...newExp[expIdx], bullets: newExp[expIdx].bullets.filter((_, i) => i !== bIdx) };
    setEditData({ ...editData, experience: newExp });
  };
  const addExperience = () => {
    setEditData({
      ...editData,
      experience: [...editData.experience, { title: 'New Role', company: 'Company', location: '', startDate: 'YYYY-MM', endDate: 'Present', bullets: ['Describe your achievement...'] }],
    });
  };
  const removeExperience = (idx: number) => {
    setEditData({ ...editData, experience: editData.experience.filter((_, i) => i !== idx) });
  };
  const addEducation = () => {
    setEditData({
      ...editData,
      education: [...editData.education, { institution: 'University', degree: 'Degree', field: 'Field of Study', startDate: 'YYYY', endDate: 'YYYY', gpa: '', highlights: [] }],
    });
  };
  const removeEducation = (idx: number) => {
    setEditData({ ...editData, education: editData.education.filter((_, i) => i !== idx) });
  };
  const addSkillCategory = () => {
    setEditData({
      ...editData,
      skills: { categories: [...editData.skills.categories, { name: 'New Category', skills: ['Skill 1'] }] },
    });
  };
  const removeSkillCategory = (idx: number) => {
    setEditData({ ...editData, skills: { categories: editData.skills.categories.filter((_, i) => i !== idx) } });
  };
  const addProject = () => {
    setEditData({
      ...editData,
      projects: [...editData.projects, { name: 'New Project', description: 'Project description...', highlights: [] }],
    });
  };
  const removeProject = (idx: number) => {
    setEditData({ ...editData, projects: editData.projects.filter((_, i) => i !== idx) });
  };
  const addProjectHighlight = (projIdx: number) => {
    const newProj = [...editData.projects];
    newProj[projIdx] = { ...newProj[projIdx], highlights: [...newProj[projIdx].highlights, 'New highlight'] };
    setEditData({ ...editData, projects: newProj });
  };
  const removeProjectHighlight = (projIdx: number, hIdx: number) => {
    const newProj = [...editData.projects];
    newProj[projIdx] = { ...newProj[projIdx], highlights: newProj[projIdx].highlights.filter((_, i) => i !== hIdx) };
    setEditData({ ...editData, projects: newProj });
  };
  const addCertification = () => {
    setEditData({
      ...editData,
      certifications: [...editData.certifications, { name: 'Certification Name', issuer: 'Issuer', date: 'YYYY-MM' }],
    });
  };
  const removeCertification = (idx: number) => {
    setEditData({ ...editData, certifications: editData.certifications.filter((_, i) => i !== idx) });
  };

  const clearEditing = useCallback(() => setEditingField(null), []);

  const d = isEdit ? editData : data;
  const c = d.contact;

  // Shared props for all EditableText instances
  const ep = { isEdit, editingField, onFieldClick: handleFieldClick, onBlur: clearEditing, styles };

  return (
    <div className={styles['clean-minimal']}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.name}>{c.name}</h1>
        <div className={styles['contact-info']}>
          {[c.email, c.phone, c.location, c.linkedin, c.github, c.website]
            .filter(Boolean)
            .map((item, i, arr) => (
              <span key={i}>
                {item}
                {i < arr.length - 1 && <span className={styles.sep}>|</span>}
              </span>
            ))}
        </div>
      </header>

      {/* Summary */}
      {d.summary && (
        <section className={styles.section}>
          <h2 className={styles['section-title']}>Professional Summary</h2>
          <EditableText
            {...ep}
            fieldKey="summary"
            value={d.summary}
            onChange={updateSummary}
            tag="p"
            className={styles.summary}
            multiline
          />
        </section>
      )}

      {/* Experience */}
      {d.experience.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles['section-title']}>Experience</h2>
          {d.experience.map((exp, expIdx) => (
            <div key={expIdx} className={styles.entry}>
              {isEdit && (
                <button className={styles['remove-btn']} title="Remove experience" onClick={() => removeExperience(expIdx)}>×</button>
              )}
              <div className={styles['entry-header']}>
                <div>
                  <EditableText
                    {...ep}
                    fieldKey={`exp-title-${expIdx}`}
                    value={exp.title}
                    onChange={(v) => updateExpField(expIdx, 'title', v)}
                    className={styles['entry-title']}
                  />
                  <span> — </span>
                  <EditableText
                    {...ep}
                    fieldKey={`exp-company-${expIdx}`}
                    value={exp.company}
                    onChange={(v) => updateExpField(expIdx, 'company', v)}
                    className={styles['entry-company']}
                  />
                  {exp.location && (
                    <>
                      <span>, </span>
                      <EditableText
                        {...ep}
                        fieldKey={`exp-loc-${expIdx}`}
                        value={exp.location}
                        onChange={(v) => updateExpField(expIdx, 'location', v)}
                      />
                    </>
                  )}
                </div>
                <span className={styles['entry-dates']}>
                  <EditableText
                    {...ep}
                    fieldKey={`exp-start-${expIdx}`}
                    value={exp.startDate}
                    onChange={(v) => updateExpField(expIdx, 'startDate', v)}
                  />
                  <span> – </span>
                  <EditableText
                    {...ep}
                    fieldKey={`exp-end-${expIdx}`}
                    value={exp.endDate || 'Present'}
                    onChange={(v) => updateExpField(expIdx, 'endDate', v)}
                  />
                </span>
              </div>
              <ul className={styles.bullets}>
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className={isEdit ? styles['editable-li'] : ''}>
                    <EditableText
                      {...ep}
                      fieldKey={`exp-${expIdx}-${bIdx}`}
                      value={bullet}
                      onChange={(v) => updateBullet(expIdx, bIdx, v)}
                      multiline
                    />
                    {isEdit && (
                      <button className={styles['remove-btn-inline']} title="Remove bullet" onClick={() => removeExpBullet(expIdx, bIdx)}>×</button>
                    )}
                  </li>
                ))}
              </ul>
              {isEdit && (
                <button className={styles['add-btn']} onClick={() => addExpBullet(expIdx)}>+ Add Bullet</button>
              )}
            </div>
          ))}
          {isEdit && (
            <button className={styles['add-btn']} onClick={addExperience}>+ Add Experience</button>
          )}
        </section>
      )}

      {/* Education */}
      {d.education.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles['section-title']}>Education</h2>
          {d.education.map((edu, i) => (
            <div key={i} className={styles.entry}>
              {isEdit && (
                <button className={styles['remove-btn']} title="Remove education" onClick={() => removeEducation(i)}>×</button>
              )}
              <div className={styles['entry-header']}>
                <div>
                  <EditableText
                    {...ep}
                    fieldKey={`edu-degree-${i}`}
                    value={edu.degree}
                    onChange={(v) => updateEduField(i, 'degree', v)}
                    className={styles['entry-title']}
                  />
                  <span> in </span>
                  <EditableText
                    {...ep}
                    fieldKey={`edu-field-${i}`}
                    value={edu.field}
                    onChange={(v) => updateEduField(i, 'field', v)}
                  />
                  <span> — </span>
                  <EditableText
                    {...ep}
                    fieldKey={`edu-inst-${i}`}
                    value={edu.institution}
                    onChange={(v) => updateEduField(i, 'institution', v)}
                    className={styles['entry-company']}
                  />
                </div>
                <span className={styles['entry-dates']}>
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
              {edu.gpa && (
                <p className={styles.gpa}>
                  GPA:{' '}
                  <EditableText
                    {...ep}
                    fieldKey={`edu-gpa-${i}`}
                    value={edu.gpa}
                    onChange={(v) => updateEduField(i, 'gpa', v)}
                  />
                </p>
              )}
            </div>
          ))}
          {isEdit && (
            <button className={styles['add-btn']} onClick={addEducation}>+ Add Education</button>
          )}
        </section>
      )}

      {/* Skills */}
      {d.skills.categories.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles['section-title']}>Skills</h2>
          <div className={styles['skills-section']}>
            {d.skills.categories.map((cat, i) => (
              <div key={i} className={styles['skill-category']}>
                <EditableText
                  {...ep}
                  fieldKey={`skill-cat-name-${i}`}
                  value={cat.name}
                  onChange={(v) => updateSkillCategory(i, 'name', v)}
                  tag="strong"
                />
                <span>: </span>
                <EditableText
                  {...ep}
                  fieldKey={`skill-cat-skills-${i}`}
                  value={cat.skills.join(', ')}
                  onChange={(v) => updateSkillCategory(i, 'skills', v)}
                  multiline
                />
                {isEdit && (
                  <button className={styles['remove-btn-inline']} title="Remove category" onClick={() => removeSkillCategory(i)}>×</button>
                )}
              </div>
            ))}
          </div>
          {isEdit && (
            <button className={styles['add-btn']} onClick={addSkillCategory}>+ Add Skill Category</button>
          )}
        </section>
      )}

      {/* Projects */}
      {d.projects.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles['section-title']}>Projects</h2>
          {d.projects.map((proj, i) => (
            <div key={i} className={styles.entry}>
              {isEdit && (
                <button className={styles['remove-btn']} title="Remove project" onClick={() => removeProject(i)}>×</button>
              )}
              <div className={styles['entry-header']}>
                <EditableText
                  {...ep}
                  fieldKey={`proj-name-${i}`}
                  value={proj.name}
                  onChange={(v) => updateProjectField(i, 'name', v)}
                  className={styles['entry-title']}
                />
              </div>
              <EditableText
                {...ep}
                fieldKey={`proj-desc-${i}`}
                value={proj.description}
                onChange={(v) => updateProjectField(i, 'description', v)}
                tag="p"
                multiline
              />
              {proj.highlights.length > 0 && (
                <ul className={styles.bullets}>
                  {proj.highlights.map((h, j) => (
                    <li key={j} className={isEdit ? styles['editable-li'] : ''}>
                      <EditableText
                        {...ep}
                        fieldKey={`proj-h-${i}-${j}`}
                        value={h}
                        onChange={(v) => updateProjectHighlight(i, j, v)}
                        multiline
                      />
                      {isEdit && (
                        <button className={styles['remove-btn-inline']} title="Remove highlight" onClick={() => removeProjectHighlight(i, j)}>×</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {isEdit && (
                <button className={styles['add-btn']} onClick={() => addProjectHighlight(i)}>+ Add Highlight</button>
              )}
            </div>
          ))}
          {isEdit && (
            <button className={styles['add-btn']} onClick={addProject}>+ Add Project</button>
          )}
        </section>
      )}

      {/* Certifications */}
      {d.certifications.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles['section-title']}>Certifications</h2>
          <ul className={styles.bullets}>
            {d.certifications.map((cert, i) => (
              <li key={i} className={isEdit ? styles['editable-li'] : ''}>
                <EditableText
                  {...ep}
                  fieldKey={`cert-name-${i}`}
                  value={cert.name}
                  onChange={(v) => updateCertField(i, 'name', v)}
                  tag="strong"
                />
                <span> — </span>
                <EditableText
                  {...ep}
                  fieldKey={`cert-issuer-${i}`}
                  value={cert.issuer}
                  onChange={(v) => updateCertField(i, 'issuer', v)}
                />
                <span> (</span>
                <EditableText
                  {...ep}
                  fieldKey={`cert-date-${i}`}
                  value={cert.date}
                  onChange={(v) => updateCertField(i, 'date', v)}
                />
                <span>)</span>
                {isEdit && (
                  <button className={styles['remove-btn-inline']} title="Remove certification" onClick={() => removeCertification(i)}>×</button>
                )}
              </li>
            ))}
          </ul>
          {isEdit && (
            <button className={styles['add-btn']} onClick={addCertification}>+ Add Certification</button>
          )}
        </section>
      )}

      {/* Save button in edit mode */}
      {isEdit && (
        <div className={styles['edit-actions']}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
