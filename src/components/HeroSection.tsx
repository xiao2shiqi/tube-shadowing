import { useState, useRef, useEffect } from 'react';
import { Search, Clock, ChevronDown, Play } from 'lucide-react';
import { DEMO_VIDEOS } from '../constants/demoVideos';
import CuratedFeedSection from './CuratedFeed/CuratedFeedSection';

interface HeroSectionProps {
  onLoadVideo: (input: string) => void;
  history: string[];
}

export default function HeroSection({ onLoadVideo, history }: HeroSectionProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onLoadVideo(input.trim());
      setShowDropdown(false);
    }
  };

  const handleDemoClick = (id: string) => {
    onLoadVideo(id);
    setShowDropdown(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center bg-zinc-950 px-4 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[60vh]">
        {/* Logo & tagline */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-bold text-zinc-300 mb-4 tracking-tight">
            Tube Shadowing
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Shadow native speakers. Master natural English with YouTube.
          </p>
        </div>

      {/* Search input */}
      <div className="w-full max-w-xl relative" ref={dropdownRef}>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center bg-zinc-800 rounded-xl border border-zinc-700 focus-within:border-zinc-500 transition-colors shadow-xl">
            <Search className="w-5 h-5 text-zinc-400 ml-4 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Paste a YouTube URL to get started..."
              autoFocus
              className="flex-1 bg-transparent px-4 py-4 text-base text-zinc-100 placeholder-zinc-500 outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 mr-2 text-sm font-semibold bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg transition-colors"
            >
              Load
            </button>
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
              {history.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 uppercase tracking-wide">
                    <Clock className="w-3 h-3" /> Recent
                  </div>
                  {history.slice(0, 5).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleDemoClick(id)}
                      className="w-full text-left px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 rounded transition-colors truncate"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
              <div className={`p-2 ${history.length > 0 ? 'border-t border-zinc-700' : ''}`}>
                <div className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 uppercase tracking-wide">
                  <ChevronDown className="w-3 h-3" /> Demo Videos
                </div>
                {DEMO_VIDEOS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleDemoClick(demo.id)}
                    className="w-full text-left px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 rounded transition-colors truncate"
                  >
                    {demo.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

        {/* Feature hints */}
        <div className="mt-10 flex flex-wrap justify-center items-center gap-6 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-zinc-500" />
            Word-level karaoke
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-500">↻</span>
            Loop &amp; shadow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-500">✦</span>
            AI bilingual subtitles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-500">◈</span>
            Cross-device bookshelf
          </span>
        </div>
      </div>

      {/* Curated feeds */}
      <CuratedFeedSection onLoadVideo={onLoadVideo} />

      <div className="h-12" />
    </div>
  );
}
