import type { FastifyPluginAsync } from 'fastify';
import {
  GenerateParseRequestSchema,
  GenerateConfirmRequestSchema,
  type GenerateParseRequest,
  type GenerateConfirmRequest,
  type GenerationConfig,
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

export const generateRoutes: FastifyPluginAsync = async (app) => {
  // ─── Step 1+2: Parse JD and Select Relevant Items ───
  // Returns the parsed JD + relevance selection for the user to review at the checkpoint.
  app.post<{ Body: GenerateParseRequest }>('/generate/parse', async (request, reply) => {
    if (generationInProgress) {
      return reply.status(429).send({ error: 'A generation is already in progress. Please wait.' });
    }

    const parseResult = GenerateParseRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parseResult.error.issues });
    }

    const { jdText, config } = parseResult.data;

    try {
      generationInProgress = true;

      // Step 1: Parse JD
      const { parsedJD, tokenUsage: parseTokens, cost: parseCost } =
        await parseJobDescription(jdText, config);

      // Step 2: Select relevant items
      const { selection, tokenUsage: selectTokens, cost: selectCost } =
        await selectRelevantItems(app.profile, parsedJD, config);

      return {
        parsedJD,
        relevanceSelection: selection,
        tokenUsage: {
          parseTokens: parseTokens.totalTokens,
          selectTokens: selectTokens.totalTokens,
          estimatedCost: parseCost + selectCost,
        },
      };
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Failed to parse job description',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      generationInProgress = false;
    }
  });

  // ─── Step 3+4+5: Generate Resume, Score ATS, Generate Cover Letter ───
  // Called after the user reviews and confirms the relevance selection.
  app.post<{ Body: GenerateConfirmRequest }>('/generate/confirm', async (request, reply) => {
    if (generationInProgress) {
      return reply.status(429).send({ error: 'A generation is already in progress. Please wait.' });
    }

    const parseResult = GenerateConfirmRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parseResult.error.issues });
    }

    const { jdText, parsedJD, relevanceSelection, config } = parseResult.data;

    try {
      generationInProgress = true;

      // Step 3: Generate resume
      const {
        resumeData,
        tokenUsage: genTokens,
        cost: genCost,
      } = await generateResume(app.profile, parsedJD, relevanceSelection, config);

      // Step 4: ATS scoring (code-based, no LLM)
      const atsScore = scoreATS(resumeData, parsedJD);

      // Step 5: Generate cover letter
      const {
        coverLetter,
        tokenUsage: clTokens,
        cost: clCost,
      } = await generateCoverLetter(app.profile, parsedJD, relevanceSelection, config);

      // Save to database
      const tokenUsage = {
        parseTokens: 0, // Already counted in parse step
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
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Failed to generate resume',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      generationInProgress = false;
    }
  });
};
