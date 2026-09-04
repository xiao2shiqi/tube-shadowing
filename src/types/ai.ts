export type AIProvider = 'deepseek' | 'zhipu' | 'kimi';

export interface AIProviderPreset {
  label: string;
  baseUrl: string;
  model: string;
  models: { value: string; label: string }[];
  keyUrl: string;
  keyHint: string;
}

export const AI_PROVIDER_PRESETS: Record<AIProvider, AIProviderPreset> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    models: [
      { value: 'deepseek-chat', label: 'deepseek-chat (推荐，快速)' },
      { value: 'deepseek-reasoner', label: 'deepseek-reasoner (深度思考)' },
    ],
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyHint: '前往 platform.deepseek.com 获取',
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    models: [
      { value: 'glm-4-flash', label: 'glm-4-flash (推荐，免费额度)' },
      { value: 'glm-4-plus', label: 'glm-4-plus (效果更强)' },
    ],
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    keyHint: '前往 open.bigmodel.cn 获取',
  },
  kimi: {
    label: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    models: [
      { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k (推荐，快速)' },
      { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k (长上下文)' },
    ],
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    keyHint: '前往 platform.moonshot.cn 获取',
  },
};

export interface ProviderKeyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AISettings {
  provider: AIProvider;
  keys: Record<AIProvider, ProviderKeyConfig>;
  batchSize: number;
  concurrency: number;
}

function emptyKeyConfig(provider: AIProvider): ProviderKeyConfig {
  const preset = AI_PROVIDER_PRESETS[provider];
  return { apiKey: '', baseUrl: preset.baseUrl, model: preset.model };
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'deepseek',
  keys: {
    deepseek: emptyKeyConfig('deepseek'),
    zhipu: emptyKeyConfig('zhipu'),
    kimi: emptyKeyConfig('kimi'),
  },
  batchSize: 30,
  concurrency: 3,
};

// The active provider's key config — what aiTranslationService actually calls.
export function activeKeyConfig(settings: AISettings): ProviderKeyConfig {
  return settings.keys[settings.provider] || emptyKeyConfig(settings.provider);
}

interface LegacyAISettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  batchSize?: number;
  concurrency?: number;
}

function providerFromBaseUrl(baseUrl: string): AIProvider {
  if (baseUrl.includes('bigmodel')) return 'zhipu';
  if (baseUrl.includes('moonshot')) return 'kimi';
  return 'deepseek';
}

/** Upgrades the pre-multi-provider settings shape ({ apiKey, baseUrl, model })
 * that older browsers still have in localStorage, and fills in any missing
 * provider slot so `settings.keys[p]` is always safe to read. */
export function normalizeAISettings(raw: unknown): AISettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_AI_SETTINGS;

  const value = raw as Partial<AISettings> & LegacyAISettings;
  const base: AISettings = {
    provider: value.provider || DEFAULT_AI_SETTINGS.provider,
    keys: { ...DEFAULT_AI_SETTINGS.keys },
    batchSize: value.batchSize ?? DEFAULT_AI_SETTINGS.batchSize,
    concurrency: value.concurrency ?? DEFAULT_AI_SETTINGS.concurrency,
  };

  if (value.keys) {
    for (const provider of Object.keys(AI_PROVIDER_PRESETS) as AIProvider[]) {
      const stored = value.keys[provider];
      if (!stored) continue;
      const preset = AI_PROVIDER_PRESETS[provider];
      base.keys[provider] = {
        apiKey: stored.apiKey || '',
        baseUrl: stored.baseUrl || preset.baseUrl,
        model: stored.model || preset.model,
      };
    }
    return base;
  }

  // Legacy single-provider shape
  if (typeof value.apiKey === 'string' && value.apiKey) {
    const baseUrl = value.baseUrl || DEFAULT_AI_SETTINGS.keys.deepseek.baseUrl;
    const provider = providerFromBaseUrl(baseUrl);
    base.provider = provider;
    base.keys[provider] = {
      apiKey: value.apiKey,
      baseUrl,
      model: value.model || AI_PROVIDER_PRESETS[provider].model,
    };
  }

  return base;
}

export interface TranslationProgress {
  total: number;
  completed: number;
  status: 'idle' | 'translating' | 'completed' | 'error';
  errorMessage?: string;
}
