/**
 * Unified AI client — supports OpenAI, Azure OpenAI, and Anthropic Claude.
 *
 * Switch providers via AI_PROVIDER env var ("openai" | "azure" | "anthropic").
 * Each provider has its own env vars; see .env.example for details.
 *
 * Service files call chatCompletion() with a modelTier ("fast" or "smart")
 * and the abstraction resolves the right model + provider.
 */

import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'azure' | 'anthropic';
export type ModelTier = 'fast' | 'smart';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  tokenUsage: TokenUsage;
  cost: number;
}

export interface ChatCompletionOptions {
  modelTier: ModelTier;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  jsonMode?: boolean;
}

// ─── Provider Detection ──────────────────────────────────────────────────────

function getProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
  if (!['openai', 'azure', 'anthropic'].includes(raw)) {
    throw new Error(
      `Unknown AI_PROVIDER="${raw}". Valid values: openai, azure, anthropic`,
    );
  }
  return raw as AIProvider;
}

// ─── Model Resolution ────────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<AIProvider, Record<ModelTier, string>> = {
  openai: { fast: 'gpt-4o-mini', smart: 'gpt-4o' },
  azure: { fast: 'gpt-4o-mini', smart: 'gpt-4o' }, // Overridden by AZURE_OPENAI_DEPLOYMENT_*
  anthropic: { fast: 'claude-3-5-haiku-latest', smart: 'claude-3-5-sonnet-latest' },
};

function getModelName(provider: AIProvider, tier: ModelTier): string {
  // Global model overrides (work with any provider)
  if (tier === 'fast' && process.env.AI_MODEL_FAST) return process.env.AI_MODEL_FAST;
  if (tier === 'smart' && process.env.AI_MODEL_SMART) return process.env.AI_MODEL_SMART;

  // Azure uses deployment names from env
  if (provider === 'azure') {
    if (tier === 'fast' && process.env.AZURE_OPENAI_DEPLOYMENT_FAST) {
      return process.env.AZURE_OPENAI_DEPLOYMENT_FAST;
    }
    if (tier === 'smart' && process.env.AZURE_OPENAI_DEPLOYMENT_SMART) {
      return process.env.AZURE_OPENAI_DEPLOYMENT_SMART;
    }
  }

  return DEFAULT_MODELS[provider][tier];
}

// ─── Cost Estimation ─────────────────────────────────────────────────────────

const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI (per token)
  'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  // Anthropic (per token)
  'claude-3-5-sonnet-latest': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-3-5-haiku-latest': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
};

function estimateCost(model: string, usage: TokenUsage): number {
  const p = PRICING[model] ?? { input: 2 / 1_000_000, output: 10 / 1_000_000 };
  return usage.promptTokens * p.input + usage.completionTokens * p.output;
}

// ─── OpenAI / Azure Client ───────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;

async function getOpenAICompatibleClient(provider: 'openai' | 'azure'): Promise<OpenAI> {
  if (openaiClient) return openaiClient;

  if (provider === 'azure') {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

    if (!endpoint || !apiKey) {
      throw new Error(
        'Azure provider requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY. Check your .env file.',
      );
    }

    // Use AzureOpenAI from the openai SDK (extends OpenAI)
    const { AzureOpenAI } = await import('openai');
    openaiClient = new AzureOpenAI({
      endpoint: endpoint.replace(/\/$/, ''),
      apiKey,
      apiVersion,
    });
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
    }
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

async function completionViaOpenAI(
  provider: 'openai' | 'azure',
  model: string,
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const client = await getOpenAICompatibleClient(provider);

  // Some models (e.g. gpt-5 on Azure) only support default temperature
  const supportsTemperature = !model.startsWith('gpt-5');

  const response = await client.chat.completions.create({
    model, // For Azure, this is the deployment name
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userMessage },
    ],
    ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    ...(supportsTemperature ? { temperature: opts.temperature ?? 0.3 } : {}),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No response from ${provider} (model: ${model})`);
  }

  const tokenUsage: TokenUsage = {
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  };

  return { content, model, tokenUsage, cost: estimateCost(model, tokenUsage) };
}

// ─── Anthropic Client ────────────────────────────────────────────────────────

let anthropicClient: any | null = null; // typed as `any` to avoid hard dependency at import time

async function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey });
    return anthropicClient;
  } catch {
    throw new Error(
      'Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk --workspace=apps/server',
    );
  }
}

async function completionViaAnthropic(
  model: string,
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const client = await getAnthropicClient();

  // Anthropic: system is a separate param, no native JSON mode
  let systemPrompt = opts.systemPrompt;
  if (opts.jsonMode) {
    systemPrompt +=
      '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown code fences, no explanation — just the raw JSON object.';
  }

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user' as const, content: opts.userMessage }],
    temperature: opts.temperature ?? 0.3,
  });

  // Extract text content
  const textBlock = response.content?.find((b: any) => b.type === 'text');
  let content: string = textBlock?.text ?? '';
  if (!content) {
    throw new Error(`No response from Anthropic (model: ${model})`);
  }

  // Strip markdown code fences if Anthropic wraps the JSON
  content = content
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  const tokenUsage: TokenUsage = {
    promptTokens: response.usage?.input_tokens ?? 0,
    completionTokens: response.usage?.output_tokens ?? 0,
    totalTokens: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
  };

  return { content, model, tokenUsage, cost: estimateCost(model, tokenUsage) };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Unified chat completion — routes to the configured AI provider.
 *
 * @example
 * const result = await chatCompletion({
 *   modelTier: 'fast',       // 'fast' for parsing, 'smart' for generation
 *   systemPrompt: '...',
 *   userMessage: '...',
 *   jsonMode: true,
 *   temperature: 0.2,
 * });
 * console.log(result.content); // parsed JSON string
 */
export async function chatCompletion(
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const provider = getProvider();
  const model = getModelName(provider, opts.modelTier);

  console.log(`[AI] Provider: ${provider} | Model: ${model} | Tier: ${opts.modelTier}`);

  if (provider === 'anthropic') {
    return completionViaAnthropic(model, opts);
  }
  return completionViaOpenAI(provider, model, opts);
}

/**
 * Reset cached clients (useful if env vars change at runtime, e.g. in tests).
 */
export function resetClients(): void {
  openaiClient = null;
  anthropicClient = null;
}
