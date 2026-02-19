import puppeteer from 'puppeteer';
import type { ResumeData, CoverLetterData } from '@resu/shared';
import { renderResumeHTML, renderCoverLetterHTML } from './htmlRenderer.js';

export async function generatePDF(
  resumeData: ResumeData,
  templateId: string,
  pageSize: 'letter' | 'a4' = 'letter',
): Promise<Buffer> {
  const html = renderResumeHTML(resumeData, templateId);
  return renderHTMLToPDF(html, pageSize);
}

export async function generateCoverLetterPDF(
  coverLetter: CoverLetterData,
  contactName: string,
  company: string,
  jobTitle: string,
  pageSize: 'letter' | 'a4' = 'letter',
): Promise<Buffer> {
  const html = renderCoverLetterHTML(coverLetter, contactName, company, jobTitle);
  return renderHTMLToPDF(html, pageSize);
}

async function renderHTMLToPDF(html: string, pageSize: 'letter' | 'a4'): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: pageSize === 'letter' ? 'Letter' : 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
