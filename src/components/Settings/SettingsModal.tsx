import { useState } from 'react';
import { X, Sparkles, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AISettings } from '../../types/ai';
import type { User } from '../../services/authService';
import AccountSection from './AccountSection';
import AITranslationSection from './AITranslationSection';

export type SettingsSectionId = 'account' | 'ai';

interface SettingsModalProps {
  user: User | null;
  aiSettings: AISettings;
  apiKeysSyncing: boolean;
  initialSection?: SettingsSectionId;
  onSaveAISettings: (settings: AISettings) => void;
  onUserUpdate: (user: User) => void;
  onToast: (message: string) => void;
  onClose: () => void;
}

// Add a section by appending one entry here plus its component below.
const SECTIONS: { id: SettingsSectionId; label: string; icon: LucideIcon; authOnly: boolean }[] = [
  { id: 'account', label: '账号', icon: UserRound, authOnly: true },
  { id: 'ai', label: 'AI 翻译', icon: Sparkles, authOnly: false },
];

export default function SettingsModal({
  user,
  aiSettings,
  apiKeysSyncing,
  initialSection = 'account',
  onSaveAISettings,
  onUserUpdate,
  onToast,
  onClose,
}: SettingsModalProps) {
  const available = SECTIONS.filter((s) => !s.authOnly || user);
  const [active, setActive] = useState<SettingsSectionId>(
    available.some((s) => s.id === initialSection) ? initialSection : available[0].id
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100">个人设置</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Section nav */}
          <nav className="sm:w-40 shrink-0 p-3 sm:border-r border-b sm:border-b-0 border-zinc-800 flex sm:flex-col gap-1">
            {available.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActive(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    active === section.id
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          {/* Section content */}
          <div className="flex-1 min-w-0 p-5 max-h-[70vh] overflow-y-auto">
            {active === 'account' && user && (
              <AccountSection user={user} onUserUpdate={onUserUpdate} onToast={onToast} />
            )}
            {active === 'ai' && (
              <AITranslationSection
                settings={aiSettings}
                syncing={apiKeysSyncing}
                syncEnabled={!!user}
                onSave={onSaveAISettings}
                onClose={onClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
