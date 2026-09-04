import { useState } from 'react';
import { X, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { AIProvider, AISettings, ProviderKeyConfig } from '../../types/ai';
import { AI_PROVIDER_PRESETS } from '../../types/ai';
import { testConnection } from '../../services/aiTranslationService';

interface AISettingsModalProps {
  settings: AISettings;
  syncing: boolean;
  syncEnabled: boolean;
  onSave: (settings: AISettings) => void;
  onClose: () => void;
}

const PROVIDERS = Object.keys(AI_PROVIDER_PRESETS) as AIProvider[];

export default function AISettingsModal({
  settings,
  syncing,
  syncEnabled,
  onSave,
  onClose,
}: AISettingsModalProps) {
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
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">AI 翻译设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider tabs */}
        <div className="flex gap-1 px-5 pt-4">
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
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {AI_PROVIDER_PRESETS[p].label}
                {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 space-y-4">
          {!syncEnabled && (
            <p className="text-xs text-zinc-500 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
              登录后 API Key 会加密保存到云端，换设备也能直接用；未登录时仅保存在本机浏览器。
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={current.apiKey}
                onChange={(e) => updateCurrent({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-600">{preset.keyHint}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Base URL</label>
            <input
              type="text"
              value={current.baseUrl}
              onChange={(e) => updateCurrent({ baseUrl: e.target.value })}
              placeholder={preset.baseUrl}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">模型</label>
            <select
              value={current.model}
              onChange={(e) => updateCurrent({ model: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500/50"
            >
              {preset.models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                testResult.ok
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
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
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {testing ? '测试中...' : '测试连接'}
          </button>
          <div className="flex-1" />
          {syncing && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 同步中
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
