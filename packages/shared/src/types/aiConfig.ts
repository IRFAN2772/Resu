// ─── AI Provider Configuration Types ───
// Used for BYO (Bring Your Own) API key support.

import { z } from 'zod';

export const AI_PROVIDERS = ['openai', 'azure', 'anthropic', 'gemini', 'deepseek', 'groq'] as const;

export type AIProvider = (typeof AI_PROVIDERS)[number];

export const UserAIConfigSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().min(1),
  modelFast: z.string().optional(),
  modelSmart: z.string().optional(),
  // Azure-specific
  azureEndpoint: z.string().optional(),
  azureApiVersion: z.string().optional(),
  azureDeploymentFast: z.string().optional(),
  azureDeploymentSmart: z.string().optional(),
});
export type UserAIConfig = z.infer<typeof UserAIConfigSchema>;

/** Provider display info for the Settings UI */
export const PROVIDER_INFO: Record<
  AIProvider,
  {
    name: string;
    description: string;
    defaultModels: { fast: string; smart: string };
    keyPlaceholder: string;
    keyPrefix?: string;
    docsUrl: string;
  }
> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, o1',
    defaultModels: { fast: 'gpt-4o-mini', smart: 'gpt-4o' },
    keyPlaceholder: 'sk-proj-...',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  azure: {
    name: 'Azure OpenAI',
    description: 'GPT models via Azure deployments',
    defaultModels: { fast: 'gpt-4o-mini', smart: 'gpt-4o' },
    keyPlaceholder: 'Your Azure API key',
    docsUrl: 'https://portal.azure.com',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'Claude 3.5 Sonnet, Claude 3.5 Haiku',
    defaultModels: { fast: 'claude-3-5-haiku-latest', smart: 'claude-3-5-sonnet-latest' },
    keyPlaceholder: 'sk-ant-...',
    keyPrefix: 'sk-ant-',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash, Gemini 1.5 Pro',
    defaultModels: { fast: 'gemini-2.0-flash', smart: 'gemini-1.5-pro' },
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek Chat, DeepSeek Reasoner',
    defaultModels: { fast: 'deepseek-chat', smart: 'deepseek-chat' },
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  groq: {
    name: 'Groq',
    description: 'LLaMA 3.3 70B, Mixtral — ultra-fast inference',
    defaultModels: { fast: 'mixtral-8x7b-32768', smart: 'llama-3.3-70b-versatile' },
    keyPlaceholder: 'gsk_...',
    keyPrefix: 'gsk_',
    docsUrl: 'https://console.groq.com/keys',
  },
};
