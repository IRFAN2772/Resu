import { loadProfile } from '../services/profile.js';

// Standalone script: validate profile.json against the Zod schema.
// Usage: npm run validate-profile

try {
  const profile = loadProfile();
  console.log('\n✅ Profile is valid!');
  console.log(`   Name: ${profile.contact.name}`);
  console.log(`   Experience entries: ${profile.experience.length}`);
  console.log(`   Skills: ${profile.skills.length}`);
  console.log(`   Projects: ${profile.projects.length}`);
  console.log(`   Certifications: ${profile.certifications.length}`);
  console.log(`   Achievements: ${profile.achievements.length}`);

  // Check for common issues
  const warnings: string[] = [];
  for (const exp of profile.experience) {
    if (exp.bullets.length === 0) {
      warnings.push(`Experience "${exp.title} @ ${exp.company}" has no bullets`);
    }
    for (const bullet of exp.bullets) {
      if (bullet.tags.length === 0) {
        warnings.push(`Bullet in "${exp.title} @ ${exp.company}" has no tags: "${bullet.text.slice(0, 50)}..."`);
      }
    }
  }
  for (const skill of profile.skills) {
    if (skill.aliases.length === 0) {
      warnings.push(`Skill "${skill.name}" has no aliases`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warnings:`);
    for (const w of warnings) {
      console.log(`   → ${w}`);
    }
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
