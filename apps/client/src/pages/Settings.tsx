import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PROVIDER_INFO, AI_PROVIDERS, type AIProvider, type UserAIConfig } from '@resu/shared';
import { getAISettings, saveAISettings, clearAISettings } from '../lib/aiSettings';
import styles from './Settings.module.css';

export function SettingsPage() {
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [modelFast, setModelFast] = useState('');
  const [modelSmart, setModelSmart] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureApiVersion, setAzureApiVersion] = useState('2024-10-21');
  const [azureDeploymentFast, setAzureDeploymentFast] = useState('');
  const [azureDeploymentSmart, setAzureDeploymentSmart] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  // Load existing settings
  useEffect(() => {
    const existing = getAISettings();
    if (existing) {
      setProvider(existing.provider);
      setApiKey(existing.apiKey);
      setModelFast(existing.modelFast ?? '');
      setModelSmart(existing.modelSmart ?? '');
      setAzureEndpoint(existing.azureEndpoint ?? '');
      setAzureApiVersion(existing.azureApiVersion ?? '2024-10-21');
      setAzureDeploymentFast(existing.azureDeploymentFast ?? '');
      setAzureDeploymentSmart(existing.azureDeploymentSmart ?? '');
      setHasConfig(true);
    }
  }, []);

  const info = PROVIDER_INFO[provider];

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('API key is required');
      return;
    }
    if (provider === 'azure' && !azureEndpoint.trim()) {
      toast.error('Azure endpoint URL is required');
      return;
    }

    const config: UserAIConfig = {
      provider,
      apiKey: apiKey.trim(),
      ...(modelFast ? { modelFast } : {}),
      ...(modelSmart ? { modelSmart } : {}),
      ...(provider === 'azure'
        ? {
            azureEndpoint: azureEndpoint.trim(),
            azureApiVersion,
            ...(azureDeploymentFast ? { azureDeploymentFast } : {}),
            ...(azureDeploymentSmart ? { azureDeploymentSmart } : {}),
          }
        : {}),
    };

    saveAISettings(config);
    setHasConfig(true);
    toast.success(`${info.name} API key saved`);
  };

  const handleClear = () => {
    clearAISettings();
    setApiKey('');
    setModelFast('');
    setModelSmart('');
    setAzureEndpoint('');
    setAzureDeploymentFast('');
    setAzureDeploymentSmart('');
    setHasConfig(false);
    setShowKey(false);
    toast.success('AI settings cleared — will use server default');
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 24)) + key.slice(-4);
  };

  return (
    <div className={styles.settings}>
      <h1>AI Provider Settings</h1>
      <p className={styles.subtitle}>
        Bring your own API key to use your preferred AI provider. Your key is stored only in your
        browser and sent directly to the AI provider.
      </p>

      {hasConfig && (
        <div className={styles['status-bar']}>
          <span className={styles['status-dot']} />
          <span>
            Using <strong>{info.name}</strong> with your API key
          </span>
          <button className="btn btn-sm btn-secondary" onClick={handleClear}>
            Clear & Use Server Default
          </button>
        </div>
      )}

      {/* Provider Selector */}
      <div className={styles['provider-grid']}>
        {AI_PROVIDERS.map((p) => {
          const pi = PROVIDER_INFO[p];
          return (
            <button
              key={p}
              className={`${styles['provider-card']} ${provider === p ? styles.active : ''}`}
              onClick={() => setProvider(p)}
            >
              <span className={styles['provider-name']}>{pi.name}</span>
              <span className={styles['provider-desc']}>{pi.description}</span>
            </button>
          );
        })}
      </div>

      {/* Configuration Form */}
      <div className={styles.form}>
        <div className={styles.field}>
          <label>
            API Key
            <a
              href={info.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles['key-link']}
            >
              Get key →
            </a>
          </label>
          <div className={styles['key-input-row']}>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={info.keyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className={styles['show-toggle']}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {hasConfig && !showKey && apiKey && (
            <span className={styles['key-preview']}>{maskKey(apiKey)}</span>
          )}
        </div>

        {/* Azure-specific fields */}
        {provider === 'azure' && (
          <>
            <div className={styles.field}>
              <label>Azure Endpoint URL</label>
              <input
                type="text"
                placeholder="https://your-resource.openai.azure.com"
                value={azureEndpoint}
                onChange={(e) => setAzureEndpoint(e.target.value)}
              />
            </div>
            <div className={styles['field-row']}>
              <div className={styles.field}>
                <label>API Version</label>
                <input
                  type="text"
                  placeholder="2024-10-21"
                  value={azureApiVersion}
                  onChange={(e) => setAzureApiVersion(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Fast Deployment Name</label>
                <input
                  type="text"
                  placeholder={info.defaultModels.fast}
                  value={azureDeploymentFast}
                  onChange={(e) => setAzureDeploymentFast(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Smart Deployment Name</label>
                <input
                  type="text"
                  placeholder={info.defaultModels.smart}
                  value={azureDeploymentSmart}
                  onChange={(e) => setAzureDeploymentSmart(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Model override for non-Azure providers */}
        {provider !== 'azure' && (
          <div className={styles['field-row']}>
            <div className={styles.field}>
              <label>Fast Model (parsing/selection)</label>
              <input
                type="text"
                placeholder={info.defaultModels.fast}
                value={modelFast}
                onChange={(e) => setModelFast(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Smart Model (generation)</label>
              <input
                type="text"
                placeholder={info.defaultModels.smart}
                value={modelSmart}
                onChange={(e) => setModelSmart(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className={styles['security-note']}>
        <strong>Security:</strong> Your API key is stored in your browser's localStorage and sent
        directly to the provider's API. It is never stored on our server. For maximum security, use
        HTTPS in production.
      </div>
    </div>
  );
}
