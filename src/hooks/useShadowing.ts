import { useState, useEffect, useCallback, useRef } from 'react';
import type { YTPlayer } from '../types/player';
import type { TranscriptSentence, SubtitleMode } from '../types/subtitle';

interface UseShadowingReturn {
  isLooping: boolean;
  isAutoPause: boolean;
  activeIndex: number;
  playbackRate: number;
  subtitleMode: SubtitleMode;
  toggleLoop: () => void;
  toggleAutoPause: () => void;
  setPlaybackRate: (rate: number) => void;
  setSubtitleMode: (mode: SubtitleMode) => void;
  seekToSentence: (index: number) => void;
  replayCurrentSentence: () => void;
  goToPrevSentence: () => void;
  goToNextSentence: () => void;
}

export function useShadowing(
  player: YTPlayer | null,
  sentences: TranscriptSentence[],
  currentTime: number,
  onToast: (msg: string) => void
): UseShadowingReturn {
  const [isLooping, setIsLooping] = useState(false);
  const [isAutoPause, setIsAutoPause] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('en');
  const hasPausedRef = useRef(false);
  const lastSentenceIndexRef = useRef(-1);

  const activeIndex = (() => {
    if (!sentences.length) return -1;
    for (let i = 0; i < sentences.length; i++) {
      if (currentTime >= sentences[i].start && currentTime < sentences[i].end) {
        return i;
      }
    }
    return -1;
  })();

  useEffect(() => {
    if (activeIndex !== lastSentenceIndexRef.current) {
      hasPausedRef.current = false;
      lastSentenceIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!player || activeIndex < 0) return;
    const sentence = sentences[activeIndex];

    if (isLooping && currentTime >= sentence.end) {
      player.seekTo(sentence.start, true);
      hasPausedRef.current = false;
    }

    if (isAutoPause && currentTime >= sentence.end - 0.1 && !hasPausedRef.current) {
      player.pauseVideo();
      hasPausedRef.current = true;
    }
  }, [player, sentences, activeIndex, currentTime, isLooping, isAutoPause]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      onToast(next ? 'A-B Loop ON' : 'A-B Loop OFF');
      return next;
    });
  }, [onToast]);

  const toggleAutoPause = useCallback(() => {
    setIsAutoPause((prev) => {
      const next = !prev;
      onToast(next ? 'Auto-pause ON' : 'Auto-pause OFF');
      return next;
    });
  }, [onToast]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const clamped = Math.round(Math.max(0.5, Math.min(2.0, rate)) * 10) / 10;
      setPlaybackRateState(clamped);
      if (player) player.setPlaybackRate(clamped);
      onToast(`Speed: ${clamped.toFixed(1)}x`);
    },
    [player, onToast]
  );

  const seekToSentence = useCallback(
    (index: number) => {
      if (!player || index < 0 || index >= sentences.length) return;
      player.seekTo(sentences[index].start, true);
      player.playVideo();
      hasPausedRef.current = false;
    },
    [player, sentences]
  );

  const replayCurrentSentence = useCallback(() => {
    if (activeIndex >= 0) seekToSentence(activeIndex);
  }, [activeIndex, seekToSentence]);

  const goToPrevSentence = useCallback(() => {
    const target = activeIndex > 0 ? activeIndex - 1 : 0;
    seekToSentence(target);
  }, [activeIndex, seekToSentence]);

  const goToNextSentence = useCallback(() => {
    const target = activeIndex < sentences.length - 1 ? activeIndex + 1 : activeIndex;
    seekToSentence(target);
  }, [activeIndex, sentences.length, seekToSentence]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (player) {
            const state = player.getPlayerState();
            if (state === 1) player.pauseVideo();
            else player.playVideo();
          }
          break;
        case 'KeyA':
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevSentence();
          break;
        case 'KeyD':
        case 'ArrowRight':
          e.preventDefault();
          goToNextSentence();
          break;
        case 'KeyR':
          e.preventDefault();
          replayCurrentSentence();
          break;
        case 'KeyL':
          e.preventDefault();
          toggleLoop();
          break;
        case 'KeyP':
          e.preventDefault();
          toggleAutoPause();
          break;
        case 'BracketLeft':
          e.preventDefault();
          setPlaybackRate(playbackRate - 0.1);
          break;
        case 'BracketRight':
          e.preventDefault();
          setPlaybackRate(playbackRate + 0.1);
          break;
        case 'Digit1':
          e.preventDefault();
          setSubtitleMode('bilingual');
          onToast('Mode: Bilingual');
          break;
        case 'Digit2':
          e.preventDefault();
          setSubtitleMode('en');
          onToast('Mode: English only');
          break;
        case 'Digit3':
          e.preventDefault();
          setSubtitleMode('zh');
          onToast('Mode: 仅中文');
          break;
        case 'Digit4':
          e.preventDefault();
          setSubtitleMode('blurred');
          onToast('Mode: Listening blind box');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    player,
    playbackRate,
    goToPrevSentence,
    goToNextSentence,
    replayCurrentSentence,
    toggleLoop,
    toggleAutoPause,
    setPlaybackRate,
    setSubtitleMode,
    onToast,
  ]);

  return {
    isLooping,
    isAutoPause,
    activeIndex,
    playbackRate,
    subtitleMode,
    toggleLoop,
    toggleAutoPause,
    setPlaybackRate,
    setSubtitleMode,
    seekToSentence,
    replayCurrentSentence,
    goToPrevSentence,
    goToNextSentence,
  };
}
