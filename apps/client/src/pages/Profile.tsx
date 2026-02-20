import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getProfile, updateProfile } from '../lib/api';
import type { PersonalProfile } from '@resu/shared';
import styles from './Profile.module.css';

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const [form, setForm] = useState<PersonalProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('contact');

  useEffect(() => {
    if (profile && !form) {
      setForm(structuredClone(profile));
    }
  }, [profile, form]);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      await updateProfile(form);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, queryClient]);

  const handleReset = useCallback(() => {
    if (profile) setForm(structuredClone(profile));
  }, [profile]);

  if (isLoading || !form) {
    return (
      <div className={styles.profile}>
        <h1>Profile</h1>
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  const sections = [
    { key: 'contact', label: 'Contact Info' },
    { key: 'summary', label: 'Summary' },
    { key: 'experience', label: `Experience (${form.experience.length})` },
    { key: 'skills', label: `Skills (${form.skills.length})` },
    { key: 'education', label: `Education (${form.education.length})` },
    { key: 'projects', label: `Projects (${form.projects.length})` },
    { key: 'certifications', label: `Certs (${form.certifications.length})` },
  ];

  return (
    <div className={styles.profile}>
      <div className={styles.header}>
        <div>
          <h1>Profile</h1>
          <p className={styles.subtitle}>
            Your master profile — the source of truth for all resume generation
          </p>
        </div>
        <div className={styles['header-actions']}>
          <button className="btn btn-secondary" onClick={handleReset} disabled={saving}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Section Nav */}
        <nav className={styles.nav}>
          {sections.map((s) => (
            <button
              key={s.key}
              className={`${styles['nav-item']} ${activeSection === s.key ? styles.active : ''}`}
              onClick={() => setActiveSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className={styles.content}>
          {activeSection === 'contact' && <ContactSection form={form} setForm={setForm} />}
          {activeSection === 'summary' && <SummarySection form={form} setForm={setForm} />}
          {activeSection === 'experience' && <ExperienceSection form={form} setForm={setForm} />}
          {activeSection === 'skills' && <SkillsSection form={form} setForm={setForm} />}
          {activeSection === 'education' && <EducationSection form={form} setForm={setForm} />}
          {activeSection === 'projects' && <ProjectsSection form={form} setForm={setForm} />}
          {activeSection === 'certifications' && (
            <CertificationsSection form={form} setForm={setForm} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───
type SectionProps = { form: PersonalProfile; setForm: (f: PersonalProfile) => void };

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── Contact Section ───
function ContactSection({ form, setForm }: SectionProps) {
  const c = form.contact;
  const set = (field: string, value: string) =>
    setForm({ ...form, contact: { ...c, [field]: value } });

  return (
    <div className={styles.section}>
      <h2>Contact Information</h2>
      <div className={styles.grid}>
        <Field label="Full Name" value={c.name} onChange={(v) => set('name', v)} />
        <Field label="Email" value={c.email} onChange={(v) => set('email', v)} type="email" />
        <Field label="Phone" value={c.phone || ''} onChange={(v) => set('phone', v)} />
        <Field label="Location" value={c.location || ''} onChange={(v) => set('location', v)} />
        <Field
          label="LinkedIn"
          value={c.linkedin || ''}
          onChange={(v) => set('linkedin', v)}
          placeholder="linkedin.com/in/..."
        />
        <Field
          label="GitHub"
          value={c.github || ''}
          onChange={(v) => set('github', v)}
          placeholder="github.com/..."
        />
        <Field
          label="Website"
          value={c.website || ''}
          onChange={(v) => set('website', v)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

// ─── Summary Section ───
function SummarySection({ form, setForm }: SectionProps) {
  return (
    <div className={styles.section}>
      <h2>Professional Summary</h2>
      <textarea
        className={styles.textarea}
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
        rows={6}
        placeholder="Your default professional summary..."
      />
    </div>
  );
}

// ─── Experience Section ───
function ExperienceSection({ form, setForm }: SectionProps) {
  const addExperience = () => {
    setForm({
      ...form,
      experience: [
        ...form.experience,
        {
          id: crypto.randomUUID(),
          title: '',
          titleAliases: [],
          company: '',
          location: '',
          startDate: '',
          bullets: [],
          tags: [],
        },
      ],
    });
  };

  const removeExperience = (idx: number) => {
    setForm({ ...form, experience: form.experience.filter((_, i) => i !== idx) });
  };

  const updateExp = (idx: number, field: string, value: unknown) => {
    const exps = [...form.experience];
    exps[idx] = { ...exps[idx], [field]: value };
    setForm({ ...form, experience: exps });
  };

  const addBullet = (expIdx: number) => {
    const exps = [...form.experience];
    exps[expIdx] = {
      ...exps[expIdx],
      bullets: [
        ...exps[expIdx].bullets,
        { text: '', tags: [], category: 'other' as const, strength: 3 },
      ],
    };
    setForm({ ...form, experience: exps });
  };

  const removeBullet = (expIdx: number, bulletIdx: number) => {
    const exps = [...form.experience];
    exps[expIdx] = {
      ...exps[expIdx],
      bullets: exps[expIdx].bullets.filter((_, i) => i !== bulletIdx),
    };
    setForm({ ...form, experience: exps });
  };

  const updateBullet = (expIdx: number, bulletIdx: number, text: string) => {
    const exps = [...form.experience];
    const bullets = [...exps[expIdx].bullets];
    bullets[bulletIdx] = { ...bullets[bulletIdx], text };
    exps[expIdx] = { ...exps[expIdx], bullets };
    setForm({ ...form, experience: exps });
  };

  return (
    <div className={styles.section}>
      <div className={styles['section-header']}>
        <h2>Experience</h2>
        <button className="btn btn-sm btn-primary" onClick={addExperience}>
          + Add
        </button>
      </div>
      {form.experience.map((exp, i) => (
        <div key={exp.id} className={styles.card}>
          <div className={styles['card-header']}>
            <span className={styles['card-title']}>
              {exp.title || 'New Position'} — {exp.company || 'Company'}
            </span>
            <button className="btn btn-sm btn-danger" onClick={() => removeExperience(i)}>
              Remove
            </button>
          </div>
          <div className={styles.grid}>
            <Field label="Title" value={exp.title} onChange={(v) => updateExp(i, 'title', v)} />
            <Field
              label="Company"
              value={exp.company}
              onChange={(v) => updateExp(i, 'company', v)}
            />
            <Field
              label="Location"
              value={exp.location || ''}
              onChange={(v) => updateExp(i, 'location', v)}
            />
            <Field
              label="Start Date"
              value={exp.startDate}
              onChange={(v) => updateExp(i, 'startDate', v)}
              placeholder="2020-01"
            />
            <Field
              label="End Date"
              value={exp.endDate || ''}
              onChange={(v) => updateExp(i, 'endDate', v)}
              placeholder="Present"
            />
            <Field
              label="Tags"
              value={exp.tags.join(', ')}
              onChange={(v) =>
                updateExp(
                  i,
                  'tags',
                  v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="react, typescript, ..."
            />
          </div>
          <div className={styles.bullets}>
            <div className={styles['bullets-header']}>
              <label>Bullets ({exp.bullets.length})</label>
              <button className="btn btn-sm btn-secondary" onClick={() => addBullet(i)}>
                + Bullet
              </button>
            </div>
            {exp.bullets.map((b, bi) => (
              <div key={bi} className={styles['bullet-row']}>
                <input
                  value={b.text}
                  onChange={(e) => updateBullet(i, bi, e.target.value)}
                  placeholder="Accomplishment or responsibility..."
                />
                <select
                  value={b.category}
                  onChange={(e) => {
                    const exps = [...form.experience];
                    const bullets = [...exps[i].bullets];
                    bullets[bi] = { ...bullets[bi], category: e.target.value as any };
                    exps[i] = { ...exps[i], bullets };
                    setForm({ ...form, experience: exps });
                  }}
                >
                  <option value="technical">Technical</option>
                  <option value="leadership">Leadership</option>
                  <option value="impact">Impact</option>
                  <option value="collaboration">Collaboration</option>
                  <option value="process">Process</option>
                  <option value="other">Other</option>
                </select>
                <button
                  className={styles['remove-btn']}
                  onClick={() => removeBullet(i, bi)}
                  title="Remove bullet"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skills Section ───
function SkillsSection({ form, setForm }: SectionProps) {
  const addSkill = () => {
    setForm({
      ...form,
      skills: [
        ...form.skills,
        { name: '', aliases: [], proficiency: 'intermediate' as const, category: '' },
      ],
    });
  };

  const removeSkill = (idx: number) => {
    setForm({ ...form, skills: form.skills.filter((_, i) => i !== idx) });
  };

  const updateSkill = (idx: number, field: string, value: unknown) => {
    const skills = [...form.skills];
    skills[idx] = { ...skills[idx], [field]: value };
    setForm({ ...form, skills });
  };

  return (
    <div className={styles.section}>
      <div className={styles['section-header']}>
        <h2>Skills</h2>
        <button className="btn btn-sm btn-primary" onClick={addSkill}>
          + Add
        </button>
      </div>
      <div className={styles['skill-grid']}>
        {form.skills.map((skill, i) => (
          <div key={i} className={styles['skill-row']}>
            <input
              value={skill.name}
              onChange={(e) => updateSkill(i, 'name', e.target.value)}
              placeholder="Skill name"
              className={styles['skill-name']}
            />
            <input
              value={skill.category}
              onChange={(e) => updateSkill(i, 'category', e.target.value)}
              placeholder="Category"
              className={styles['skill-cat']}
            />
            <select
              value={skill.proficiency}
              onChange={(e) => updateSkill(i, 'proficiency', e.target.value)}
            >
              <option value="expert">Expert</option>
              <option value="advanced">Advanced</option>
              <option value="intermediate">Intermediate</option>
            </select>
            <button className={styles['remove-btn']} onClick={() => removeSkill(i)} title="Remove">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Education Section ───
function EducationSection({ form, setForm }: SectionProps) {
  const addEducation = () => {
    setForm({
      ...form,
      education: [
        ...form.education,
        {
          id: crypto.randomUUID(),
          institution: '',
          degree: '',
          field: '',
          startDate: '',
          highlights: [],
        },
      ],
    });
  };

  const removeEducation = (idx: number) => {
    setForm({ ...form, education: form.education.filter((_, i) => i !== idx) });
  };

  const updateEdu = (idx: number, field: string, value: unknown) => {
    const edus = [...form.education];
    edus[idx] = { ...edus[idx], [field]: value };
    setForm({ ...form, education: edus });
  };

  return (
    <div className={styles.section}>
      <div className={styles['section-header']}>
        <h2>Education</h2>
        <button className="btn btn-sm btn-primary" onClick={addEducation}>
          + Add
        </button>
      </div>
      {form.education.map((edu, i) => (
        <div key={edu.id} className={styles.card}>
          <div className={styles['card-header']}>
            <span className={styles['card-title']}>
              {edu.degree || 'New Degree'} — {edu.institution || 'Institution'}
            </span>
            <button className="btn btn-sm btn-danger" onClick={() => removeEducation(i)}>
              Remove
            </button>
          </div>
          <div className={styles.grid}>
            <Field
              label="Institution"
              value={edu.institution}
              onChange={(v) => updateEdu(i, 'institution', v)}
            />
            <Field label="Degree" value={edu.degree} onChange={(v) => updateEdu(i, 'degree', v)} />
            <Field
              label="Field of Study"
              value={edu.field}
              onChange={(v) => updateEdu(i, 'field', v)}
            />
            <Field
              label="Start Date"
              value={edu.startDate}
              onChange={(v) => updateEdu(i, 'startDate', v)}
            />
            <Field
              label="End Date"
              value={edu.endDate || ''}
              onChange={(v) => updateEdu(i, 'endDate', v)}
            />
            <Field label="GPA" value={edu.gpa || ''} onChange={(v) => updateEdu(i, 'gpa', v)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Projects Section ───
function ProjectsSection({ form, setForm }: SectionProps) {
  const addProject = () => {
    setForm({
      ...form,
      projects: [
        ...form.projects,
        { id: crypto.randomUUID(), name: '', description: '', tags: [], highlights: [] },
      ],
    });
  };

  const removeProject = (idx: number) => {
    setForm({ ...form, projects: form.projects.filter((_, i) => i !== idx) });
  };

  const updateProj = (idx: number, field: string, value: unknown) => {
    const projs = [...form.projects];
    projs[idx] = { ...projs[idx], [field]: value };
    setForm({ ...form, projects: projs });
  };

  return (
    <div className={styles.section}>
      <div className={styles['section-header']}>
        <h2>Projects</h2>
        <button className="btn btn-sm btn-primary" onClick={addProject}>
          + Add
        </button>
      </div>
      {form.projects.map((proj, i) => (
        <div key={proj.id} className={styles.card}>
          <div className={styles['card-header']}>
            <span className={styles['card-title']}>{proj.name || 'New Project'}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeProject(i)}>
              Remove
            </button>
          </div>
          <div className={styles.grid}>
            <Field label="Name" value={proj.name} onChange={(v) => updateProj(i, 'name', v)} />
            <Field label="URL" value={proj.url || ''} onChange={(v) => updateProj(i, 'url', v)} />
            <Field
              label="Tags"
              value={proj.tags.join(', ')}
              onChange={(v) =>
                updateProj(
                  i,
                  'tags',
                  v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          <div className={styles.field} style={{ marginTop: 8 }}>
            <label>Description</label>
            <textarea
              className={styles.textarea}
              value={proj.description}
              onChange={(e) => updateProj(i, 'description', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Certifications Section ───
function CertificationsSection({ form, setForm }: SectionProps) {
  const addCert = () => {
    setForm({
      ...form,
      certifications: [
        ...form.certifications,
        { id: crypto.randomUUID(), name: '', issuer: '', date: '', tags: [] },
      ],
    });
  };

  const removeCert = (idx: number) => {
    setForm({ ...form, certifications: form.certifications.filter((_, i) => i !== idx) });
  };

  const updateCert = (idx: number, field: string, value: unknown) => {
    const certs = [...form.certifications];
    certs[idx] = { ...certs[idx], [field]: value };
    setForm({ ...form, certifications: certs });
  };

  return (
    <div className={styles.section}>
      <div className={styles['section-header']}>
        <h2>Certifications</h2>
        <button className="btn btn-sm btn-primary" onClick={addCert}>
          + Add
        </button>
      </div>
      {form.certifications.map((cert, i) => (
        <div key={cert.id} className={styles.card}>
          <div className={styles['card-header']}>
            <span className={styles['card-title']}>{cert.name || 'New Certification'}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeCert(i)}>
              Remove
            </button>
          </div>
          <div className={styles.grid}>
            <Field label="Name" value={cert.name} onChange={(v) => updateCert(i, 'name', v)} />
            <Field
              label="Issuer"
              value={cert.issuer}
              onChange={(v) => updateCert(i, 'issuer', v)}
            />
            <Field label="Date" value={cert.date} onChange={(v) => updateCert(i, 'date', v)} />
            <Field label="URL" value={cert.url || ''} onChange={(v) => updateCert(i, 'url', v)} />
            <Field
              label="Tags"
              value={cert.tags.join(', ')}
              onChange={(v) =>
                updateCert(
                  i,
                  'tags',
                  v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
