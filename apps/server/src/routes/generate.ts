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
import { insertResume } from '../db/queries.js';

// Simple in-memory lock to prevent concurrent generations
let generationInProgress = false;

const PROMPT_VERSION = 'v1';

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
  // ─── Step 1+2: Parse JD and Select Relevant Items ───
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

      // Step 1: Parse JD
      const {
        parsedJD,
        tokenUsage: parseTokens,
        cost: parseCost,
      } = await parseJobDescription(jdText, config, userAI);

      // Step 2: Select relevant items
      const {
        selection,
        tokenUsage: selectTokens,
        cost: selectCost,
      } = await selectRelevantItems(app.profile, parsedJD, config, userAI);

      return {
        parsedJD,
        relevanceSelection: selection,
        tokenUsage: {
          parseTokens: parseTokens.totalTokens,
          selectTokens: selectTokens.totalTokens,
          estimatedCost: parseCost + selectCost,
        },
      };
    } catch (err: any) {
      app.log.error(err);
      const status = err?.statusCode ?? 500;
      return reply.status(status).send({
        error: status === 401 ? 'API key required' : 'Failed to parse job description',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      generationInProgress = false;
    }
  });

  // ─── Step 3+4+5: Generate Resume, Score ATS, Generate Cover Letter ───
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

      // Step 3: Generate resume
      const {
        resumeData,
        tokenUsage: genTokens,
        cost: genCost,
      } = await generateResume(app.profile, parsedJD, relevanceSelection, config, userAI);

      // Step 4: ATS scoring (code-based, no LLM)
      const atsScore = scoreATS(resumeData, parsedJD);

      // Step 5: Generate cover letter
      const {
        coverLetter,
        tokenUsage: clTokens,
        cost: clCost,
      } = await generateCoverLetter(app.profile, parsedJD, relevanceSelection, config, userAI);

      // Save to database
      const tokenUsage = {
        parseTokens: 0,
        selectTokens: 0,
        generateTokens: genTokens.totalTokens,
        coverLetterTokens: clTokens.totalTokens,
        totalCost: genCost + clCost,
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
      const status = err?.statusCode ?? 500;
      return reply.status(status).send({
        error: status === 401 ? 'API key required' : 'Failed to generate resume',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      generationInProgress = false;
    }
  });
};
