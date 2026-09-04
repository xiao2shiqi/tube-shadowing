import { useEffect, useState } from 'react';
import { Play, Loader2, Radio, BookOpen, Clock, Sparkles } from 'lucide-react';
import { fetchCuratedFeed } from '../../services/curatedFeedApi';
import type { FeedCategory, FeedVideoItem } from '../../types/feed';

interface CuratedFeedSectionProps {
  onLoadVideo: (input: string) => void;
}

interface StreamTab {
  key: FeedCategory;
  title: string;
  icon: React.ElementType;
  description: string;
}

const STREAM_TABS: StreamTab[] = [
  {
    key: 'learning',
    title: '🎯 英语学习 · BBC 6 Minute English',
    icon: BookOpen,
    description: '标准 RP 伦敦音 · 语速适中 · 适合新概念二进阶与影子跟读',
  },
  {
    key: 'tech',
    title: '🚀 科技前沿 · Lex Fridman 播客',
    icon: Radio,
    description: 'Sam Altman / 马斯克 / 黄仁勋 / DHH 深度对话 · AI 双语辅助 · 按 YouTube 最新上传排序',
  },
];

function isRecent(publishedAt: string): boolean {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  return hours < 24;
}

export default function CuratedFeedSection({ onLoadVideo }: CuratedFeedSectionProps) {
  const [activeTab, setActiveTab] = useState<FeedCategory>('learning');
  const [items, setItems] = useState<FeedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCuratedFeed(activeTab)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const currentTabInfo = STREAM_TABS.find((t) => t.key === activeTab) || STREAM_TABS[0];

  return (
    <div className="w-full max-w-6xl mt-12">
      {/* Dual-Stream Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
          {STREAM_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 shadow-md font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Description Hint */}
        <div className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>{currentTabInfo.description}</span>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-zinc-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="py-8 text-center text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="py-8 text-center text-sm text-zinc-500 bg-zinc-900/40 border border-zinc-800 rounded-xl">
          暂无该专栏下的内容
        </div>
      )}

      {/* Video Grid */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item, idx) => (
            <button
              key={item.videoId || idx}
              onClick={() => onLoadVideo(item.videoId)}
              className="group text-left bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 text-zinc-900 fill-zinc-900 ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge for Learning stream */}
                {activeTab === 'learning' && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-medium bg-black/80 text-zinc-200 rounded backdrop-blur-sm flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-emerald-400" />
                    06:00
                  </span>
                )}

                {/* Recent indicator */}
                {isRecent(item.publishedAt) && (
                  <span
                    className="absolute top-2 left-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"
                    title="最近更新"
                  />
                )}
              </div>

              {/* Meta */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 mb-2 group-hover:text-zinc-100 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500 truncate">
                    {item.channelName}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.levelTag && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                        {item.levelTag === 'A2' ? '🟢 A2/B1 基础跟读' : item.levelTag}
                      </span>
                    )}
                    {activeTab === 'tech' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100/10 text-zinc-300 border border-zinc-100/20 rounded">
                        🎙️ 深度访谈
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] text-zinc-600">
                  {item.relativeTime}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading bottom spinner */}
      {loading && items.length === 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          正在拉取最新内容...
        </div>
      )}
    </div>
  );
}

