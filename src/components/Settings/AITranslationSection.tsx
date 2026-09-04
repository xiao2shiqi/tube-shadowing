import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { AIProvider, AISettings, ProviderKeyConfig } from '../../types/ai';
import { AI_PROVIDER_PRESETS } from '../../types/ai';
import { testConnection } from '../../services/aiTranslationService';

interface AITranslationSectionProps {
  settings: AISettings;
  syncing: boolean;
  syncEnabled: boolean;
  onSave: (settings: AISettings) => void;
  onClose: () => void;
}

const PROVIDERS = Object.keys(AI_PROVIDER_PRESETS) as AIProvider[];

export default function AITranslationSection({
  settings,
  syncing,
  syncEnabled,
  onSave,
  onClose,
}: AITranslationSectionProps) {
  const [activeTab, setActiveTab] = useState<AIProvider>(settings.provider);
  const [keys, setKeys] = useState<Record<AIProvider, ProviderKeyConfig>>(settings.keys);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const preset = AI_PROVIDER_PRESETS[activeTab];
  const current = keys[activeTab];

  const updateCurrent = (patch: Partial<ProviderKeyConfig>) => {
    setKeys((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], ...patch } }));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!current.apiKey.trim()) {
      setTestResult({ ok: false, message: '请先输入 API Key' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testConnection({
      provider: activeTab,
      keys: { ...keys, [activeTab]: current },
      batchSize: settings.batchSize,
      concurrency: settings.concurrency,
    });
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    onSave({
      ...settings,
      provider: activeTab,
      keys: {
        ...keys,
        [activeTab]: {
          apiKey: current.apiKey.trim(),
          baseUrl: current.baseUrl.trim() || preset.baseUrl,
          model: current.model,
        },
      },
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-mute">
        选中哪家就用哪家翻译字幕。各家的 Key 分别保存，随时切换不用重填。
      </p>

      {/* Provider tabs */}
      <div className="flex flex-wrap gap-1">
        {PROVIDERS.map((p) => {
          const hasKey = keys[p].apiKey.trim().length > 0;
          return (
            <button
              key={p}
              onClick={() => {
                setActiveTab(p);
                setTestResult(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                activeTab === p
                  ? 'is-active'
                  : 'bg-hovered text-ink-soft border-line-strong hover:text-ink'
              }`}
            >
              {AI_PROVIDER_PRESETS[p].label}
              {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {!syncEnabled && (
        <p className="text-xs text-ink-mute bg-hovered/60 border border-line-strong rounded-md px-3 py-2">
          登录后 API Key 会加密保存到云端，换设备也能直接用；未登录时仅保存在本机浏览器。
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={current.apiKey}
            onChange={(e) => updateCurrent({ apiKey: e.target.value })}
            placeholder="sk-..."
            className="w-full bg-hovered border border-line-strong rounded-md px-3 py-2 pr-10 text-sm text-ink placeholder-ink-mute outline-none focus:border-line-strong"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-mute hover:text-ink-soft"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-mute">{preset.keyHint}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">Base URL</label>
        <input
          type="text"
          value={current.baseUrl}
          onChange={(e) => updateCurrent({ baseUrl: e.target.value })}
          placeholder={preset.baseUrl}
          className="w-full bg-hovered border border-line-strong rounded-md px-3 py-2 text-sm text-ink placeholder-ink-mute outline-none focus:border-line-strong"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">模型</label>
        {/* Free text with suggestions — providers rename models often, so a
            locked dropdown would go stale and block a working model id. */}
        <input
          type="text"
          list={`models-${activeTab}`}
          value={current.model}
          onChange={(e) => updateCurrent({ model: e.target.value })}
          placeholder={preset.model}
          className="w-full bg-hovered border border-line-strong rounded-md px-3 py-2 text-sm text-ink placeholder-ink-mute outline-none focus:border-line-strong"
        />
        <datalist id={`models-${activeTab}`}>
          {preset.models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </datalist>
      </div>

      {testResult && (
        <div
          className={`flex items-start gap-2 p-3 rounded-md text-xs ${
            testResult.ok
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
              : 'bg-red-950/80 text-red-300 border border-red-800/60'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{testResult.message}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-ink-soft bg-hovered hover:bg-hovered border border-line-strong rounded-md transition-colors disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {testing ? '测试中...' : '测试连接'}
        </button>
        <div className="flex-1" />
        {syncing && (
          <span className="text-xs text-ink-mute flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> 同步中
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium btn-primary rounded-md transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
}
