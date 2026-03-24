// ─── Skill Dependency Graph ───
// Deterministic, code-based inference of foundational/parent skills,
// related technologies, and certification-to-skill mappings.
// This runs BEFORE AI selection to ensure no implicit skills are missed.

/**
 * Maps a technology → its foundational/parent skills that should be inferred.
 * If a user knows React, they inherently know JavaScript, etc.
 */
const SKILL_PARENTS: Record<string, string[]> = {
  // Frontend Frameworks → Languages
  'react': ['JavaScript', 'HTML', 'CSS'],
  'next.js': ['React', 'JavaScript', 'HTML', 'CSS'],
  'vue': ['JavaScript', 'HTML', 'CSS'],
  'nuxt': ['Vue', 'JavaScript', 'HTML', 'CSS'],
  'angular': ['TypeScript', 'JavaScript', 'HTML', 'CSS'],
  'svelte': ['JavaScript', 'HTML', 'CSS'],
  'sveltekit': ['Svelte', 'JavaScript', 'HTML', 'CSS'],

  // Backend Frameworks → Languages
  'node.js': ['JavaScript'],
  'express': ['Node.js', 'JavaScript'],
  'fastify': ['Node.js', 'JavaScript'],
  'nest.js': ['Node.js', 'TypeScript', 'JavaScript'],
  'django': ['Python'],
  'flask': ['Python'],
  'fastapi': ['Python'],
  'spring': ['Java'],
  'spring boot': ['Spring', 'Java'],
  'ruby on rails': ['Ruby'],
  'laravel': ['PHP'],
  'gin': ['Go'],
  'fiber': ['Go'],
  'actix': ['Rust'],
  'axum': ['Rust'],
  'asp.net': ['C#', '.NET'],

  // TypeScript implies JavaScript
  'typescript': ['JavaScript'],

  // Mobile
  'react native': ['React', 'JavaScript'],
  'flutter': ['Dart'],
  'swiftui': ['Swift'],
  'jetpack compose': ['Kotlin'],

  // CSS frameworks → CSS
  'tailwind css': ['CSS'],
  'bootstrap': ['CSS', 'HTML'],
  'sass': ['CSS'],
  'styled-components': ['CSS', 'React'],
  'material ui': ['React', 'CSS'],

  // Databases → Data concepts
  'postgresql': ['SQL', 'Databases'],
  'mysql': ['SQL', 'Databases'],
  'mongodb': ['NoSQL', 'Databases'],
  'redis': ['Caching', 'Databases'],
  'elasticsearch': ['Search', 'Databases'],
  'dynamodb': ['NoSQL', 'AWS', 'Databases'],
  'firebase': ['NoSQL', 'Google Cloud'],
  'prisma': ['Databases', 'ORM'],
  'sequelize': ['Databases', 'ORM', 'Node.js'],
  'typeorm': ['Databases', 'ORM', 'TypeScript'],

  // Cloud & DevOps → Fundamentals
  'docker': ['Containerization', 'CLI'],
  'kubernetes': ['Docker', 'Containerization', 'Orchestration'],
  'terraform': ['Infrastructure as Code', 'Cloud Computing'],
  'aws': ['Cloud Computing'],
  'azure': ['Cloud Computing'],
  'google cloud': ['Cloud Computing'],
  'github actions': ['CI/CD', 'Git'],
  'jenkins': ['CI/CD'],
  'gitlab ci': ['CI/CD', 'Git'],
  'circleci': ['CI/CD'],

  // Testing → Methodology
  'jest': ['Testing', 'JavaScript'],
  'vitest': ['Testing', 'JavaScript'],
  'cypress': ['Testing', 'JavaScript', 'E2E Testing'],
  'playwright': ['Testing', 'E2E Testing'],
  'pytest': ['Testing', 'Python'],
  'junit': ['Testing', 'Java'],

  // Build tools
  'webpack': ['JavaScript', 'Build Tools'],
  'vite': ['JavaScript', 'Build Tools'],
  'rollup': ['JavaScript', 'Build Tools'],

  // API styles
  'graphql': ['API Design'],
  'rest api': ['API Design', 'HTTP'],
  'grpc': ['API Design'],

  // Messaging & Real-time
  'kafka': ['Event-Driven Architecture', 'Distributed Systems'],
  'rabbitmq': ['Message Queues', 'Distributed Systems'],
  'websocket': ['Real-time Communication'],
  'socket.io': ['WebSocket', 'Real-time Communication', 'Node.js'],

  // Data & ML
  'tensorflow': ['Machine Learning', 'Python'],
  'pytorch': ['Machine Learning', 'Python'],
  'pandas': ['Data Analysis', 'Python'],
  'numpy': ['Python'],
  'scikit-learn': ['Machine Learning', 'Python'],

  // Monitoring & Logging
  'datadog': ['Monitoring', 'Observability'],
  'grafana': ['Monitoring', 'Observability'],
  'prometheus': ['Monitoring', 'Observability'],
};

/**
 * Maps a technology → sibling/related skills that strengthen a resume narrative.
 * These aren't strictly inferred, but are commonly paired and demonstrate breadth.
 */
const SKILL_SIBLINGS: Record<string, string[]> = {
  'react': ['Component Architecture', 'State Management', 'Single Page Applications'],
  'node.js': ['Server-side JavaScript', 'Backend Development'],
  'typescript': ['Type Safety', 'Static Analysis'],
  'docker': ['Microservices'],
  'kubernetes': ['Cloud Native', 'Microservices', 'Scalability'],
  'aws': ['S3', 'Lambda', 'EC2', 'CloudFormation'],
  'azure': ['Azure DevOps', 'Azure Functions'],
  'postgresql': ['Data Modeling', 'Query Optimization'],
  'mongodb': ['Document Databases', 'Schema Design'],
  'graphql': ['Apollo', 'Schema Design'],
  'rest api': ['RESTful Services', 'HTTP Methods'],
  'git': ['Version Control', 'Code Review'],
  'agile': ['Scrum', 'Sprint Planning', 'JIRA'],
};

/**
 * Maps certification names → technologies they validate.
 * Normalized to lowercase for matching.
 */
const CERT_SKILL_MAP: Record<string, string[]> = {
  'javascript': ['JavaScript', 'ES6+', 'Web Development'],
  'javascript + dsa': ['JavaScript', 'Data Structures', 'Algorithms', 'Problem Solving'],
  'node.js': ['Node.js', 'JavaScript', 'Backend Development', 'Server-side Development'],
  'react': ['React', 'JavaScript', 'Frontend Development', 'Component Architecture'],
  'python': ['Python', 'Programming'],
  'java': ['Java', 'OOP'],
  'oracle': ['Oracle', 'SQL', 'Databases'],
  'aws solutions architect': ['AWS', 'Cloud Architecture', 'Cloud Computing'],
  'aws developer': ['AWS', 'Cloud Development', 'Serverless'],
  'aws cloud practitioner': ['AWS', 'Cloud Computing'],
  'azure fundamentals': ['Azure', 'Cloud Computing'],
  'azure developer': ['Azure', 'Cloud Development'],
  'google cloud associate': ['Google Cloud', 'Cloud Computing'],
  'kubernetes': ['Kubernetes', 'Docker', 'Orchestration'],
  'docker': ['Docker', 'Containerization'],
  'terraform': ['Terraform', 'Infrastructure as Code'],
  'pmp': ['Project Management', 'Leadership'],
  'scrum master': ['Agile', 'Scrum', 'Project Management'],
};

/**
 * Maps project tags → technologies/domains they demonstrate.
 */
const PROJECT_TAG_EXPANSIONS: Record<string, string[]> = {
  'node.js': ['JavaScript', 'Backend Development'],
  'react': ['JavaScript', 'Frontend Development'],
  'next.js': ['React', 'JavaScript', 'Full-stack Development'],
  'python': ['Python', 'Programming'],
  'ai': ['Artificial Intelligence', 'Machine Learning'],
  'computer-vision': ['Computer Vision', 'Image Processing'],
  'cli': ['Command Line Tools', 'Developer Tools'],
  'open-source': ['Open Source', 'Collaboration'],
  'typescript': ['TypeScript', 'JavaScript'],
  'three.js': ['3D Graphics', 'WebGL', 'JavaScript'],
  'framer motion': ['Animation', 'React'],
  'gsap': ['Animation', 'JavaScript'],
  'tailwind css': ['CSS', 'Styling'],
};

// ─── Public API ───

export interface SkillInference {
  /** Skills directly from the profile */
  explicit: string[];
  /** Skills inferred from the dependency graph */
  inferred: string[];
  /** All skills (explicit + inferred), deduplicated */
  all: string[];
}

export interface CertInference {
  certId: string;
  certName: string;
  /** Technologies this cert validates */
  validatesSkills: string[];
}

export interface ProjectInference {
  projectId: string;
  projectName: string;
  /** Technologies demonstrated by this project */
  demonstratesSkills: string[];
}

export interface ExperienceInference {
  experienceId: string;
  /** Additional skills inferred from experience bullet tags */
  inferredSkills: string[];
}

export interface ProfileInferences {
  skills: SkillInference;
  certifications: CertInference[];
  projects: ProjectInference[];
  experiences: ExperienceInference[];
  /** Skills from the JD that the user has (explicitly or inferred) */
  matchedJDSkills: string[];
  /** Skills from the JD that the user does NOT have */
  missingJDSkills: string[];
}

/**
 * Main entry: analyze the user's profile against a parsed JD and return
 * all inferred skills, cert mappings, project mappings, and gap analysis.
 */
export function inferProfileSkills(
  profileSkills: Array<{ name: string; aliases?: string[] }>,
  profileCerts: Array<{ id: string; name: string; tags?: string[] }>,
  profileProjects: Array<{ id: string; name: string; tags: string[] }>,
  profileExperiences: Array<{ id: string; bullets: Array<{ tags: string[] }> }>,
  jdKeywords: string[],
  jdRequiredSkills: string[],
  jdPreferredSkills: string[],
): ProfileInferences {
  // 1. Collect all explicit skill names and aliases
  const explicitNames = new Set<string>();
  const lowerToOriginal = new Map<string, string>();

  for (const skill of profileSkills) {
    explicitNames.add(skill.name);
    lowerToOriginal.set(skill.name.toLowerCase(), skill.name);
    for (const alias of skill.aliases ?? []) {
      lowerToOriginal.set(alias.toLowerCase(), skill.name);
    }
  }

  // 2. Expand skills using parent graph (recursive)
  const inferredNames = new Set<string>();
  const visited = new Set<string>();

  function expandSkill(skillName: string) {
    const lower = skillName.toLowerCase();
    if (visited.has(lower)) return;
    visited.add(lower);

    const parents = SKILL_PARENTS[lower];
    if (parents) {
      for (const parent of parents) {
        if (!explicitNames.has(parent) && !inferredNames.has(parent)) {
          inferredNames.add(parent);
        }
        expandSkill(parent); // recurse to get grandparents
      }
    }
  }

  for (const skill of profileSkills) {
    expandSkill(skill.name);
    for (const alias of skill.aliases ?? []) {
      expandSkill(alias);
    }
  }

  // 3. Also expand from experience bullet tags
  const experienceInferences: ExperienceInference[] = [];
  for (const exp of profileExperiences) {
    const expInferred = new Set<string>();
    for (const bullet of exp.bullets) {
      for (const tag of bullet.tags) {
        expandSkill(tag);
        const parents = SKILL_PARENTS[tag.toLowerCase()];
        if (parents) {
          for (const p of parents) expInferred.add(p);
        }
      }
    }
    if (expInferred.size > 0) {
      experienceInferences.push({
        experienceId: exp.id,
        inferredSkills: Array.from(expInferred),
      });
    }
  }

  const allSkills = new Set([
    ...Array.from(explicitNames),
    ...Array.from(inferredNames),
  ]);

  // 4. Map certifications to skills they validate
  const certInferences: CertInference[] = profileCerts.map((cert) => {
    const certLower = cert.name.toLowerCase().trim();
    // Try exact match first, then partial
    let validatesSkills = CERT_SKILL_MAP[certLower];
    if (!validatesSkills) {
      // Try partial matching - find keys that are contained in cert name or vice versa
      for (const [key, skills] of Object.entries(CERT_SKILL_MAP)) {
        if (certLower.includes(key) || key.includes(certLower)) {
          validatesSkills = skills;
          break;
        }
      }
    }
    return {
      certId: cert.id,
      certName: cert.name,
      validatesSkills: validatesSkills ?? [],
    };
  });

  // Add cert-validated skills to the all-skills pool
  for (const ci of certInferences) {
    for (const s of ci.validatesSkills) {
      allSkills.add(s);
    }
  }

  // 5. Map projects to skills they demonstrate
  const projectInferences: ProjectInference[] = profileProjects.map((proj) => {
    const demonstratesSkills = new Set<string>();
    for (const tag of proj.tags) {
      const tagLower = tag.toLowerCase();
      const expansions = PROJECT_TAG_EXPANSIONS[tagLower];
      if (expansions) {
        for (const s of expansions) demonstratesSkills.add(s);
      }
      // Also check parent graph for project tags
      const parents = SKILL_PARENTS[tagLower];
      if (parents) {
        for (const p of parents) demonstratesSkills.add(p);
      }
    }
    return {
      projectId: proj.id,
      projectName: proj.name,
      demonstratesSkills: Array.from(demonstratesSkills),
    };
  });

  // 6. Match against JD
  const allLower = new Set(Array.from(allSkills).map((s) => s.toLowerCase()));
  const allJDSkills = new Set([
    ...jdKeywords.map((k) => k.toLowerCase()),
    ...jdRequiredSkills.map((k) => k.toLowerCase()),
    ...jdPreferredSkills.map((k) => k.toLowerCase()),
  ]);

  const matchedJDSkills: string[] = [];
  const missingJDSkills: string[] = [];

  for (const jdSkill of allJDSkills) {
    // Check for exact match or if any all-skill contains/is contained by jd skill
    const matched = allLower.has(jdSkill) ||
      Array.from(allLower).some((s) =>
        (s.length >= 3 && jdSkill.includes(s)) || (jdSkill.length >= 3 && s.includes(jdSkill))
      );

    if (matched) {
      matchedJDSkills.push(jdSkill);
    } else {
      missingJDSkills.push(jdSkill);
    }
  }

  return {
    skills: {
      explicit: Array.from(explicitNames),
      inferred: Array.from(inferredNames),
      all: Array.from(allSkills),
    },
    certifications: certInferences,
    projects: projectInferences,
    experiences: experienceInferences,
    matchedJDSkills,
    missingJDSkills,
  };
}

/**
 * Given a set of selected skill names, expand them to include
 * foundational/parent skills that should also appear on the resume.
 */
export function expandSelectedSkills(selectedSkills: string[]): string[] {
  const expanded = new Set(selectedSkills);
  const visited = new Set<string>();

  for (const skill of selectedSkills) {
    const lower = skill.toLowerCase();
    if (visited.has(lower)) continue;
    visited.add(lower);

    const parents = SKILL_PARENTS[lower];
    if (parents) {
      for (const parent of parents) {
        expanded.add(parent);
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Find certifications relevant to a set of JD skills.
 * Returns cert IDs that validate any of the JD skills.
 */
export function findRelevantCerts(
  certs: Array<{ id: string; name: string }>,
  jdSkills: string[],
): string[] {
  const jdLower = new Set(jdSkills.map((s) => s.toLowerCase()));
  const relevantIds: string[] = [];

  for (const cert of certs) {
    const certLower = cert.name.toLowerCase().trim();
    let validatesSkills: string[] | undefined = CERT_SKILL_MAP[certLower];
    if (!validatesSkills) {
      for (const [key, skills] of Object.entries(CERT_SKILL_MAP)) {
        if (certLower.includes(key) || key.includes(certLower)) {
          validatesSkills = skills;
          break;
        }
      }
    }
    if (validatesSkills) {
      const isRelevant = validatesSkills.some((s) => {
        const sLower = s.toLowerCase();
        return jdLower.has(sLower) ||
          Array.from(jdLower).some((jd) =>
            (sLower.length >= 3 && jd.includes(sLower)) ||
            (jd.length >= 3 && sLower.includes(jd))
          );
      });
      if (isRelevant) relevantIds.push(cert.id);
    }
  }

  return relevantIds;
}

/**
 * Find projects relevant to a set of JD skills based on their tags.
 */
export function findRelevantProjects(
  projects: Array<{ id: string; tags: string[] }>,
  jdSkills: string[],
): string[] {
  const jdLower = new Set(jdSkills.map((s) => s.toLowerCase()));
  const relevantIds: string[] = [];

  for (const proj of projects) {
    const projSkills = new Set<string>();
    for (const tag of proj.tags) {
      projSkills.add(tag.toLowerCase());
      const expansions = PROJECT_TAG_EXPANSIONS[tag.toLowerCase()];
      if (expansions) {
        for (const e of expansions) projSkills.add(e.toLowerCase());
      }
      const parents = SKILL_PARENTS[tag.toLowerCase()];
      if (parents) {
        for (const p of parents) projSkills.add(p.toLowerCase());
      }
    }
    const isRelevant = Array.from(projSkills).some((ps) =>
      jdLower.has(ps) ||
      Array.from(jdLower).some((jd) =>
        (ps.length >= 3 && jd.includes(ps)) || (jd.length >= 3 && ps.includes(jd))
      )
    );
    if (isRelevant) relevantIds.push(proj.id);
  }

  return relevantIds;
}
