import type { FastifyPluginAsync } from 'fastify';
import type { TemplateInfo } from '@resu/shared';

// Template registry — add new templates here
const TEMPLATES: TemplateInfo[] = [
  {
    id: 'ats-classic',
    name: 'ATS Classic',
    description: 'Single column, no color, maximum ATS compatibility. The safe default.',
  },
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    description: 'Subtle accent colors, clear typographic hierarchy. ATS-friendly with visual appeal.',
  },
];

export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/templates', async () => {
    return TEMPLATES;
  });
};
