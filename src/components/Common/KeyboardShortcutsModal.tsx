import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'A / \u2190', desc: 'Previous sentence' },
  { key: 'D / \u2192', desc: 'Next sentence' },
  { key: 'R', desc: 'Replay current sentence' },
  { key: 'L', desc: 'Toggle A-B Loop' },
  { key: 'P', desc: 'Toggle Auto-pause' },
  { key: '[ / ]', desc: 'Speed -0.1x / +0.1x' },
  { key: '1', desc: 'Bilingual mode' },
  { key: '2', desc: 'English only' },
  { key: '3', desc: 'Chinese only' },
  { key: '4', desc: 'Listening blind box' },
];

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-zinc-400">{desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-zinc-800 text-amber-400 border border-zinc-600 rounded">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Click any English word to look it up in Eudic (macOS only).
        </p>
      </div>
    </div>
  );
}
