import { memo, useEffect, useRef } from 'react';
import type { TranscriptSentence, SubtitleMode } from '../../types/subtitle';
import TranscriptItem from './TranscriptItem';
import { useVirtualList } from '../../hooks/useVirtualList';

interface TranscriptListProps {
  sentences: TranscriptSentence[];
  activeIndex: number;
  subtitleMode: SubtitleMode;
  onSentenceClick: (index: number) => void;
  listKey?: string;
}

const ESTIMATED_HEIGHT = 84;
const OVERSCAN = 10;
const JUMP_INDEX_THRESHOLD = 5;

function TranscriptList({
  sentences,
  activeIndex,
  subtitleMode,
  onSentenceClick,
  listKey,
}: TranscriptListProps) {
  const { virtualItems, totalHeight, scrollToIndex, containerRef } = useVirtualList({
    items: sentences,
    getItemKey: (item) => item.id,
    estimatedHeight: ESTIMATED_HEIGHT,
    overscan: OVERSCAN,
    listKey,
  });

  const lastActiveIndexRef = useRef<number>(-1);
  const firstScrollAfterListChangeRef = useRef(true);

  // Reset scroll tracking when the video (listKey) changes
  useEffect(() => {
    lastActiveIndexRef.current = -1;
    firstScrollAfterListChangeRef.current = true;
  }, [listKey]);

  useEffect(() => {
    if (activeIndex < 0) {
      lastActiveIndexRef.current = activeIndex;
      return;
    }

    const previous = lastActiveIndexRef.current;
    const isInitialResume = firstScrollAfterListChangeRef.current && activeIndex > 0;
    const isLargeJump = previous >= 0 && Math.abs(activeIndex - previous) > JUMP_INDEX_THRESHOLD;
    const behavior: ScrollBehavior = isInitialResume || isLargeJump ? 'auto' : 'smooth';

    scrollToIndex(activeIndex, behavior);
    lastActiveIndexRef.current = activeIndex;
    firstScrollAfterListChangeRef.current = false;
  }, [activeIndex, scrollToIndex]);

  if (!sentences.length) {
    return (
      <div className="flex items-center justify-center h-full text-ink-mute text-sm">
        <p>Load a YouTube video to see subtitles here.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-2 py-2">
      <div style={{ position: 'relative', height: totalHeight }}>
        {virtualItems.map(({ index, key, item, style, measureRef }) => (
          <div
            key={key}
            ref={measureRef as React.RefCallback<HTMLDivElement>}
            style={style}
            className="px-2 pb-1"
          >
            <TranscriptItem
              index={index}
              en={item.en}
              zh={item.zh}
              words={item.words}
              isActive={index === activeIndex}
              subtitleMode={subtitleMode}
              onSentenceClick={onSentenceClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TranscriptList);
