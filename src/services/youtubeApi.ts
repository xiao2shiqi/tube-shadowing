import type { YTPlayer } from '../types/player';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    getPlayerState(): number;
    destroy(): void;
  }
  interface PlayerOptions {
    width?: number | string;
    height?: number | string;
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: PlayerEvents;
  }
  interface PlayerEvents {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  }
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      apiLoaded = true;
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });

  return apiLoadPromise;
}

export function createYouTubePlayer(
  containerId: string,
  videoId: string,
  onReady: (player: YTPlayer) => void,
  onStateChange?: (state: number) => void
): void {
  loadYouTubeAPI().then(() => {
    new window.YT.Player(containerId, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        cc_load_policy: 0,
      },
      events: {
        onReady: (event) => onReady(event.target as YTPlayer),
        onStateChange: (event) => onStateChange?.(event.data),
      },
    });
  });
}
