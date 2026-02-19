// Fastify type augmentation for our custom decorators.

import type Database from 'better-sqlite3';
import type { PersonalProfile } from '@resu/shared';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database.Database;
    profile: PersonalProfile;
  }
}
