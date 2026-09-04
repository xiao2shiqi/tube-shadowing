import { Repeat, Pause, Gauge } from 'lucide-react';

interface ShadowingControlsProps {
  isLooping: boolean;
  isAutoPause: boolean;
  playbackRate: number;
  onToggleLoop: () => void;
  onToggleAutoPause: () => void;
  onSpeedChange: (delta: number) => void;
}

export default function ShadowingControls({
  isLooping,
  isAutoPause,
  playbackRate,
  onToggleLoop,
  onToggleAutoPause,
  onSpeedChange,
}: ShadowingControlsProps) {
  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      <button
        onClick={onToggleLoop}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isLooping
            ? 'is-active border'
            : 'bg-hovered text-ink-soft border border-line-strong hover:text-ink'
        }`}
        title="A-B Loop (L)"
      >
        <Repeat className="w-4 h-4" />
        A-B Loop
      </button>

      <button
        onClick={onToggleAutoPause}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isAutoPause
            ? 'is-active border'
            : 'bg-hovered text-ink-soft border border-line-strong hover:text-ink'
        }`}
        title="Auto-pause at sentence end (P)"
      >
        <Pause className="w-4 h-4" />
        Auto-pause
      </button>

      <div className="flex items-center gap-1 ml-auto">
        <Gauge className="w-4 h-4 text-ink-soft" />
        <button
          onClick={() => onSpeedChange(-0.1)}
          className="px-2 py-1 text-sm bg-hovered border border-line-strong rounded text-ink-soft hover:text-ink transition-colors"
          title="Slow down ([)"
        >
          -
        </button>
        <span className="px-2 py-1 text-sm font-mono text-ink-soft min-w-[3rem] text-center">
          {playbackRate.toFixed(1)}x
        </span>
        <button
          onClick={() => onSpeedChange(0.1)}
          className="px-2 py-1 text-sm bg-hovered border border-line-strong rounded text-ink-soft hover:text-ink transition-colors"
          title="Speed up (])"
        >
          +
        </button>
      </div>
    </div>
  );
}
