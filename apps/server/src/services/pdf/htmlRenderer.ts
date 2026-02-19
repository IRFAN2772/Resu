// Server-side HTML renderer for PDF generation.
// Generates a complete HTML document with inline styles for Puppeteer.

import type { ResumeData, CoverLetterData } from '@resu/shared';

export function renderResumeHTML(resumeData: ResumeData, templateId: string): string {
  const css = getTemplateCSS(templateId);
  const body = renderBody(resumeData, templateId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function renderBody(data: ResumeData, templateId: string): string {
  const isMinimal = templateId === 'clean-minimal';
  const accentColor = isMinimal ? '#2563eb' : '#000000';

  return `
<div class="resume">
  <!-- Header / Contact -->
  <header class="header">
    <h1 class="name">${escapeHTML(data.contact.name)}</h1>
    <div class="contact-info">
      ${[
        data.contact.email,
        data.contact.phone,
        data.contact.location,
        data.contact.linkedin,
        data.contact.github,
        data.contact.website,
      ]
        .filter(Boolean)
        .map((item) => `<span>${escapeHTML(item!)}</span>`)
        .join(' <span class="sep">|</span> ')}
    </div>
  </header>

  <!-- Professional Summary -->
  ${
    data.summary
      ? `
  <section class="section">
    <h2 class="section-title" style="color: ${accentColor}">Professional Summary</h2>
    <p class="summary">${escapeHTML(data.summary)}</p>
  </section>`
      : ''
  }

  <!-- Experience -->
  ${
    data.experience.length > 0
      ? `
  <section class="section">
    <h2 class="section-title" style="color: ${accentColor}">Experience</h2>
    ${data.experience
      .map(
        (exp) => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">${escapeHTML(exp.title)}</span>
          <span class="entry-company"> — ${escapeHTML(exp.company)}</span>
          ${exp.location ? `<span class="entry-location">, ${escapeHTML(exp.location)}</span>` : ''}
        </div>
        <span class="entry-dates">${escapeHTML(exp.startDate)}${exp.endDate ? ` – ${escapeHTML(exp.endDate)}` : ' – Present'}</span>
      </div>
      <ul class="bullets">
        ${exp.bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join('\n        ')}
      </ul>
    </div>`,
      )
      .join('\n')}
  </section>`
      : ''
  }

  <!-- Education -->
  ${
    data.education.length > 0
      ? `
  <section class="section">
    <h2 class="section-title" style="color: ${accentColor}">Education</h2>
    ${data.education
      .map(
        (edu) => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">${escapeHTML(edu.degree)} in ${escapeHTML(edu.field)}</span>
          <span class="entry-company"> — ${escapeHTML(edu.institution)}</span>
        </div>
        <span class="entry-dates">${escapeHTML(edu.startDate)}${edu.endDate ? ` – ${escapeHTML(edu.endDate)}` : ''}</span>
      </div>
      ${edu.gpa ? `<p class="gpa">GPA: ${escapeHTML(edu.gpa)}</p>` : ''}
      ${edu.highlights.length > 0 ? `<ul class="bullets">${edu.highlights.map((h) => `<li>${escapeHTML(h)}</li>`).join('')}</ul>` : ''}
    </div>`,
      )
      .join('\n')}
  </section>`
      : ''
  }

  <!-- Skills -->
  ${
    data.skills.categories.length > 0
      ? `
  <section class="section">
    <h2 class="section-title" style="color: ${accentColor}">Skills</h2>
    <div class="skills">
      ${data.skills.categories
        .map(
          (cat) => `
      <div class="skill-category">
        <strong>${escapeHTML(cat.name)}:</strong> ${cat.skills.map((s) => escapeHTML(s)).join(', ')}
      </div>`,
        )
        .join('\n')}
    </div>
  </section>`
      : ''
  }

  <!-- Projects -->
  ${
    data.projects.length > 0
      ? `
  <section class="section">
    <h2 class="section-title" style="color: ${accentColor}">Projects</h2>
    ${data.projects
      .map(
        (proj) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHTML(proj.name)}</span>
        ${proj.url ? `<a href="${escapeHTML(proj.url)}" class="link">${escapeHTML(proj.url)}</a>` : ''}
      </div>
      <p>${escapeHTML(proj.description)}</p>
      ${proj.highlights.length > 0 ? `<ul class="bullets">${proj.highlights.map((h) => `<li>${escapeHTML(h)}</li>`).join('')}</ul>` : ''}
    </div>`,
      )
      .join('\n')}
  </section>`
      : ''
  }

  <!-- Certifications -->
  ${
    data.certifications.length > 0
      ? `
  <section class="section">
    <h2 class="section-title" style="color: ${accentColor}">Certifications</h2>
    <ul class="bullets">
      ${data.certifications.map((cert) => `<li><strong>${escapeHTML(cert.name)}</strong> — ${escapeHTML(cert.issuer)} (${escapeHTML(cert.date)})</li>`).join('\n')}
    </ul>
  </section>`
      : ''
  }
</div>`;
}

function getTemplateCSS(templateId: string): string {
  const base = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #1a1a1a; }
    .resume { max-width: 100%; padding: 0; }
    .header { text-align: center; margin-bottom: 16px; }
    .name { font-size: 22pt; font-weight: 700; letter-spacing: 0.5px; }
    .contact-info { font-size: 9.5pt; color: #444; margin-top: 4px; }
    .contact-info .sep { margin: 0 6px; }
    .section { margin-bottom: 12px; }
    .section-title { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333; padding-bottom: 2px; margin-bottom: 8px; }
    .entry { margin-bottom: 10px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
    .entry-title { font-weight: 700; }
    .entry-company { font-style: italic; }
    .entry-location { font-size: 9.5pt; color: #555; }
    .entry-dates { font-size: 9.5pt; color: #555; white-space: nowrap; }
    .summary { font-size: 10.5pt; color: #333; }
    .bullets { margin-left: 18px; margin-top: 4px; }
    .bullets li { margin-bottom: 2px; font-size: 10.5pt; }
    .gpa { font-size: 10pt; color: #555; margin-top: 2px; }
    .skills { font-size: 10.5pt; }
    .skill-category { margin-bottom: 3px; }
    .link { font-size: 9pt; color: #2563eb; text-decoration: none; margin-left: 8px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  if (templateId === 'clean-minimal') {
    return (
      base +
      `
      body { font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif; }
      .name { color: #2563eb; }
      .section-title { color: #2563eb; border-bottom-color: #2563eb; }
    `
    );
  }

  // ats-classic: just base styles (conservative)
  return base;
}

// ─── Cover Letter Renderer ───

export function renderCoverLetterHTML(
  coverLetter: CoverLetterData,
  contactName: string,
  company: string,
  jobTitle: string,
): string {
  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; }
    .cover-letter { max-width: 100%; padding: 0; }
    .cl-header { margin-bottom: 24px; }
    .cl-name { font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
    .cl-date { font-size: 10pt; color: #555; margin-bottom: 16px; }
    .cl-recipient { font-size: 10.5pt; margin-bottom: 16px; line-height: 1.5; }
    .cl-body p { margin-bottom: 12px; text-align: justify; font-size: 10.5pt; }
    .cl-closing { margin-top: 24px; font-size: 10.5pt; }
    .cl-signature { margin-top: 32px; font-weight: 700; font-size: 11pt; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="cover-letter">
    <div class="cl-header">
      <div class="cl-name">${escapeHTML(contactName)}</div>
      <div class="cl-date">${escapeHTML(today)}</div>
      <div class="cl-recipient">
        RE: ${escapeHTML(jobTitle)}<br/>
        ${escapeHTML(company)}
      </div>
    </div>
    <div class="cl-body">
      <p>${escapeHTML(coverLetter.opening)}</p>
      ${coverLetter.bodyParagraphs.map((p) => `<p>${escapeHTML(p)}</p>`).join('\n      ')}
      <p>${escapeHTML(coverLetter.closing)}</p>
    </div>
    <div class="cl-signature">${escapeHTML(contactName)}</div>
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
