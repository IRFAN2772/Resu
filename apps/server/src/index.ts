import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root (Turborepo runs from apps/server/, so go 2 levels up)
config({ path: resolve(process.cwd(), '../../.env') });
// Also try local .env as fallback for standalone use
config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDatabase } from './db/init.js';
import { loadProfile } from './services/profile.js';
import { generateRoutes } from './routes/generate.js';
import { resumeRoutes } from './routes/resumes.js';
import { templateRoutes } from './routes/templates.js';
import { profileRoutes } from './routes/profile.js';
import { exportRoutes } from './routes/export.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = Fastify({ logger: true });

  // CORS for dev
  await app.register(cors, {
    origin: ['http://localhost:5173'],
  });

  // Initialize database
  const db = initDatabase();
  app.decorate('db', db);

  // Load and validate profile
  const profile = loadProfile();
  app.decorate('profile', profile);

  // Register routes
  await app.register(generateRoutes, { prefix: '/api' });
  await app.register(resumeRoutes, { prefix: '/api' });
  await app.register(templateRoutes, { prefix: '/api' });
  await app.register(profileRoutes, { prefix: '/api' });
  await app.register(exportRoutes, { prefix: '/api' });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok' }));

  // Start
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 Resu server running on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
