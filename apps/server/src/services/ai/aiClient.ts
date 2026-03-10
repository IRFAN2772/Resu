/**
 * Unified AI client — supports 6 providers:
 * OpenAI, Azure OpenAI, Anthropic (Claude), Google Gemini, DeepSeek, Groq.
 *
 * Two modes:
 * 1. Server key — reads from env vars (AI_PROVIDER, OPENAI_API_KEY, etc.)
 * 2. User BYO key — receives UserAIConfig per-request (no caching)
 *
 * OpenAI-compatible providers (OpenAI, Gemini, DeepSeek, Groq) all use the
 * openai SDK with different base URLs. Azure uses AzureOpenAI. Anthropic
 * uses its own SDK via lazy import.
 */

import OpenAI from 'openai';
import type { AIProvider, UserAIConfig } from '@resu/shared';
import { PROVIDER_INFO } from '@resu/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModelTier = 'fast' | 'smart';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: AIProvider;
  tokenUsage: TokenUsage;
  cost: number;
}

export interface ChatCompletionOptions {
  modelTier: ModelTier;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  jsonMode?: boolean;
  /** User's BYO API key config. If omitted, falls back to server env vars. */
  userAI?: UserAIConfig;
}

// ─── Provider / Model Resolution ─────────────────────────────────────────────

/** Base URLs for OpenAI-compatible providers */
const OPENAI_COMPATIBLE_URLS: Partial<Record<AIProvider, string>> = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  deepseek: 'https://api.deepseek.com',
  groq: 'https://api.groq.com/openai/v1',
};

function resolveProvider(userAI?: UserAIConfig): AIProvider {
  if (userAI) return userAI.provider;
  const raw = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
  const valid: AIProvider[] = ['openai', 'azure', 'anthropic', 'gemini', 'deepseek', 'groq'];
  if (!valid.includes(raw as AIProvider)) {
    throw new Error(`Unknown AI_PROVIDER="${raw}". Valid: ${valid.join(', ')}`);
  }
  return raw as AIProvider;
}

function resolveModel(provider: AIProvider, tier: ModelTier, userAI?: UserAIConfig): string {
  // User-provided model overrides
  if (userAI) {
    if (tier === 'fast' && userAI.modelFast) return userAI.modelFast;
    if (tier === 'smart' && userAI.modelSmart) return userAI.modelSmart;
    // Azure user config
    if (provider === 'azure') {
      if (tier === 'fast' && userAI.azureDeploymentFast) return userAI.azureDeploymentFast;
      if (tier === 'smart' && userAI.azureDeploymentSmart) return userAI.azureDeploymentSmart;
    }
    return PROVIDER_INFO[provider].defaultModels[tier];
  }

  // Server env overrides
  if (tier === 'fast' && process.env.AI_MODEL_FAST) return process.env.AI_MODEL_FAST;
  if (tier === 'smart' && process.env.AI_MODEL_SMART) return process.env.AI_MODEL_SMART;

  if (provider === 'azure') {
    if (tier === 'fast' && process.env.AZURE_OPENAI_DEPLOYMENT_FAST) {
      return process.env.AZURE_OPENAI_DEPLOYMENT_FAST;
    }
    if (tier === 'smart' && process.env.AZURE_OPENAI_DEPLOYMENT_SMART) {
      return process.env.AZURE_OPENAI_DEPLOYMENT_SMART;
    }
  }

  return PROVIDER_INFO[provider].defaultModels[tier];
}

// ─── Cost Estimation ─────────────────────────────────────────────────────────

const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  // Anthropic
  'claude-3-5-sonnet-latest': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-3-5-haiku-latest': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
  // Gemini
  'gemini-2.0-flash': { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
  'gemini-1.5-pro': { input: 1.25 / 1_000_000, output: 5 / 1_000_000 },
  // DeepSeek
  'deepseek-chat': { input: 0.14 / 1_000_000, output: 0.28 / 1_000_000 },
  // Groq (free tier / very cheap)
  'llama-3.3-70b-versatile': { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  'mixtral-8x7b-32768': { input: 0.24 / 1_000_000, output: 0.24 / 1_000_000 },
};

function estimateCost(model: string, usage: TokenUsage): number {
  const p = PRICING[model] ?? { input: 2 / 1_000_000, output: 10 / 1_000_000 };
  return usage.promptTokens * p.input + usage.completionTokens * p.output;
}

// ─── OpenAI-Compatible Completion (OpenAI, Gemini, DeepSeek, Groq) ──────────

/** Environment variable name for each provider's API key */
const PROVIDER_KEY_ENV: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
};

/** Cached clients per provider for server env-var mode */
const cachedOpenAIClients: Partial<Record<AIProvider, OpenAI>> = {};

function createOpenAIClient(provider: AIProvider, apiKey: string): OpenAI {
  const baseURL = OPENAI_COMPATIBLE_URLS[provider];
  if (!baseURL) throw new Error(`No base URL for provider: ${provider}`);
  return new OpenAI({ apiKey, baseURL });
}

function getOpenAIClient(provider: AIProvider, userAI?: UserAIConfig): OpenAI {
  // User BYO key — always create fresh (no caching)
  if (userAI) {
    return createOpenAIClient(provider, userAI.apiKey);
  }

  // Server env-var mode — cache per provider
  if (cachedOpenAIClients[provider]) return cachedOpenAIClients[provider];

  const envVar = PROVIDER_KEY_ENV[provider] ?? 'OPENAI_API_KEY';
  const apiKey = process.env[envVar];
  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error(
      `API key not set for provider "${provider}". Set ${envVar} in your .env file.`,
    );
  }
  const client = createOpenAIClient(provider, apiKey);
  cachedOpenAIClients[provider] = client;
  return client;
}

async function completionViaOpenAICompat(
  provider: AIProvider,
  model: string,
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const client = getOpenAIClient(provider, opts.userAI);

  // Gemini via the OpenAI compatibility layer doesn't support response_format
  // DeepSeek and Groq support it for some models but unreliably
  // For these providers, we inject a JSON instruction into the system prompt instead
  const nativeJsonMode = provider === 'openai';
  const useJsonResponseFormat = opts.jsonMode && nativeJsonMode;

  let systemPrompt = opts.systemPrompt;
  if (opts.jsonMode && !nativeJsonMode) {
    systemPrompt +=
      '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown code fences, no explanation, no extra text — just the raw JSON object.';
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: opts.userMessage },
    ],
    ...(useJsonResponseFormat ? { response_format: { type: 'json_object' as const } } : {}),
    temperature: opts.temperature ?? 0.3,
  });

  let content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No response from ${provider} (model: ${model})`);
  }

  // Strip markdown code fences that non-OpenAI providers sometimes wrap JSON in
  if (opts.jsonMode && !nativeJsonMode) {
    content = content
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
  }

  const tokenUsage: TokenUsage = {
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  };

  return { content, model, provider, tokenUsage, cost: estimateCost(model, tokenUsage) };
}

// ─── Azure OpenAI ────────────────────────────────────────────────────────────

let cachedAzureClient: OpenAI | null = null;

async function getAzureClient(userAI?: UserAIConfig): Promise<OpenAI> {
  if (userAI) {
    if (!userAI.azureEndpoint) {
      throw new Error('Azure provider requires an endpoint URL.');
    }
    const { AzureOpenAI } = await import('openai');
    return new AzureOpenAI({
      endpoint: userAI.azureEndpoint.replace(/\/$/, ''),
      apiKey: userAI.apiKey,
      apiVersion: userAI.azureApiVersion || '2024-10-21',
    });
  }

  if (cachedAzureClient) return cachedAzureClient;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
  if (!endpoint || !apiKey) {
    throw new Error('Azure requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env');
  }

  const { AzureOpenAI } = await import('openai');
  cachedAzureClient = new AzureOpenAI({
    endpoint: endpoint.replace(/\/$/, ''),
    apiKey,
    apiVersion,
  });
  return cachedAzureClient;
}

async function completionViaAzure(
  model: string,
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const client = await getAzureClient(opts.userAI);
  const supportsTemperature = !model.startsWith('gpt-5');

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userMessage },
    ],
    ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    ...(supportsTemperature ? { temperature: opts.temperature ?? 0.3 } : {}),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No response from Azure (model: ${model})`);

  const tokenUsage: TokenUsage = {
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  };

  return { content, model, provider: 'azure', tokenUsage, cost: estimateCost(model, tokenUsage) };
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

let cachedAnthropicClient: any | null = null;

async function getAnthropicClient(userAI?: UserAIConfig) {
  if (userAI) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    return new Anthropic({ apiKey: userAI.apiKey });
  }

  if (cachedAnthropicClient) return cachedAnthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  cachedAnthropicClient = new Anthropic({ apiKey });
  return cachedAnthropicClient;
}

async function completionViaAnthropic(
  model: string,
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const client = await getAnthropicClient(opts.userAI);

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

  const textBlock = response.content?.find((b: any) => b.type === 'text');
  let content: string = textBlock?.text ?? '';
  if (!content) throw new Error(`No response from Anthropic (model: ${model})`);

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

  return {
    content,
    model,
    provider: 'anthropic',
    tokenUsage,
    cost: estimateCost(model, tokenUsage),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Unified chat completion — routes to the right provider.
 * If opts.userAI is set, uses the user's BYO key; otherwise server env vars.
 */
export async function chatCompletion(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const provider = resolveProvider(opts.userAI);
  const model = resolveModel(provider, opts.modelTier, opts.userAI);

  console.log(
    `[AI] Provider: ${provider} | Model: ${model} | Tier: ${opts.modelTier} | BYO: ${!!opts.userAI}`,
  );

  switch (provider) {
    case 'anthropic':
      return completionViaAnthropic(model, opts);
    case 'azure':
      return completionViaAzure(model, opts);
    default:
      // openai, gemini, deepseek, groq — all OpenAI-compatible
      return completionViaOpenAICompat(provider, model, opts);
  }
}

/** Reset cached clients (for tests or env changes). */
export function resetClients(): void {
  for (const key of Object.keys(cachedOpenAIClients)) {
    delete cachedOpenAIClients[key as AIProvider];
  }
  cachedAzureClient = null;
  cachedAnthropicClient = null;
}
