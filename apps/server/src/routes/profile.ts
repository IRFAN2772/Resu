import type { FastifyPluginAsync } from 'fastify';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/profile', async () => {
    return app.profile;
  });
};
