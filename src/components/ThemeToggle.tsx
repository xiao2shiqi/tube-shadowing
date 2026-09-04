import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'xiao27-theme';

/** 把主题写到 <html> 上：system 表示移除 data-theme，交回给系统偏好 */
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* 隐私模式下写不进去，忽略即可 */
  }
};

const readStoredTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* 读不到就按跟随系统处理 */
  }
  return 'system';
};

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
  { value: 'system', label: '跟随系统', Icon: Monitor },
];

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  const pick = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-md border border-line"
      role="radiogroup"
      aria-label="主题"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => pick(value)}
          title={label}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            theme === value
              ? 'bg-hovered text-ink'
              : 'text-ink-mute hover:text-ink-soft'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
};
