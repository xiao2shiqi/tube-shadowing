import { usePlayerTime } from '../../services/timeStore';
import type { WordTiming } from '../../types/subtitle';
import { openInEudic } from '../../services/eudicService';

interface ClickableWordProps {
  sentence: string;
  words?: WordTiming[];
  isActiveSentence: boolean;
}

function KaraokeWords({ words }: { words: WordTiming[] }) {
  const currentTime = usePlayerTime();

  return (
    <span className="leading-relaxed inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {words.map((w, index) => {
        const isCurrentlySpeaking = currentTime >= w.start && currentTime < w.end;
        const isSpoken = currentTime >= w.end;

        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              openInEudic(w.word);
            }}
            className={`cursor-pointer rounded px-1 transition-all duration-75 select-none ${
              isCurrentlySpeaking
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-md scale-105 ring-2 ring-amber-300/50'
                : isSpoken
                ? 'text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
            title="点击在 Mac 欧路词典中查看"
          >
            {w.word}
          </span>
        );
      })}
    </span>
  );
}

export default function ClickableWord({
  sentence,
  words,
  isActiveSentence,
}: ClickableWordProps) {
  // Word-level karaoke rendering for the active sentence with precise timings
  if (isActiveSentence && words && words.length > 0) {
    return <KaraokeWords words={words} />;
  }

  // Fallback token rendering for inactive sentences or missing word timings
  const tokens = sentence.split(/(\s+|[.,!?;:"()[\]{}]+)/);

  return (
    <span className="leading-relaxed">
      {tokens.map((token, index) => {
        const isWord = /[a-zA-Z0-9]/.test(token);
        if (!isWord) {
          return (
            <span key={index} className="text-zinc-500">
              {token}
            </span>
          );
        }

        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              openInEudic(token);
            }}
            className="cursor-pointer rounded px-0.5 transition-colors duration-150 hover:bg-zinc-100/15 hover:text-zinc-100 active:bg-zinc-100/25"
            title="Click to look up in Eudic"
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}
