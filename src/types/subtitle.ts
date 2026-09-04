export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSentence {
  id: number;
  start: number;
  end: number;
  en: string;
  zh: string;
  words?: WordTiming[];
}

export type SubtitleMode = 'bilingual' | 'en' | 'zh' | 'blurred';
