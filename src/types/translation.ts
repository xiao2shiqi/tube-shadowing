/** A record that this user ran the AI translation on a video themselves. */
export interface TranslationRecord {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  sentenceCount: number;
  /** Unix seconds */
  translatedAt: number;
}
