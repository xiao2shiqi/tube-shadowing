import type { TranscriptSentence } from '../types/subtitle';

export async function fetchCloudTranscriptCache(
  videoId: string
): Promise<TranscriptSentence[] | null> {
  try {
    const res = await fetch(`/api/transcript-cache?v=${encodeURIComponent(videoId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.sentences) || data.sentences.length === 0) return null;
    return data.sentences as TranscriptSentence[];
  } catch {
    return null;
  }
}

export function pushCloudTranscriptCache(
  videoId: string,
  sentences: TranscriptSentence[]
): void {
  if (!sentences.some((s) => s.zh)) return;
  fetch('/api/transcript-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, sentences }),
  }).catch(() => {
    // Best-effort upload; local IndexedDB cache remains the source of truth on failure
  });
}
