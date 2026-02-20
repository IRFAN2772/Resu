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
    description:
      'Subtle accent colors, clear typographic hierarchy. ATS-friendly with visual appeal.',
  },
  {
    id: 'modern-two-column',
    name: 'Modern Two-Column',
    description:
      'Two-column layout with accent color sidebar. Skills and education on the right, experience on the left.',
  },
  {
    id: 'executive',
    name: 'Executive',
    description:
      'Serif-accented premium design for senior professionals. Classic elegance with modern structure.',
  },
];

export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/templates', async () => {
    return TEMPLATES;
  });
};
