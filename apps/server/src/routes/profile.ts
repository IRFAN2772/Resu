import type { FastifyPluginAsync } from 'fastify';
import { PersonalProfileSchema } from '@resu/shared';
import { saveProfile, loadProfile } from '../services/profile.js';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/profile', async () => {
    return loadProfile();
  });

  app.put('/profile', async (request, reply) => {
    const result = PersonalProfileSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    saveProfile(result.data);

    return { success: true };
  });
};
