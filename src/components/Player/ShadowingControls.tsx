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
            ? 'bg-zinc-100/10 text-zinc-100 border border-zinc-100/25'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
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
            ? 'bg-zinc-100/10 text-zinc-100 border border-zinc-100/25'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
        }`}
        title="Auto-pause at sentence end (P)"
      >
        <Pause className="w-4 h-4" />
        Auto-pause
      </button>

      <div className="flex items-center gap-1 ml-auto">
        <Gauge className="w-4 h-4 text-zinc-400" />
        <button
          onClick={() => onSpeedChange(-0.1)}
          className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:text-white transition-colors"
          title="Slow down ([)"
        >
          -
        </button>
        <span className="px-2 py-1 text-sm font-mono text-zinc-300 min-w-[3rem] text-center">
          {playbackRate.toFixed(1)}x
        </span>
        <button
          onClick={() => onSpeedChange(0.1)}
          className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:text-white transition-colors"
          title="Speed up (])"
        >
          +
        </button>
      </div>
    </div>
  );
}
