import type { FastifyPluginAsync } from 'fastify';
import { ExportRequestSchema, type ExportRequest } from '@resu/shared';
import { getResume, updateResume } from '../db/queries.js';
import { generatePDF, generateCoverLetterPDF } from '../services/pdf/pdfGenerator.js';

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { id: string }; Body: ExportRequest }>(
    '/resume/:id/export',
    async (request, reply) => {
      const resume = getResume(app.db, request.params.id);
      if (!resume) {
        return reply.status(404).send({ error: 'Resume not found' });
      }

      const parseResult = ExportRequestSchema.safeParse(request.body || {});
      const exportConfig = parseResult.success
        ? parseResult.data
        : { type: 'resume' as const, pageSize: 'letter' as const };

      try {
        let pdfBuffer: Buffer;
        let filename: string;

        if (exportConfig.type === 'cover-letter') {
          if (!resume.coverLetter) {
            return reply.status(400).send({ error: 'No cover letter found for this resume' });
          }
          pdfBuffer = await generateCoverLetterPDF(
            resume.coverLetter,
            resume.resumeData.contact.name,
            resume.company,
            resume.jobTitle,
            exportConfig.pageSize,
          );
          filename = `${resume.company}-${resume.jobTitle}-cover-letter.pdf`;
        } else {
          pdfBuffer = await generatePDF(
            resume.resumeData,
            resume.templateId,
            exportConfig.pageSize,
          );
          filename = `${resume.company}-${resume.jobTitle}-resume.pdf`;
        }

        // Mark as exported
        updateResume(app.db, request.params.id, { status: 'exported' });

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(pdfBuffer);
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: 'Failed to generate PDF',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );
};
