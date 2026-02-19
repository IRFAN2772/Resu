import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersonalProfileSchema, type PersonalProfile } from '@resu/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = path.resolve(__dirname, '../../data/profile.json');

let cachedProfile: PersonalProfile | null = null;

export function loadProfile(): PersonalProfile {
  if (cachedProfile) return cachedProfile;

  if (!fs.existsSync(PROFILE_PATH)) {
    throw new Error(
      `Profile not found at ${PROFILE_PATH}. Copy profile.example.json to profile.json and fill in your data.`,
    );
  }

  const raw = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
  const result = PersonalProfileSchema.safeParse(raw);

  if (!result.success) {
    console.error('❌ Profile validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  → ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Profile validation failed. Fix the errors above.');
  }

  cachedProfile = result.data;
  console.log(`✅ Profile loaded: ${result.data.contact.name} — ${result.data.experience.length} experiences, ${result.data.skills.length} skills`);
  return cachedProfile;
}
