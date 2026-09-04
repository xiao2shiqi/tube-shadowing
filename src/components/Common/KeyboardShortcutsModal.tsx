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
      className="fixed inset-0 z-50 flex items-center justify-center overlay"
      onClick={onClose}
    >
      <div
        className="bg-raised border border-line-strong rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-ink-soft">{desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-hovered text-ink-soft border border-line-strong rounded">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-mute">
          Click any English word to look it up in Eudic (macOS only).
        </p>
      </div>
    </div>
  );
}
