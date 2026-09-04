import { useState } from 'react';
import { X, BookOpen, Clock, Trash2, Sparkles, Play, Check } from 'lucide-react';
import type { BookshelfItem } from '../../types/bookshelf';
import type { TranslationRecord } from '../../types/translation';

type Tab = 'bookshelf' | 'translations';

interface BookshelfModalProps {
  items: BookshelfItem[];
  translations: TranslationRecord[];
  currentVideoId?: string;
  onSelectVideo: (videoId: string, resumeTime: number) => void;
  onDeleteItem: (videoId: string) => void;
  onDeleteTranslation: (videoId: string) => void;
  onClose: () => void;
}

function formatDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export default function BookshelfModal({
  items,
  translations,
  currentVideoId,
  onSelectVideo,
  onDeleteItem,
  onDeleteTranslation,
  onClose,
}: BookshelfModalProps) {
  const [tab, setTab] = useState<Tab>('bookshelf');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 overlay flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-raised border border-line-strong rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-1">
            {([
              ['bookshelf', '精读书架', items.length],
              ['translations', '翻译记录', translations.length],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setConfirmDeleteId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  tab === id
                    ? 'bg-hovered text-ink'
                    : 'text-ink-soft hover:text-ink hover:bg-hovered'
                }`}
              >
                {id === 'bookshelf' ? (
                  <BookOpen className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {label}
                <span className="text-ink-mute">({count})</span>
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-soft hover:text-ink rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto p-6 ${tab === 'bookshelf' ? '' : 'hidden'}`}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-ink-mute">
              <BookOpen className="w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="text-sm">
                书架空空如也，在上方输入 YouTube 链接开始精听研读吧！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const isCurrent = item.videoId === currentVideoId;
                const isConfirmingDelete = confirmDeleteId === item.videoId;
                return (
                  <div
                    key={item.videoId}
                    onClick={() => {
                      if (isConfirmingDelete) return;
                      onSelectVideo(item.videoId, item.lastPlayedTime);
                      onClose();
                    }}
                    className={`group relative bg-hovered hover:bg-hovered border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:border-line-strong flex flex-col ${
                      isCurrent
                        ? 'border-line-strong ring-1 ring-line-strong'
                        : 'border-line-strong/60'
                    }`}
                  >
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-btn text-btn-fg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                        <div
                          className="h-full bg-btn"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-ink line-clamp-2 leading-snug group-hover:text-ink transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-ink-soft">
                          <span>{item.sentenceCount} 句字幕</span>
                          {item.hasTranslation && (
                            <span className="flex items-center gap-0.5 text-ink-soft bg-hovered px-1.5 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" /> 已精翻
                            </span>
                          )}
                        </div>
                      </div>

                      {isConfirmingDelete ? (
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-line-strong/50 text-xs">
                          <span className="text-ink-soft leading-snug">
                            仅移除本机记录与缓存，全站共享的双语字幕不受影响
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                                onDeleteItem(item.videoId);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium transition-colors"
                            >
                              <Check className="w-3 h-3" /> 确认
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded text-ink-soft hover:text-ink transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line-strong/50 text-xs text-ink-mute">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-ink-soft" />
                            上次看到: {formatTime(item.lastPlayedTime)} (
                            {item.progressPercent}%)
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(item.videoId);
                            }}
                            className="p-1 hover:text-red-400 transition-colors"
                            title="从书架移除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto p-6 ${tab === 'translations' ? '' : 'hidden'}`}>
          {translations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-ink-mute">
              <Sparkles className="w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="text-sm">还没有翻译记录。打开视频后点「AI 翻译」即可。</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-mute mb-4">
                你亲自翻译过的视频。字幕本身已存入全站共享缓存，删除记录不影响字幕。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {translations.map((item) => {
                  const isCurrent = item.videoId === currentVideoId;
                  const isConfirmingDelete = confirmDeleteId === item.videoId;
                  return (
                    <div
                      key={item.videoId}
                      onClick={() => {
                        if (isConfirmingDelete) return;
                        onSelectVideo(item.videoId, 0);
                        onClose();
                      }}
                      className={`group relative bg-hovered hover:bg-hovered border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:border-line-strong flex flex-col ${
                        isCurrent
                          ? 'border-line-strong ring-1 ring-line-strong'
                          : 'border-line-strong/60'
                      }`}
                    >
                      <div className="relative aspect-video bg-black overflow-hidden">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-btn text-btn-fg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-ink line-clamp-2 leading-snug group-hover:text-ink transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2 text-xs text-ink-soft">
                            <span>{item.sentenceCount} 句字幕</span>
                            <span className="flex items-center gap-0.5 text-ink-soft bg-hovered px-1.5 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" /> 已精翻
                            </span>
                          </div>
                        </div>

                        {isConfirmingDelete ? (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-line-strong/50 text-xs">
                            <span className="text-ink-soft leading-snug">
                              仅删除这条记录，字幕仍在全站缓存中
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                  onDeleteTranslation(item.videoId);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium transition-colors"
                              >
                                <Check className="w-3 h-3" /> 确认
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded text-ink-soft hover:text-ink transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line-strong/50 text-xs text-ink-mute">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-ink-soft" />
                              翻译于 {formatDate(item.translatedAt)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(item.videoId);
                              }}
                              className="p-1 hover:text-red-400 transition-colors"
                              title="删除这条翻译记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
