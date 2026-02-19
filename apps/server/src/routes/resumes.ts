import type { FastifyPluginAsync } from 'fastify';
import { UpdateResumeRequestSchema, type UpdateResumeRequest } from '@resu/shared';
import { listResumes, getResume, updateResume, deleteResume } from '../db/queries.js';

export const resumeRoutes: FastifyPluginAsync = async (app) => {
  // ─── List all resumes ───
  app.get('/resumes', async () => {
    return listResumes(app.db);
  });

  // ─── Get a single resume ───
  app.get<{ Params: { id: string } }>('/resume/:id', async (request, reply) => {
    const resume = getResume(app.db, request.params.id);
    if (!resume) {
      return reply.status(404).send({ error: 'Resume not found' });
    }
    return resume;
  });

  // ─── Update a resume ───
  app.put<{ Params: { id: string }; Body: UpdateResumeRequest }>(
    '/resume/:id',
    async (request, reply) => {
      const parseResult = UpdateResumeRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const updated = updateResume(app.db, request.params.id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({ error: 'Resume not found' });
      }

      return { success: true };
    },
  );

  // ─── Delete a resume ───
  app.delete<{ Params: { id: string } }>('/resume/:id', async (request, reply) => {
    const deleted = deleteResume(app.db, request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Resume not found' });
    }
    return { success: true };
  });
};
