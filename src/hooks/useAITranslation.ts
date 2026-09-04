import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptSentence } from '../types/subtitle';
import type { AISettings, TranslationProgress } from '../types/ai';
import { activeKeyConfig } from '../types/ai';
import { batchTranslateSentences } from '../services/aiTranslationService';
import { setCachedTranscript } from '../services/indexedDbService';
import { pushCloudTranscriptCache } from '../services/transcriptCacheApi';

interface UseAITranslationResult {
  progress: TranslationProgress;
  startTranslation: (
    videoId: string,
    sentences: TranscriptSentence[]
  ) => Promise<void>;
  cancelTranslation: () => void;
  needsTranslation: boolean;
}

export function useAITranslation(
  settings: AISettings,
  onSentencesUpdate: (updater: (prev: TranscriptSentence[]) => TranscriptSentence[]) => void
): UseAITranslationResult {
  const [progress, setProgress] = useState<TranslationProgress>({
    total: 0,
    completed: 0,
    status: 'idle',
  });
  const abortRef = useRef<AbortController | null>(null);

  const cancelTranslation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress((p) => ({ ...p, status: p.completed > 0 ? 'completed' : 'idle' }));
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const startTranslation = useCallback(
    async (videoId: string, sentences: TranscriptSentence[]) => {
      if (!activeKeyConfig(settings).apiKey.trim()) return;

      const pending = sentences.filter((s) => !s.zh);
      if (pending.length === 0) return;

      const controller = new AbortController();
      abortRef.current = controller;

      setProgress({
        total: pending.length,
        completed: 0,
        status: 'translating',
      });

      const resultMap = await batchTranslateSentences(
        sentences,
        settings,
        (completed, total) => {
          setProgress((p) =>
            p.status === 'translating' ? { ...p, completed, total } : p
          );
        },
        (partial) => {
          if (controller.signal.aborted) return;
          onSentencesUpdate((prev) =>
            prev.map((s) =>
              partial.has(s.id) && !s.zh ? { ...s, zh: partial.get(s.id)! } : s
            )
          );
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      onSentencesUpdate((prev) =>
        prev.map((s) =>
          resultMap.has(s.id) ? { ...s, zh: resultMap.get(s.id)! } : s
        )
      );

      const finalSentences = sentences.map((s) =>
        resultMap.has(s.id) ? { ...s, zh: resultMap.get(s.id)! } : s
      );
      await setCachedTranscript(videoId, finalSentences);
      if (resultMap.size > 0) {
        pushCloudTranscriptCache(videoId, finalSentences);
      }

      setProgress((p) => ({
        ...p,
        status: resultMap.size > 0 ? 'completed' : 'error',
        errorMessage:
          resultMap.size === 0 ? '所有批次翻译失败，请检查 API Key 与网络' : undefined,
      }));
      abortRef.current = null;
    },
    [settings, onSentencesUpdate]
  );

  const needsTranslation = activeKeyConfig(settings).apiKey.trim().length > 0;

  return { progress, startTranslation, cancelTranslation, needsTranslation };
}
