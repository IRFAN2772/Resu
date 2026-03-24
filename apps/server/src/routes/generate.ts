import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  GenerateParseRequestSchema,
  GenerateConfirmRequestSchema,
  type GenerateParseRequest,
  type GenerateConfirmRequest,
  type GenerationConfig,
  type UserAIConfig,
  type AIProvider,
  AI_PROVIDERS,
} from '@resu/shared';
import { parseJobDescription } from '../services/ai/parseJobDescription.js';
import { selectRelevantItems } from '../services/ai/selectRelevantItems.js';
import { generateResume } from '../services/ai/generateResume.js';
import { generateCoverLetter } from '../services/ai/generateCoverLetter.js';
import { scoreATS } from '../services/ai/atsScorer.js';
import { planResume } from '../services/ai/planResume.js';
import { critiqueResume } from '../services/ai/critiqueResume.js';
import { enrichProfile } from '../services/ai/profileEnricher.js';
import { insertResume } from '../db/queries.js';
import { loadProfile } from '../services/profile.js';

// Simple in-memory lock to prevent concurrent generations
let generationInProgress = false;

const PROMPT_VERSION = 'v2-agentic';

/** ATS score threshold — below this triggers a revision loop */
const ATS_REVISION_THRESHOLD = 75;
/** Maximum number of revision iterations */
const MAX_REVISIONS = 2;

/**
 * Extract user AI config from request headers (BYO key).
 * All AI keys come from the client Settings page — no server .env fallback.
 * Returns undefined if no X-AI-Key header is present.
 */
function extractUserAI(request: FastifyRequest): UserAIConfig | undefined {
  const apiKey = request.headers['x-ai-key'] as string | undefined;
  if (!apiKey) return undefined;

  const provider = ((request.headers['x-ai-provider'] as string) || 'openai')
    .toLowerCase()
    .trim() as AIProvider;

  if (!AI_PROVIDERS.includes(provider)) return undefined;

  return {
    provider,
    apiKey,
    modelFast: (request.headers['x-ai-model-fast'] as string) || undefined,
    modelSmart: (request.headers['x-ai-model-smart'] as string) || undefined,
    freeTier: request.headers['x-ai-free-tier'] === '1',
    azureEndpoint: (request.headers['x-ai-azure-endpoint'] as string) || undefined,
    azureApiVersion: (request.headers['x-ai-azure-api-version'] as string) || undefined,
    azureDeploymentFast: (request.headers['x-ai-azure-deployment-fast'] as string) || undefined,
    azureDeploymentSmart: (request.headers['x-ai-azure-deployment-smart'] as string) || undefined,
  };
}

/**
 * Require AI config — returns the config or sends a 401 error.
 */
function requireUserAI(request: FastifyRequest): UserAIConfig {
  const userAI = extractUserAI(request);
  if (!userAI) {
    throw Object.assign(
      new Error('No API key configured. Go to Settings to add your AI provider key.'),
      { statusCode: 401 },
    );
  }
  return userAI;
}

export const generateRoutes: FastifyPluginAsync = async (app) => {
  // ─── Phase 1: Parse JD → Enrich Profile → Plan Strategy → Select Items ───
  app.post<{ Body: GenerateParseRequest }>('/generate/parse', async (request, reply) => {
    if (generationInProgress) {
      return reply.status(429).send({ error: 'A generation is already in progress. Please wait.' });
    }

    const parseResult = GenerateParseRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request', details: parseResult.error.issues });
    }

    const { jdText, config } = parseResult.data;

    try {
      const userAI = requireUserAI(request);
      generationInProgress = true;

      const profile = loadProfile();

      // Step 1: Parse JD (fast model)
      const {
        parsedJD,
        tokenUsage: parseTokens,
        cost: parseCost,
      } = await parseJobDescription(jdText, config, userAI);

      // Step 1.5: Enrich profile with skill graph (code-based, instant)
      const enriched = enrichProfile(profile, parsedJD);

      // Step 2: Plan strategy (smart model)
      const {
        strategy,
        tokenUsage: planTokens,
        cost: planCost,
      } = await planResume(enriched, parsedJD, config, userAI);

      // Step 3: Select relevant items (smart model) — now with strategy + intelligence
      const {
        selection,
        tokenUsage: selectTokens,
        cost: selectCost,
      } = await selectRelevantItems(profile, parsedJD, config, userAI, {
        strategy,
        intelligenceBrief: enriched.intelligenceBrief,
      });

      return {
        parsedJD,
        relevanceSelection: selection,
        strategy,
        tokenUsage: {
          parseTokens: parseTokens.totalTokens,
          planTokens: planTokens.totalTokens,
          selectTokens: selectTokens.totalTokens,
          estimatedCost: parseCost + planCost + selectCost,
        },
      };
    } catch (err: any) {
      app.log.error(err);
      const status = err?.statusCode ?? err?.status ?? 500;
      const labels: Record<number, string> = {
        401: 'API key required',
        429: 'Rate limited — try again shortly',
      };
      return reply.status(status).send({
        error: labels[status] ?? 'Failed to parse job description',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      generationInProgress = false;
    }
  });

  // ─── Phase 2: Generate → Score → Critique → Iterate → Cover Letter ───
  app.post<{ Body: GenerateConfirmRequest }>('/generate/confirm', async (request, reply) => {
    if (generationInProgress) {
      return reply.status(429).send({ error: 'A generation is already in progress. Please wait.' });
    }

    const parseResult = GenerateConfirmRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request', details: parseResult.error.issues });
    }

    const { jdText, parsedJD, relevanceSelection, config } = parseResult.data;

    try {
      const userAI = requireUserAI(request);
      generationInProgress = true;

      const profile = loadProfile();

      // Re-enrich profile for this phase (instant, code-based)
      const enriched = enrichProfile(profile, parsedJD);

      // ─── AGENTIC LOOP: Generate → Score → Critique → Revise ───
      let totalGenTokens = 0;
      let totalGenCost = 0;
      let totalCritiqueTokens = 0;
      let totalCritiqueCost = 0;
      let revisionCount = 0;

      // Initial generation (with strategy + intelligence brief)
      let genResult = await generateResume(
        profile, parsedJD, relevanceSelection, config, userAI,
        {
          intelligenceBrief: enriched.intelligenceBrief,
        },
      );
      let resumeData = genResult.resumeData;
      totalGenTokens += genResult.tokenUsage.totalTokens;
      totalGenCost += genResult.cost;

      // Score
      let atsScore = scoreATS(resumeData, parsedJD);

      // ─── Iteration: Critique + Revise if ATS score is below threshold ───
      while (atsScore.score < ATS_REVISION_THRESHOLD && revisionCount < MAX_REVISIONS) {
        revisionCount++;
        app.log.info(
          `Agentic revision ${revisionCount}/${MAX_REVISIONS}: ATS score ${atsScore.score} < ${ATS_REVISION_THRESHOLD}`,
        );

        // Critique the current resume
        const critiqueResult = await critiqueResume(
          resumeData, parsedJD, enriched.intelligenceBrief, userAI,
        );
        totalCritiqueTokens += critiqueResult.tokenUsage.totalTokens;
        totalCritiqueCost += critiqueResult.cost;

        // If critic says no revision needed, trust it and break
        if (!critiqueResult.critique.needsRevision) {
          app.log.info('Critic determined no revision needed despite low ATS score — accepting.');
          break;
        }

        // Regenerate with critique feedback
        genResult = await generateResume(
          profile, parsedJD, relevanceSelection, config, userAI,
          {
            intelligenceBrief: enriched.intelligenceBrief,
            previousCritique: critiqueResult.critique,
            previousResume: resumeData,
          },
        );
        resumeData = genResult.resumeData;
        totalGenTokens += genResult.tokenUsage.totalTokens;
        totalGenCost += genResult.cost;

        // Re-score
        atsScore = scoreATS(resumeData, parsedJD);
        app.log.info(`After revision ${revisionCount}: ATS score improved to ${atsScore.score}`);
      }

      // Step 5: Generate cover letter (with resume awareness)
      const {
        coverLetter,
        tokenUsage: clTokens,
        cost: clCost,
      } = await generateCoverLetter(profile, parsedJD, relevanceSelection, config, userAI, {
        finalResume: resumeData,
        atsScore,
      });

      // Save to database
      const tokenUsage = {
        parseTokens: 0,
        selectTokens: 0,
        generateTokens: totalGenTokens,
        critiqueTokens: totalCritiqueTokens,
        coverLetterTokens: clTokens.totalTokens,
        totalCost: totalGenCost + totalCritiqueCost + clCost,
        revisionCount,
      };

      const id = insertResume(app.db, {
        company: parsedJD.companyName,
        jobTitle: parsedJD.roleTitle,
        jdText,
        parsedJD,
        generationConfig: config,
        relevanceSelection,
        resumeData,
        coverLetter,
        templateId: config.templateId,
        atsScore,
        promptVersion: PROMPT_VERSION,
        tokenUsage,
      });

      return {
        id,
        resumeData,
        coverLetter,
        atsScore,
        tokenUsage,
      };
    } catch (err: any) {
      app.log.error(err);
      const status = err?.statusCode ?? err?.status ?? 500;
      const labels: Record<number, string> = {
        401: 'API key required',
        429: 'Rate limited — try again shortly',
      };
      return reply.status(status).send({
        error: labels[status] ?? 'Failed to generate resume',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      generationInProgress = false;
    }
  });
};
