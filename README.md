# Resu — AI-Powered Personal Resume Builder

Resu is a local-first, AI-powered resume builder that ingests your full career profile, accepts a job description, and uses AI (OpenAI, Azure OpenAI, or Anthropic Claude) to generate a tailored resume + cover letter with ATS optimization. It renders fully inline-editable templates in the browser and exports pixel-perfect PDFs (resume & cover letter) via Puppeteer.

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

| Tool        | Minimum Version | Check with       |
| ----------- | --------------- | ---------------- |
| **Node.js** | v18+            | `node --version` |
| **npm**     | v9+             | `npm --version`  |
| **Git**     | any recent      | `git --version`  |

You also need an API key for at least one AI provider:

- **OpenAI** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Azure OpenAI** — via Azure Portal
- **Anthropic** — [console.anthropic.com](https://console.anthropic.com/)

---

## Clone & Setup

### 1. Clone the repository

```bash
git clone <your-repo-url> Resu
cd Resu
```

> If you're opening in VS Code, you can also use:
>
> ```
> code Resu
> ```
>
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

Open `.env` and configure your AI provider. Pick **one** of:

```bash
# ─── Option A: OpenAI (default) ───
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Option B: Azure OpenAI ───
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT_FAST=gpt-4o-mini   # or your deployment name
AZURE_OPENAI_DEPLOYMENT_SMART=gpt-4o       # or your deployment name

# ─── Option C: Anthropic ───
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

You can also override model names per tier:

```bash
AI_MODEL_FAST=gpt-4o-mini     # used for JD parsing (fast, cheap)
AI_MODEL_SMART=gpt-4o         # used for generation + scoring (accurate)
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
│   │   │   ├── components/  # Layout, resume templates, EditableText
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
│           │   ├── ai/      # Multi-provider AI pipeline (parse, select, generate, score)
│           │   │   ├── aiClient.ts          # Unified provider abstraction (OpenAI/Azure/Anthropic)
│           │   │   ├── parseJobDescription.ts
│           │   │   ├── selectRelevantItems.ts
│           │   │   ├── generateResume.ts     # Includes response normalization
│           │   │   ├── generateCoverLetter.ts
│           │   │   └── atsScorer.ts
│           │   └── pdf/     # Puppeteer PDF generation (resume + cover letter)
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

| Variable                        | Required              | Description                                     |
| ------------------------------- | --------------------- | ----------------------------------------------- |
| `AI_PROVIDER`                   | No                    | `openai` (default), `azure`, or `anthropic`     |
| `OPENAI_API_KEY`                | If provider=openai    | Your OpenAI API key                             |
| `AZURE_OPENAI_API_KEY`          | If provider=azure     | Azure OpenAI resource key                       |
| `AZURE_OPENAI_ENDPOINT`         | If provider=azure     | Azure OpenAI endpoint URL                       |
| `AZURE_OPENAI_API_VERSION`      | If provider=azure     | API version (e.g. `2024-10-21`)                 |
| `AZURE_OPENAI_DEPLOYMENT_FAST`  | If provider=azure     | Deployment name for fast/cheap model tier       |
| `AZURE_OPENAI_DEPLOYMENT_SMART` | If provider=azure     | Deployment name for smart/accurate model tier   |
| `ANTHROPIC_API_KEY`             | If provider=anthropic | Anthropic API key                               |
| `AI_MODEL_FAST`                 | No                    | Override fast-tier model (default: gpt-4o-mini) |
| `AI_MODEL_SMART`                | No                    | Override smart-tier model (default: gpt-4o)     |
| `PORT`                          | No                    | Server port (default: `3001`)                   |

### Key Files

| File                            | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `apps/server/data/profile.json` | **Your career profile** — the source of truth for all resume generation |
| `.env`                          | API keys and local config (git-ignored)                                 |
| `apps/server/src/prompts/*.txt` | AI prompt templates — edit these to tune generation quality             |

---

## Running the Project

### Development mode (recommended)

From the root (`Resu/`):

```bash
npm run dev
```

This starts **both** the frontend and backend concurrently via Turborepo:

| Service      | URL                                            | Description                 |
| ------------ | ---------------------------------------------- | --------------------------- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) | React app (Vite dev server) |
| **Backend**  | [http://localhost:3001](http://localhost:3001) | Fastify API server          |

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
    "phone": "+1-555-000-0000", // optional
    "location": "City, State", // optional
    "linkedin": "linkedin.com/in/you", // optional
    "github": "github.com/you", // optional
    "website": "yoursite.com", // optional
  },
  "summary": "Your default professional summary...",
  "experience": [
    {
      "id": "exp-1", // unique ID
      "title": "Senior Software Engineer",
      "titleAliases": ["Sr. SDE", "Senior Developer"], // alternative titles for matching
      "company": "Company Name",
      "location": "City, State",
      "startDate": "2022-01",
      "endDate": null, // null or omit = "Present"
      "bullets": [
        {
          "text": "Your achievement or responsibility...",
          "tags": ["react", "typescript", "performance"], // keywords for matching
          "category": "technical", // technical | leadership | impact | collaboration | process | other
          "strength": 5, // 1-5 rating of how impressive this bullet is
        },
      ],
      "tags": ["frontend", "senior", "full-stack"],
    },
  ],
  "skills": [
    {
      "name": "TypeScript",
      "aliases": ["TS", "typescript"], // alternative names for JD matching
      "proficiency": "expert", // expert | advanced | intermediate
      "category": "languages", // your own grouping
    },
  ],
  "education": [
    {
      "id": "edu-1",
      "institution": "...",
      "degree": "...",
      "field": "...",
      "startDate": "...",
      "endDate": "...",
    },
  ],
  "projects": [
    { "id": "proj-1", "name": "...", "description": "...", "tags": [], "highlights": [] },
  ],
  "certifications": [{ "id": "cert-1", "name": "...", "issuer": "...", "date": "...", "tags": [] }],
  "achievements": [{ "id": "ach-1", "title": "...", "description": "...", "tags": [] }],
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
   - Click **"Edit Resume"** to inline-edit **any section** — summary, experience (title/company/location/dates/bullets), education, skills (category names + skills list), projects, and certifications
   - Edit cover letter text (opening, body paragraphs, closing)
   - Check the ATS score breakdown (keywords, sections, format) and follow suggestions
   - **Download Resume PDF** — exports the resume with the selected template
   - **Download Cover Letter PDF** — exports a formatted cover letter with header, date, and signature

### Cost per generation

Cost depends on your AI provider and model. With OpenAI defaults:

| Step                  | Model                   | Approx. Cost |
| --------------------- | ----------------------- | ------------ |
| JD Parsing            | gpt-4o-mini (fast tier) | ~$0.001      |
| Relevance Selection   | gpt-4o (smart tier)     | ~$0.02       |
| Resume + Cover Letter | gpt-4o (smart tier)     | ~$0.03       |
| ATS Scoring           | gpt-4o-mini (fast tier) | ~$0.001      |
| **Total**             |                         | **~$0.05**   |

Azure OpenAI pricing varies by deployment. Anthropic Claude costs are comparable.

---

## Available Scripts

All scripts are run from the **root** directory (`Resu/`):

| Command                    | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | Start both client and server in development mode |
| `npm run build`            | Build all packages for production                |
| `npm run lint`             | Run ESLint across all packages                   |
| `npm run test`             | Run tests across all packages                    |
| `npm run validate-profile` | Validate `profile.json` against the schema       |

### Workspace-specific commands

```bash
# Run a command in a specific workspace
npm run dev --workspace=apps/client
npm run dev --workspace=apps/server
npm run build --workspace=packages/shared
```

---

## Tech Stack

| Layer             | Technology                        | Why                                                      |
| ----------------- | --------------------------------- | -------------------------------------------------------- |
| **Monorepo**      | npm workspaces + Turborepo        | Fast builds, shared types across packages                |
| **Frontend**      | React 19 + TypeScript + Vite      | Fast dev server, modern React features                   |
| **State**         | Zustand + TanStack React Query    | Minimal boilerplate, great caching                       |
| **Backend**       | Fastify + TypeScript              | First-class TS support, built-in validation, fast        |
| **Database**      | SQLite (better-sqlite3)           | Zero-config, file-based, perfect for single-user         |
| **AI**            | OpenAI / Azure OpenAI / Anthropic | Multi-provider abstraction with model tiers (fast/smart) |
| **PDF**           | Puppeteer                         | CSS fidelity, selectable text for ATS                    |
| **Validation**    | Zod                               | Runtime type-safe validation, shared schemas             |
| **Notifications** | Sonner                            | Lightweight toast notifications                          |

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

---

## Changelog

### v0.2.0 — Multi-Provider AI, Full Editing & Cover Letter Export

**Multi-Provider AI Support**

- Added unified AI client abstraction (`aiClient.ts`) supporting **OpenAI**, **Azure OpenAI**, and **Anthropic Claude**
- Two model tiers: `fast` (cheap, used for parsing/scoring) and `smart` (accurate, used for generation)
- Configurable via `AI_PROVIDER` env var — switch providers without code changes
- Automatic temperature handling (skipped for models like GPT-5 that don't support it)
- Per-provider model overrides via `AI_MODEL_FAST` / `AI_MODEL_SMART`

**AI Response Normalization**

- Added `normalizeSelectionResponse()` in `selectRelevantItems.ts` — handles AI returning objects instead of strings, missing fields, wrong casing
- Added `normalizeResumeResponse()` in `generateResume.ts` — handles `professionalSummary` → `summary`, flat skill arrays → `{categories:[...]}`, various field name conventions
- Updated AI prompts with exact JSON schemas and CRITICAL RULES to reduce schema drift
- Made `industryDomain` and `teamSize` nullable in JD schema to handle AI returning nulls

**Full Inline Editing**

- All resume sections are now editable: summary, experience (title, company, location, dates, bullets), education (degree, field, institution, dates, GPA), skills (category names + comma-separated skills), projects (name, description, highlights), certifications (name, issuer, date)
- Extracted `EditableText` into a standalone `React.memo` component to fix cursor/typing bug (text was reversing due to inline component remounting on every keystroke)
- Cover letter editing: opening, body paragraphs, and closing with labeled textareas

**Cover Letter PDF Export**

- Added `renderCoverLetterHTML()` — generates formatted cover letter with header (name, date, RE: line), body paragraphs, and signature block
- Added `generateCoverLetterPDF()` in the PDF generator
- Server export route now supports `type: 'cover-letter'` to generate cover letter PDFs
- Added "Download Cover Letter PDF" button on the Preview page

**Bug Fixes**

- Fixed `.env` not loading — dotenv now resolves from monorepo root
- Fixed Turborepo requiring `packageManager` field in root `package.json`
- Fixed shared package resolution — exports point to TypeScript source (no build step needed)
- Fixed GPT-5 temperature rejection — temperature param is skipped for gpt-5 models

### v0.1.0 — Initial Release

- Full monorepo scaffold (npm workspaces + Turborepo)
- Fastify server with SQLite database
- React client with Vite, Zustand, TanStack React Query
- 4-step AI pipeline: parse JD → select relevant items → generate resume + cover letter → ATS score
- Two resume templates: ATS Classic and Clean Minimal
- PDF export via Puppeteer
- Profile validation script
- Dashboard with resume listing

---

## License

Private — personal use only.
