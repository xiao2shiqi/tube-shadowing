import type { TranscriptSentence } from '../types/subtitle';

export interface TranscriptResult {
  title: string;
  duration: number;
  sentences: TranscriptSentence[];
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const res = await fetch(`/api/transcript?v=${encodeURIComponent(videoId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch transcript');
  }
  const data = await res.json();
  return {
    title: data.title || videoId,
    duration: data.duration || 0,
    sentences: data.sentences,
  };
}

export function parseVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Plain 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    // youtube.com/watch?v=ID
    if (url.searchParams.has('v')) return url.searchParams.get('v');
    // youtu.be/ID
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    // youtube.com/embed/ID
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // youtube.com/shorts/ID
    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
  } catch {
    return null;
  }
  return null;
}
