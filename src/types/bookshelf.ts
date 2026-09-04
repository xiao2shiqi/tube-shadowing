export interface BookshelfItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  sentenceCount: number;
  hasTranslation: boolean;
  lastPlayedTime: number;
  lastSentenceIndex: number;
  progressPercent: number;
  addedAt: number;
  lastStudiedAt: number;
}
