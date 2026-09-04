import { useState, useRef, useEffect, useCallback } from 'react';
import type { YTPlayer } from '../types/player';
import { createYouTubePlayer } from '../services/youtubeApi';
import { setPlayerTime } from '../services/timeStore';

interface UseYouTubePlayerReturn {
  player: YTPlayer | null;
  currentTime: number;
  isPlaying: boolean;
  loadVideo: (videoId: string) => void;
}

export function useYouTubePlayer(
  containerId: string
): UseYouTubePlayerReturn {
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<number | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let lastStateTime = -1;
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime();
          // 30ms high-frequency clock for word-level karaoke
          setPlayerTime(t);
          // ~100ms granularity React state to keep the list re-renders cheap
          if (Math.abs(t - lastStateTime) >= 0.09) {
            lastStateTime = t;
            setCurrentTime(t);
          }
          const state = playerRef.current.getPlayerState();
          setIsPlaying(state === 1);
        } catch {
          // player may be destroyed
        }
      }
    }, 30);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const loadVideo = useCallback(
    (videoId: string) => {
      stopPolling();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
        setPlayer(null);
      }

      const container = document.getElementById(containerId);
      if (container) container.innerHTML = '';

      createYouTubePlayer(
        containerId,
        videoId,
        (p) => {
          playerRef.current = p;
          setPlayer(p);
          startPolling();
        },
        (state) => {
          setIsPlaying(state === 1);
        }
      );
    },
    [containerId, startPolling, stopPolling]
  );

  useEffect(() => {
    return () => {
      stopPolling();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [stopPolling]);

  return { player, currentTime, isPlaying, loadVideo };
}
