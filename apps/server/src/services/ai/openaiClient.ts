import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function extractTokenUsage(
  response: OpenAI.Chat.Completions.ChatCompletion,
): TokenUsage {
  return {
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  };
}

// Approximate cost calculation (gpt-4o and gpt-4o-mini pricing as of early 2025)
export function estimateCost(
  model: string,
  usage: TokenUsage,
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  };
  const p = pricing[model] ?? pricing['gpt-4o'];
  return usage.promptTokens * p.input + usage.completionTokens * p.output;
}
