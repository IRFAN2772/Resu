# Resu — AI-Powered Personal Resume Builder

Resu is a local-first, AI-powered resume builder that ingests your full career profile, accepts a job description, and uses OpenAI GPT to generate a tailored resume + cover letter with ATS optimization. It renders editable templates in the browser and exports pixel-perfect PDFs via Puppeteer.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone & Setup](#clone--setup)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Setting Up Your Profile](#setting-up-your-profile)
- [Usage](#usage)
- [Available Scripts](#available-scripts)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Make sure you have the following installed on your machine:

| Tool | Minimum Version | Check with |
|------|----------------|------------|
| **Node.js** | v18+ | `node --version` |
| **npm** | v9+ | `npm --version` |
| **Git** | any recent | `git --version` |

You also need an **OpenAI API key** (get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)).

---

## Clone & Setup

### 1. Clone the repository

```bash
git clone <your-repo-url> Resu
cd Resu
```

> If you're opening in VS Code, you can also use:
> ```
> code Resu
> ```
> Then open the integrated terminal with `` Ctrl+` `` (or `` Cmd+` `` on macOS).

### 2. Install dependencies

From the **root** of the project (`Resu/`), run:

```bash
npm install --legacy-peer-deps
```

This single command installs dependencies for **all three packages** (client, server, and shared) thanks to npm workspaces. You do **not** need to `cd` into each folder separately.

> **Why `--legacy-peer-deps`?** Some packages have minor peer dependency version mismatches. This flag tells npm to proceed without blocking on those.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Set up your personal profile

```bash
cp apps/server/data/profile.json apps/server/data/profile.json.backup
```

Edit `apps/server/data/profile.json` with your actual career data (see [Setting Up Your Profile](#setting-up-your-profile) below).

### 5. Validate your profile

```bash
npm run validate-profile
```

This checks your `profile.json` against the schema and reports any issues (missing tags, empty arrays, etc.).

---

## Project Structure

```
Resu/
├── apps/
│   ├── client/              # Frontend — Vite + React + TypeScript
│   │   ├── src/
│   │   │   ├── components/  # Layout, resume templates
│   │   │   ├── lib/         # API client functions
│   │   │   ├── pages/       # Dashboard, Generate, Preview pages
│   │   │   ├── stores/      # Zustand state management
│   │   │   └── styles/      # Global CSS
│   │   └── index.html
│   │
│   └── server/              # Backend — Fastify + TypeScript
│       ├── data/
│       │   └── profile.json # Your personal career profile (edit this!)
│       └── src/
│           ├── db/          # SQLite database (init + queries)
│           ├── prompts/     # AI prompt templates (.txt files)
│           ├── routes/      # API endpoints
│           ├── scripts/     # CLI utilities (validate-profile)
│           ├── services/
│           │   ├── ai/      # OpenAI pipeline (parse, select, generate, score)
│           │   └── pdf/     # Puppeteer PDF generation
│           └── index.ts     # Server entry point
│
├── packages/
│   └── shared/              # Shared types + Zod schemas
│       └── src/types/       # TypeScript types used by both client & server
│
├── .env.example             # Environment variable template
├── turbo.json               # Turborepo configuration
└── package.json             # Root workspace config
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for GPT calls |
| `PORT` | No | Server port (default: `3001`) |

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/data/profile.json` | **Your career profile** — the source of truth for all resume generation |
| `.env` | API keys and local config (git-ignored) |
| `apps/server/src/prompts/*.txt` | AI prompt templates — edit these to tune generation quality |

---

## Running the Project

### Development mode (recommended)

From the root (`Resu/`):

```bash
npm run dev
```

This starts **both** the frontend and backend concurrently via Turborepo:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) | React app (Vite dev server) |
| **Backend** | [http://localhost:3001](http://localhost:3001) | Fastify API server |

The frontend automatically proxies `/api/*` requests to the backend, so you only need to open `http://localhost:5173` in your browser.

### Run individually

If you want to run the client or server separately:

```bash
# Server only
npm run dev --workspace=apps/server

# Client only
npm run dev --workspace=apps/client
```

### Production build

```bash
npm run build
```

---

## Setting Up Your Profile

Your profile lives at `apps/server/data/profile.json`. This is the master data source that the AI uses to generate tailored resumes. The more detailed and well-tagged your profile is, the better the output.

### Profile structure

```jsonc
{
  "contact": {
    "name": "Your Full Name",
    "email": "you@example.com",
    "phone": "+1-555-000-0000",        // optional
    "location": "City, State",          // optional
    "linkedin": "linkedin.com/in/you",  // optional
    "github": "github.com/you",         // optional
    "website": "yoursite.com"           // optional
  },
  "summary": "Your default professional summary...",
  "experience": [
    {
      "id": "exp-1",                           // unique ID
      "title": "Senior Software Engineer",
      "titleAliases": ["Sr. SDE", "Senior Developer"],  // alternative titles for matching
      "company": "Company Name",
      "location": "City, State",
      "startDate": "2022-01",
      "endDate": null,                         // null or omit = "Present"
      "bullets": [
        {
          "text": "Your achievement or responsibility...",
          "tags": ["react", "typescript", "performance"],  // keywords for matching
          "category": "technical",   // technical | leadership | impact | collaboration | process | other
          "strength": 5              // 1-5 rating of how impressive this bullet is
        }
      ],
      "tags": ["frontend", "senior", "full-stack"]
    }
  ],
  "skills": [
    {
      "name": "TypeScript",
      "aliases": ["TS", "typescript"],         // alternative names for JD matching
      "proficiency": "expert",                 // expert | advanced | intermediate
      "category": "languages"                  // your own grouping
    }
  ],
  "education": [{ "id": "edu-1", "institution": "...", "degree": "...", "field": "...", "startDate": "...", "endDate": "..." }],
  "projects": [{ "id": "proj-1", "name": "...", "description": "...", "tags": [], "highlights": [] }],
  "certifications": [{ "id": "cert-1", "name": "...", "issuer": "...", "date": "...", "tags": [] }],
  "achievements": [{ "id": "ach-1", "title": "...", "description": "...", "tags": [] }]
}
```

### Tips for a great profile

- **Tag everything generously** — each bullet point should have 3-8 tags. The AI uses these to match against JD keywords.
- **Use aliases** — JDs use wildly inconsistent terminology. Adding `["CI/CD", "continuous integration", "automated deployments"]` as aliases catches more matches.
- **Rate your bullets honestly** — strength 5 = your best achievements with quantified impact. The AI prioritizes high-strength bullets.
- **Include numbers** — "Reduced load time by 40%" is always better than "Improved performance".
- **Cover all categories** — mix technical, leadership, impact, and collaboration bullets.

---

## Usage

### Generating a resume

1. Open [http://localhost:5173](http://localhost:5173)
2. Click **"Generate"** in the nav bar
3. Paste the full job description into the textarea
4. (Optional) Expand **"Show options"** to set: company name, role title, tone, target page length, skills to emphasize, and template
5. Click **"Analyze Job Description"** — the AI parses the JD and selects relevant items from your profile
6. **Review the checkpoint** — add/remove selected bullets, edit the proposed summary, toggle skills
7. Click **"Confirm & Generate"** — the AI generates the polished resume + cover letter and scores ATS compatibility
8. You're redirected to the **Preview page** where you can:
   - View resume and cover letter tabs
   - Click "Edit Resume" to inline-edit any section
   - Check the ATS score and follow suggestions
   - Export to PDF

### Cost per generation

Each resume generation uses approximately:
- **gpt-4o-mini** for JD parsing (~$0.001)
- **gpt-4o** for relevance selection + resume generation + cover letter (~$0.04–0.05)
- **Total: ~$0.05 per resume**

---

## Available Scripts

All scripts are run from the **root** directory (`Resu/`):

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run build` | Build all packages for production |
| `npm run lint` | Run ESLint across all packages |
| `npm run test` | Run tests across all packages |
| `npm run validate-profile` | Validate `profile.json` against the schema |

### Workspace-specific commands

```bash
# Run a command in a specific workspace
npm run dev --workspace=apps/client
npm run dev --workspace=apps/server
npm run build --workspace=packages/shared
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Monorepo** | npm workspaces + Turborepo | Fast builds, shared types across packages |
| **Frontend** | React 19 + TypeScript + Vite | Fast dev server, modern React features |
| **State** | Zustand + TanStack React Query | Minimal boilerplate, great caching |
| **Backend** | Fastify + TypeScript | First-class TS support, built-in validation, fast |
| **Database** | SQLite (better-sqlite3) | Zero-config, file-based, perfect for single-user |
| **AI** | OpenAI GPT-4o / GPT-4o-mini | Multi-step pipeline for accuracy |
| **PDF** | Puppeteer | CSS fidelity, selectable text for ATS |
| **Validation** | Zod | Runtime type-safe validation, shared schemas |
| **Notifications** | Sonner | Lightweight toast notifications |

---

## Troubleshooting

### `npm install` fails with peer dependency errors

```bash
npm install --legacy-peer-deps
```

### Server fails to start — "Profile not found"

Make sure `apps/server/data/profile.json` exists. Copy from the example:
```bash
# The repo includes a sample profile.json — edit it with your data
```

### Server fails to start — "OPENAI_API_KEY is not set"

Create a `.env` file in the root:
```bash
cp .env.example .env
# Then add your API key to .env
```

### `better-sqlite3` build fails

This native module needs build tools. On macOS:
```bash
xcode-select --install
```

On Ubuntu/Debian:
```bash
sudo apt-get install build-essential python3
```

### Puppeteer can't launch Chrome

Puppeteer downloads Chromium automatically during install. If it fails:
```bash
npx puppeteer browsers install chrome
```

### Port already in use

Change the server port via environment variable:
```bash
PORT=3002 npm run dev --workspace=apps/server
```

### SQLite database issues

The database file is auto-created at `apps/server/data/resu.db` on first server start. To reset:
```bash
rm apps/server/data/resu.db
# Restart the server — tables are recreated automatically
```

---

## License

Private — personal use only.
