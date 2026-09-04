import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { TranscriptSentence } from './types/subtitle';
import type { AISettings } from './types/ai';
import type { BookshelfItem } from './types/bookshelf';
import { DEFAULT_AI_SETTINGS, activeKeyConfig, normalizeAISettings } from './types/ai';
import { fetchTranscript, parseVideoId } from './services/transcriptService';
import { fetchCloudTranscriptCache } from './services/transcriptCacheApi';
import {
  getCachedTranscript,
  setCachedTranscript,
  getBookshelfItems,
  saveBookshelfItem,
  deleteBookshelfItem,
} from './services/indexedDbService';
import type { User } from './services/authService';
import {
  loadAuthConfig,
  loadGoogleScript,
  initializeGoogleSignIn,
  exchangeGoogleToken,
  fetchCurrentUser,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  disableGoogleAutoSelect,
  consumeGithubCallback,
  exchangeGithubCode,
  startGithubLogin,
  userLabel,
} from './services/authService';
import {
  fetchServerBookshelf,
  upsertServerItem,
  deleteServerItem,
} from './services/bookshelfApi';
import { fetchServerApiKeys, saveServerApiKey } from './services/userApiKeysApi';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { useShadowing } from './hooks/useShadowing';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAITranslation } from './hooks/useAITranslation';
import Header from './components/Header';
import YouTubePlayer from './components/Player/YouTubePlayer';
import ShadowingControls from './components/Player/ShadowingControls';
import TranscriptList from './components/Transcript/TranscriptList';
import KeyboardShortcutsModal from './components/Common/KeyboardShortcutsModal';
import SettingsModal from './components/Settings/SettingsModal';
import type { SettingsSectionId } from './components/Settings/SettingsModal';
import BookshelfModal from './components/Bookshelf/BookshelfModal';
import Toast from './components/Common/Toast';
import HeroSection from './components/HeroSection';
import { Sparkles, Loader2, X, BookmarkPlus, BookmarkCheck } from 'lucide-react';

const PLAYER_CONTAINER_ID = 'yt-player';

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function App() {
  const [sentences, setSentences] = useState<TranscriptSentence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // null = closed; otherwise the section 个人设置 opens on
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId | null>(null);
  const [showBookshelf, setShowBookshelf] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useLocalStorage<string[]>('tube-shadowing-history', []);
  const [storedAISettings, setStoredAISettings] = useLocalStorage<AISettings>(
    'tube-shadowing-ai-settings',
    DEFAULT_AI_SETTINGS
  );
  // Browsers that used the old single-provider settings shape get upgraded on read
  const aiSettings = useMemo(
    () => normalizeAISettings(storedAISettings),
    [storedAISettings]
  );
  const setAISettings = useCallback(
    (value: AISettings | ((prev: AISettings) => AISettings)) => {
      setStoredAISettings((prev) =>
        value instanceof Function ? value(normalizeAISettings(prev)) : value
      );
    },
    [setStoredAISettings]
  );
  const [leftWidth, setLeftWidth] = useLocalStorage<number>('tube-shadowing-panel-width', 50);
  const [bookshelfItems, setBookshelfItems] = useState<BookshelfItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [githubClientId, setGithubClientId] = useState<string>('');
  const [apiKeysSyncing, setApiKeysSyncing] = useState(false);

  const currentVideoIdRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);
  const pendingServerUpsertRef = useRef<Map<string, BookshelfItem>>(new Map());
  const syncTimeoutRef = useRef<number | null>(null);

  const { player, currentTime, loadVideo } = useYouTubePlayer(
    PLAYER_CONTAINER_ID
  );

  const shadowing = useShadowing(player, sentences, currentTime, showToast);

  // Merge local and server bookshelves, keeping the item with the latest lastStudiedAt
  const mergeBookshelves = useCallback(
    (local: BookshelfItem[], server: BookshelfItem[]): BookshelfItem[] => {
      const map = new Map<string, BookshelfItem>();
      for (const item of local) map.set(item.videoId, item);
      for (const item of server) {
        const existing = map.get(item.videoId);
        if (!existing || item.lastStudiedAt > existing.lastStudiedAt) {
          map.set(item.videoId, item);
        }
      }
      return Array.from(map.values()).sort((a, b) => b.lastStudiedAt - a.lastStudiedAt);
    },
    []
  );

  const flushPendingSync = useCallback(async () => {
    if (pendingServerUpsertRef.current.size === 0) return;
    const items = Array.from(pendingServerUpsertRef.current.values());
    pendingServerUpsertRef.current.clear();
    if (!user) return;
    await Promise.all(
      items.map((item) =>
        upsertServerItem(item).catch(() => {
          // Put back on failure so the next flush retries
          pendingServerUpsertRef.current.set(item.videoId, item);
        })
      )
    );
  }, [user]);

  // Pull server-synced AI API keys after a successful login and merge them into
  // local settings (server copy wins — it's the same key set from any device).
  const syncApiKeysFromServer = useCallback(async () => {
    setApiKeysSyncing(true);
    try {
      const serverKeys = await fetchServerApiKeys();
      if (Object.keys(serverKeys).length > 0) {
        setAISettings((prev) => ({ ...prev, keys: { ...prev.keys, ...serverKeys } }));
      }
    } catch {
      // Non-fatal — keep whatever is in local storage
    } finally {
      setApiKeysSyncing(false);
    }
  }, [setAISettings]);

  const finishLogin = useCallback(
    async (token: string, u: User) => {
      setStoredToken(token);
      setUser(u);
      setAuthLoading(false);
      showToast(`欢迎，${userLabel(u)}`);

      const local = await getBookshelfItems();
      const server = await fetchServerBookshelf();
      const merged = mergeBookshelves(local, server);
      setBookshelfItems(merged);

      // Upload local items that are newer than the server's copy
      const serverMap = new Map(server.map((i) => [i.videoId, i]));
      const toUpload = local.filter(
        (i) => !serverMap.get(i.videoId) || i.lastStudiedAt > serverMap.get(i.videoId)!.lastStudiedAt
      );
      await Promise.all(toUpload.map((i) => upsertServerItem(i).catch(() => undefined)));

      await syncApiKeysFromServer();
    },
    [mergeBookshelves, showToast, syncApiKeysFromServer]
  );

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      try {
        const { token, user: u } = await exchangeGoogleToken(credential);
        await finishLogin(token, u);
      } catch (err) {
        showToast(err instanceof Error ? err.message : '登录失败');
        clearStoredToken();
        setUser(null);
      }
    },
    [finishLogin, showToast]
  );

  const handleGithubLogin = useCallback(() => {
    if (githubClientId) startGithubLogin(githubClientId);
  }, [githubClientId]);

  const handleLogout = useCallback(() => {
    flushPendingSync().finally(() => {
      clearStoredToken();
      setUser(null);
      disableGoogleAutoSelect();
      showToast('已退出登录');
    });
  }, [flushPendingSync, showToast]);

  const handleSentencesUpdate = useCallback(
    (updater: (prev: TranscriptSentence[]) => TranscriptSentence[]) => {
      setSentences(updater);
    },
    []
  );

  const { progress, startTranslation, cancelTranslation } = useAITranslation(
    aiSettings,
    handleSentencesUpdate
  );

  const hasChinese = sentences.some((s) => s.zh);
  const aiKeyConfigured = activeKeyConfig(aiSettings).apiKey.trim().length > 0;

  // Refs kept fresh for the 3s progress recorder (avoids stale closures)
  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const activeIndexRef = useRef(shadowing.activeIndex);
  activeIndexRef.current = shadowing.activeIndex;
  const bookshelfItemsRef = useRef(bookshelfItems);
  bookshelfItemsRef.current = bookshelfItems;
  const videoMetaRef = useRef<{ title: string; duration: number }>({
    title: '',
    duration: 0,
  });

  // Initialize auth, restore session, and merge local/server bookshelf on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = await getBookshelfItems();
      if (!cancelled) setBookshelfItems(local);

      try {
        const config = await loadAuthConfig();
        if (cancelled) return;
        setGoogleClientId(config.googleClientId);
        setGithubClientId(config.githubClientId);
        if (config.googleClientId) {
          await loadGoogleScript();
          if (cancelled) return;
          initializeGoogleSignIn(config.googleClientId, (credential) => {
            handleGoogleCredential(credential);
          });
          if (!cancelled) setGoogleReady(true);
        }
      } catch {
        if (!cancelled) setGoogleReady(false);
      }

      // Returning from GitHub's OAuth redirect takes priority over any stale session
      const githubCode = consumeGithubCallback();
      if (githubCode) {
        try {
          const { token, user: u } = await exchangeGithubCode(githubCode);
          if (!cancelled) await finishLogin(token, u);
        } catch (err) {
          clearStoredToken();
          if (!cancelled) {
            setUser(null);
            setAuthLoading(false);
            showToast(err instanceof Error ? err.message : 'GitHub 登录失败');
          }
        }
        return;
      }

      const token = getStoredToken();
      if (token) {
        try {
          const u = await fetchCurrentUser(token);
          if (!cancelled) {
            setUser(u);
            setAuthLoading(false);
          }
          const server = await fetchServerBookshelf();
          if (!cancelled) {
            const merged = mergeBookshelves(local, server);
            setBookshelfItems(merged);
          }
          if (!cancelled) await syncApiKeysFromServer();
        } catch {
          clearStoredToken();
          if (!cancelled) {
            setUser(null);
            setAuthLoading(false);
          }
        }
      } else {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handleGoogleCredential, mergeBookshelves, finishLogin, syncApiKeysFromServer, showToast]);

  const upsertBookshelf = useCallback(
    (item: BookshelfItem) => {
      setBookshelfItems((prev) => {
        const filtered = prev.filter((i) => i.videoId !== item.videoId);
        return [item, ...filtered].sort((a, b) => b.lastStudiedAt - a.lastStudiedAt);
      });
      saveBookshelfItem(item);

      if (user) {
        pendingServerUpsertRef.current.set(item.videoId, item);
        if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
          flushPendingSync();
        }, 30000);
      }
    },
    [user, flushPendingSync]
  );

  // Resume playback once the player is ready after loading from the bookshelf
  useEffect(() => {
    if (player && pendingSeekRef.current != null) {
      const t = pendingSeekRef.current;
      pendingSeekRef.current = null;
      try {
        player.seekTo(t, true);
        player.playVideo();
        showToast(`已恢复上次进度 ${formatTime(t)}`);
      } catch {
        // player not ready yet
      }
    }
  }, [player, showToast]);

  const handleLoadVideo = async (
    input: string,
    resumeTime?: number
  ) => {
    const videoId = parseVideoId(input);
    if (!videoId) {
      setError('Invalid YouTube URL or video ID');
      return;
    }

    currentVideoIdRef.current = videoId;
    setVideoStarted(true);
    setActiveVideoId(videoId);
    setError(null);
    setLoading(true);
    setSentences([]);
    setCloudSynced(false);
    videoMetaRef.current = { title: videoId, duration: 0 };
    pendingSeekRef.current = resumeTime != null && resumeTime > 1 ? resumeTime : null;

    setHistory((prev) => {
      const filtered = prev.filter((id) => id !== videoId);
      return [videoId, ...filtered].slice(0, 20);
    });

    try {
      loadVideo(videoId);

      const cached = await getCachedTranscript(videoId);
      const cachedHasWords = !!cached?.some((s) => s.words && s.words.length > 0);
      const cachedHasZh = !!cached?.some((s) => s.zh);
      const meta = bookshelfItemsRef.current.find((i) => i.videoId === videoId);

      let result: { title: string; duration: number; sentences: TranscriptSentence[] };
      let cloudHit = false;

      if (cached && cachedHasWords && cachedHasZh) {
        // Level 1: IndexedDB hit with Chinese already present — 0 requests, 0 tokens
        result = {
          title: meta?.title || videoId,
          duration: meta?.duration || 0,
          sentences: cached,
        };
      } else {
        // Level 2: no local Chinese yet — check the global cloud cache before
        // falling back to a fresh (English-only) fetch + AI translation
        const cloudSentences = await fetchCloudTranscriptCache(videoId);

        if (cloudSentences && cloudSentences.length > 0) {
          result = {
            title: meta?.title || videoId,
            duration: meta?.duration || 0,
            sentences: cloudSentences,
          };
          setCachedTranscript(videoId, cloudSentences);
          cloudHit = true;
        } else {
          try {
            const fresh = await fetchTranscript(videoId);

            if (cached) {
              // Old cache without word timings: merge its zh translations into fresh data
              const cachedZhById = new Map(cached.map((s) => [s.id, s.zh]));
              fresh.sentences = fresh.sentences.map((s) => ({
                ...s,
                zh: s.zh || cachedZhById.get(s.id) || '',
              }));
            }

            result = fresh;
            setCachedTranscript(videoId, fresh.sentences);
          } catch (fetchErr) {
            // Network failure but old cache exists: degrade to cache without word karaoke
            if (cached) {
              result = {
                title: meta?.title || videoId,
                duration: meta?.duration || 0,
                sentences: cached,
              };
            } else {
              throw fetchErr;
            }
          }
        }
      }

      if (currentVideoIdRef.current === videoId) setCloudSynced(cloudHit);

      // Only apply if user hasn't switched to another video
      if (currentVideoIdRef.current !== videoId) return;

      setSentences(result.sentences);
      videoMetaRef.current = { title: result.title, duration: result.duration };

      // Only update an existing bookshelf entry (e.g. resuming from the bookshelf) —
      // loading a video no longer auto-adds it. Adding is an explicit user action
      // via the "加入书架" button.
      const existing = bookshelfItemsRef.current.find((i) => i.videoId === videoId);
      if (existing) {
        const startAt = pendingSeekRef.current ?? resumeTime ?? existing.lastPlayedTime ?? 0;
        upsertBookshelf({
          videoId,
          title: result.title,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: result.duration,
          sentenceCount: result.sentences.length,
          hasTranslation: result.sentences.some((s) => s.zh),
          lastPlayedTime: startAt,
          lastSentenceIndex: existing.lastSentenceIndex ?? 0,
          progressPercent:
            result.duration > 0
              ? Math.min(100, Math.round((startAt / result.duration) * 100))
              : 0,
          addedAt: existing.addedAt,
          lastStudiedAt: Date.now(),
        });
      }

      const needsZh = result.sentences.some((s) => !s.zh);
      if (needsZh && activeKeyConfig(aiSettings).apiKey.trim()) {
        startTranslation(videoId, result.sentences);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  // Record study progress into the bookshelf every 3 seconds
  const lastSavedTimeRef = useRef(-1);
  useEffect(() => {
    if (!player || !currentVideoIdRef.current) return;
    const id = window.setInterval(() => {
      const videoId = currentVideoIdRef.current;
      if (!videoId) return;
      const t = currentTimeRef.current;
      if (t <= 0 || Math.abs(t - lastSavedTimeRef.current) < 1) return;
      lastSavedTimeRef.current = t;

      const existing = bookshelfItemsRef.current.find((i) => i.videoId === videoId);
      if (!existing) return; // not on the shelf — don't silently re-add it

      const ss = sentencesRef.current;
      const idx = activeIndexRef.current;
      const { title, duration } = videoMetaRef.current;

      upsertBookshelf({
        videoId,
        title: existing?.title || title || videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: duration || existing?.duration || 0,
        sentenceCount: ss.length || existing?.sentenceCount || 0,
        hasTranslation: ss.some((s) => s.zh),
        lastPlayedTime: t,
        lastSentenceIndex: idx >= 0 ? idx : 0,
        progressPercent:
          duration > 0 ? Math.min(100, Math.round((t / duration) * 100)) : 0,
        addedAt: existing?.addedAt ?? Date.now(),
        lastStudiedAt: Date.now(),
      });
    }, 3000);
    return () => clearInterval(id);
  }, [player, upsertBookshelf]);

  const handleDeleteBookshelfItem = useCallback(
    async (videoId: string) => {
      setBookshelfItems((prev) => prev.filter((i) => i.videoId !== videoId));
      await deleteBookshelfItem(videoId); // also clears this video's local subtitle cache
      pendingServerUpsertRef.current.delete(videoId);
      if (user) {
        await deleteServerItem(videoId).catch(() => undefined);
      }
      showToast('已从书架移除。全站共享的双语字幕缓存不受影响，下次打开依旧秒开');
    },
    [user, showToast]
  );

  const handleToggleBookshelf = useCallback(() => {
    const videoId = currentVideoIdRef.current;
    if (!videoId) return;

    const existing = bookshelfItemsRef.current.find((i) => i.videoId === videoId);
    if (existing) {
      handleDeleteBookshelfItem(videoId);
      return;
    }

    const { title, duration } = videoMetaRef.current;
    const t = currentTimeRef.current || 0;
    upsertBookshelf({
      videoId,
      title: title || videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration,
      sentenceCount: sentencesRef.current.length,
      hasTranslation: sentencesRef.current.some((s) => s.zh),
      lastPlayedTime: t,
      lastSentenceIndex: activeIndexRef.current >= 0 ? activeIndexRef.current : 0,
      progressPercent: duration > 0 ? Math.min(100, Math.round((t / duration) * 100)) : 0,
      addedAt: Date.now(),
      lastStudiedAt: Date.now(),
    });
    showToast('已加入书架');
  }, [upsertBookshelf, handleDeleteBookshelfItem, showToast]);

  // Flush pending bookshelf changes when the user leaves or hides the page
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) flushPendingSync();
    };
    const onBeforeUnload = () => {
      flushPendingSync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [flushPendingSync]);

  const handleSaveAISettings = (newSettings: AISettings) => {
    setAISettings(newSettings);

    const active = activeKeyConfig(newSettings);

    // Logged in: keep the key on the server (encrypted) so it follows the user
    // across devices. Logged out: local storage only, same as before.
    if (user && active.apiKey.trim()) {
      setApiKeysSyncing(true);
      saveServerApiKey(newSettings.provider, active)
        .catch(() => showToast('API Key 云端保存失败，已保留在本机'))
        .finally(() => setApiKeysSyncing(false));
    }

    const pendingZh = currentVideoIdRef.current && sentences.some((s) => !s.zh);
    if (active.apiKey.trim() && pendingZh && currentVideoIdRef.current) {
      showToast('AI 翻译已启动，正在后台进行...');
      startTranslation(currentVideoIdRef.current, sentences);
    }
  };

  // Draggable divider between player and transcript panels
  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const container = mainRef.current;
      if (!container) return;
      setIsDragging(true);
      const rect = container.getBoundingClientRect();
      const onMove = (ev: MouseEvent) => {
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setLeftWidth(Math.max(20, Math.min(80, Math.round(pct * 10) / 10)));
      };
      const onUp = () => {
        setIsDragging(false);
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [setLeftWidth]
  );

  const isBookshelved =
    !!activeVideoId && bookshelfItems.some((i) => i.videoId === activeVideoId);

  const percent =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <div className="h-full flex flex-col">
      <Header
        onLoadVideo={(input) => handleLoadVideo(input)}
        history={history}
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowAISettings={() => setSettingsSection('ai')}
        onShowSettings={() => setSettingsSection('account')}
        aiKeyConfigured={aiKeyConfigured}
        onShowBookshelf={() => setShowBookshelf(true)}
        bookshelfCount={bookshelfItems.length}
        user={user}
        authLoading={authLoading}
        googleReady={googleReady}
        googleClientId={googleClientId}
        githubClientId={githubClientId}
        onGithubLogin={handleGithubLogin}
        onLogout={handleLogout}
        hideSearch={!videoStarted}
      />

      {!videoStarted ? (
        <HeroSection
          onLoadVideo={(input) => handleLoadVideo(input)}
          history={history}
        />
      ) : (
      <main
        ref={mainRef}
        className="flex-1 flex overflow-hidden"
        style={{ '--left-w': `${leftWidth}%` } as React.CSSProperties}
      >
        {/* Left panel: Player + Controls */}
        <div className="w-full lg:w-[var(--left-w)] p-4 flex flex-col overflow-y-auto">
          <YouTubePlayer containerId={PLAYER_CONTAINER_ID} />

          <ShadowingControls
            isLooping={shadowing.isLooping}
            isAutoPause={shadowing.isAutoPause}
            playbackRate={shadowing.playbackRate}
            onToggleLoop={shadowing.toggleLoop}
            onToggleAutoPause={shadowing.toggleAutoPause}
            onSpeedChange={(delta) => shadowing.setPlaybackRate(shadowing.playbackRate + delta)}
          />

          {/* Subtitle mode pills */}
          <div className="flex items-center gap-1 mt-3">
            {(
              [
                ['bilingual', 'Bilingual'],
                ['en', 'English'],
                ['zh', '中文'],
                ['blurred', 'Blind Box'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => shadowing.setSubtitleMode(mode)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  shadowing.subtitleMode === mode
                    ? 'bg-zinc-100/10 text-zinc-100 border border-zinc-100/25'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Translation progress bar */}
          {progress.status === 'translating' && (
            <div className="mt-3 p-3 bg-zinc-100/5 border border-zinc-100/15 rounded-lg">
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  DeepSeek AI 智能精翻中... {percent}% ({progress.completed}/
                  {progress.total} 句)
                </span>
                <button
                  onClick={cancelTranslation}
                  className="p-0.5 text-zinc-500 hover:text-zinc-100"
                  title="中断翻译"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-zinc-400 to-zinc-100 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {progress.status === 'error' && progress.errorMessage && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {progress.errorMessage}
            </div>
          )}

          {/* No Chinese & no key: guide to configure */}
          {!hasChinese && !aiKeyConfigured && sentences.length > 0 && (
            <button
              onClick={() => setSettingsSection('ai')}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-zinc-100/10 hover:bg-zinc-100/15 border border-zinc-100/25 text-zinc-100 rounded-lg text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              配置 DeepSeek 一键翻译双语
            </button>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
              <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin" />
              Loading subtitles...
            </div>
          )}

          {/* Explicit opt-in bookshelf toggle — loading a video no longer auto-adds it */}
          {sentences.length > 0 && (
            <button
              onClick={handleToggleBookshelf}
              className={`mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                isBookshelved
                  ? 'bg-zinc-100/10 text-zinc-100 border-zinc-100/25 hover:bg-zinc-100/15'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-zinc-100 hover:border-zinc-100/30'
              }`}
            >
              {isBookshelved ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  已加入书架 · 点击移除
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  加入书架
                </>
              )}
            </button>
          )}
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={startDrag}
          onDoubleClick={() => setLeftWidth(50)}
          className={`hidden lg:block w-1.5 shrink-0 cursor-col-resize transition-colors relative group ${
            isDragging ? 'bg-zinc-100' : 'bg-zinc-800 hover:bg-zinc-100/50'
          }`}
          title="拖动调整面板宽度，双击复位"
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 rounded-full bg-zinc-600 group-hover:bg-zinc-100/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-3.5 bg-zinc-900 rounded-full" />
          </div>
        </div>

        {/* Right panel: Transcript */}
        <div className="hidden lg:flex lg:w-[calc(100%-var(--left-w))] flex-col bg-zinc-950">
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center">
            <h2 className="text-sm font-medium text-zinc-400">
              Transcript
              {sentences.length > 0 && (
                <span className="ml-2 text-zinc-600">({sentences.length} sentences)</span>
              )}
            </h2>
            {progress.status === 'translating' && (
              <span className="ml-auto text-xs text-zinc-400">
                ✨ {percent}%
              </span>
            )}
            {progress.status !== 'translating' && cloudSynced && (
              <span className="ml-auto text-xs text-emerald-400/80">
                ✨ 已同步云端双语精翻
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <TranscriptList
              sentences={sentences}
              activeIndex={shadowing.activeIndex}
              subtitleMode={shadowing.subtitleMode}
              onSentenceClick={shadowing.seekToSentence}
              listKey={currentVideoIdRef.current || undefined}
            />
          </div>
        </div>
      </main>
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {settingsSection && (
        <SettingsModal
          user={user}
          aiSettings={aiSettings}
          apiKeysSyncing={apiKeysSyncing}
          initialSection={settingsSection}
          onSaveAISettings={handleSaveAISettings}
          onUserUpdate={setUser}
          onToast={showToast}
          onClose={() => setSettingsSection(null)}
        />
      )}

      {showBookshelf && (
        <BookshelfModal
          items={bookshelfItems}
          currentVideoId={currentVideoIdRef.current || undefined}
          onSelectVideo={(videoId, resumeTime) => handleLoadVideo(videoId, resumeTime)}
          onDeleteItem={handleDeleteBookshelfItem}
          onClose={() => setShowBookshelf(false)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
