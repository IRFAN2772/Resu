// ─── AI Settings — localStorage persistence ───
// Stores the user's BYO API key config in the browser.
// Keys never leave the browser except as request headers over the wire.

import type { AIProvider, UserAIConfig } from '@resu/shared';

const STORAGE_KEY = 'resu-ai-settings';

export function getAISettings(): UserAIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.provider || !parsed?.apiKey) return null;
    return parsed as UserAIConfig;
  } catch {
    return null;
  }
}

export function saveAISettings(config: UserAIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearAISettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Build headers to send with each API request */
export function getAIHeaders(): Record<string, string> {
  const config = getAISettings();
  if (!config) return {};

  const headers: Record<string, string> = {
    'X-AI-Provider': config.provider,
    'X-AI-Key': config.apiKey,
  };

  if (config.freeTier) headers['X-AI-Free-Tier'] = '1';

  if (config.modelFast) headers['X-AI-Model-Fast'] = config.modelFast;
  if (config.modelSmart) headers['X-AI-Model-Smart'] = config.modelSmart;
  if (config.azureEndpoint) headers['X-AI-Azure-Endpoint'] = config.azureEndpoint;
  if (config.azureApiVersion) headers['X-AI-Azure-Api-Version'] = config.azureApiVersion;
  if (config.azureDeploymentFast)
    headers['X-AI-Azure-Deployment-Fast'] = config.azureDeploymentFast;
  if (config.azureDeploymentSmart)
    headers['X-AI-Azure-Deployment-Smart'] = config.azureDeploymentSmart;

  return headers;
}
