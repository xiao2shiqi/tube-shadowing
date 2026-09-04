import { useState, useRef, useEffect, useCallback } from 'react';
import { SiteMark } from './SiteMark';
import { ThemeToggle } from './ThemeToggle';
import { Search, Clock, Keyboard, ChevronDown, Sparkles, BookOpen, LogOut, Github, Settings } from 'lucide-react';
import type { User } from '../services/authService';
import { renderGoogleButton, userLabel } from '../services/authService';
import { DEMO_VIDEOS } from '../constants/demoVideos';

interface HeaderProps {
  onLoadVideo: (input: string) => void;
  history: string[];
  onShowShortcuts: () => void;
  onShowAISettings: () => void;
  onShowSettings: () => void;
  aiKeyConfigured: boolean;
  onShowBookshelf: () => void;
  bookshelfCount: number;
  user: User | null;
  authLoading: boolean;
  googleReady: boolean;
  googleClientId: string;
  githubClientId: string;
  onGithubLogin: () => void;
  onLogout: () => void;
  hideSearch?: boolean;
}

export default function Header({
  onLoadVideo,
  history,
  onShowShortcuts,
  onShowAISettings,
  onShowSettings,
  aiKeyConfigured,
  onShowBookshelf,
  bookshelfCount,
  user,
  authLoading,
  googleReady,
  googleClientId,
  githubClientId,
  onGithubLogin,
  onLogout,
  hideSearch = false,
}: HeaderProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Called when the Google button div mounts — initialize() is already done at this point
  const googleBtnRef = useCallback((el: HTMLDivElement | null) => {
    if (el) renderGoogleButton(el);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onLoadVideo(input.trim());
      setShowDropdown(false);
    }
  };

  const handleDemoClick = (id: string) => {
    setInput(`https://youtube.com/watch?v=${id}`);
    onLoadVideo(id);
    setShowDropdown(false);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-raised border-b border-line shrink-0">
      <SiteMark name="Tube Shadowing" />

      {hideSearch && <div className="flex-1" />}

      {!hideSearch && <div className="flex-1 relative" ref={dropdownRef}>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center bg-hovered rounded-md border border-line-strong focus-within:border-line-strong transition-colors">
          <Search className="w-4 h-4 text-ink-soft ml-3 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Paste YouTube URL or select a demo..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-ink placeholder-ink-mute outline-none"
          />
          <button
            type="submit"
            className="px-4 py-1.5 mr-1.5 text-sm font-medium btn-primary rounded-md transition-colors"
          >
            Load
          </button>
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-hovered border border-line-strong rounded-md shadow-xl z-50 max-h-80 overflow-y-auto">
            {history.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-1 px-2 py-1 text-xs text-ink-soft uppercase tracking-wide">
                  <Clock className="w-3 h-3" /> Recent
                </div>
                {history.slice(0, 5).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleDemoClick(id)}
                    className="w-full text-left px-3 py-1.5 text-sm text-ink-soft hover:bg-hovered rounded transition-colors truncate"
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}
            <div className="p-2 border-t border-line-strong">
              <div className="flex items-center gap-1 px-2 py-1 text-xs text-ink-soft uppercase tracking-wide">
                <ChevronDown className="w-3 h-3" /> Demo Videos
              </div>
              {DEMO_VIDEOS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemoClick(demo.id)}
                  className="w-full text-left px-3 py-1.5 text-sm text-ink-soft hover:bg-hovered rounded transition-colors truncate"
                >
                  {demo.title}
                </button>
              ))}
            </div>
          </div>
        )}
        </form>
      </div>}

      <button
        onClick={onShowBookshelf}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-ink-soft bg-hovered hover:bg-hovered border border-line-strong rounded-md transition-colors shrink-0"
        title="我的精读书架"
      >
        <BookOpen className="w-4 h-4 text-ink-soft" />
        <span className="hidden sm:inline">书架</span>
        {bookshelfCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium is-active text-ink-soft rounded-full">
            {bookshelfCount}
          </span>
        )}
      </button>

      <button
        onClick={onShowAISettings}
        className={`relative p-2 transition-colors ${
          aiKeyConfigured
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-ink-soft hover:text-ink'
        }`}
        title={aiKeyConfigured ? 'DeepSeek AI 已配置' : '配置 DeepSeek AI 翻译'}
      >
        <Sparkles className="w-5 h-5" />
        {aiKeyConfigured && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        )}
      </button>

      <ThemeToggle />
      <button
        onClick={onShowShortcuts}
        className="p-2 text-ink-soft hover:text-ink transition-colors"
        title="Keyboard shortcuts"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      {/* Auth section */}
      <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-line">
        {authLoading ? (
          <div className="w-5 h-5 border-2 border-line-strong border-t-zinc-100 rounded-full animate-spin" />
        ) : user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-hovered transition-colors"
              title="账号与设置"
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="w-7 h-7 rounded-full border border-line-strong"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-hovered border border-line-strong" />
              )}
              <span className="hidden md:block text-sm text-ink-soft max-w-[120px] truncate">
                {userLabel(user)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-mute shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-raised border border-line rounded-md shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-line">
                  <div className="text-sm text-ink truncate">{userLabel(user)}</div>
                  <div className="text-xs text-ink-mute truncate">{user.email}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onShowSettings();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-soft hover:bg-hovered hover:text-ink transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  个人设置
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-soft hover:bg-hovered hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {googleReady && googleClientId && <div ref={googleBtnRef} />}
            {githubClientId && (
              <button
                onClick={onGithubLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink bg-hovered hover:bg-hovered border border-line-strong rounded-full transition-colors"
                title="使用 GitHub 登录"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">GitHub 登录</span>
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
