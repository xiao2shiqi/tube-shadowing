import { memo, forwardRef } from 'react';
import type { SubtitleMode, WordTiming } from '../../types/subtitle';
import ClickableWord from './ClickableWord';

interface TranscriptItemProps {
  index: number;
  en: string;
  zh: string;
  words?: WordTiming[];
  isActive: boolean;
  subtitleMode: SubtitleMode;
  onSentenceClick: (index: number) => void;
}

const TranscriptItem = memo(
  forwardRef<HTMLDivElement, TranscriptItemProps>(
    ({ index, en, zh, words, isActive, subtitleMode, onSentenceClick }, ref) => {
      return (
        <div
          ref={ref}
          onClick={() => onSentenceClick(index)}
          className={`px-4 py-3 cursor-pointer rounded-lg transition-all duration-200 border ${
            isActive
              ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
              : 'bg-transparent border-transparent hover:bg-zinc-800/50'
          }`}
        >
          {(subtitleMode === 'bilingual' || subtitleMode === 'en') && (
            <p
              className={`text-base leading-relaxed ${
                isActive ? 'text-white font-medium' : 'text-zinc-200'
              }`}
            >
              <ClickableWord
                sentence={en}
                words={words}
                isActiveSentence={isActive}
              />
            </p>
          )}

          {(subtitleMode === 'bilingual' || subtitleMode === 'zh') && (
            <div className="mt-1.5">
              {zh ? (
                <p
                  className={`text-sm leading-relaxed ${
                    isActive ? 'text-amber-300/90' : 'text-zinc-400'
                  }`}
                >
                  {zh}
                </p>
              ) : subtitleMode === 'zh' ? (
                <div>
                  <p className="text-base text-zinc-300 leading-relaxed">
                    <ClickableWord sentence={en} isActiveSentence={false} />
                  </p>
                  <span className="text-xs text-zinc-500 italic mt-0.5 block">
                    (暂无中文字幕)
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {subtitleMode === 'blurred' && (
            <p className="text-base blurred-text text-zinc-300">{en}</p>
          )}
        </div>
      );
    }
  )
);

TranscriptItem.displayName = 'TranscriptItem';
export default TranscriptItem;
