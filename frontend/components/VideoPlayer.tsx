"use client";

import { useEffect, useRef } from "react";

// Declare YouTube IFrame Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
  onReady?: () => void;
  onEnded?: () => void;
  autoplay?: boolean;
}

export default function VideoPlayer({
  videoId,
  startTime,
  endTime,
  onReady,
  onEnded,
  autoplay = false,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeIdRef = useRef<string>(`youtube-player-${videoId}-${Date.now()}`);
  const isInitializingRef = useRef<boolean>(false);

  // Store callbacks in refs to avoid re-initializing player when they change
  const onReadyRef = useRef(onReady);
  const onEndedRef = useRef(onEnded);

  // Keep refs updated
  useEffect(() => {
    onReadyRef.current = onReady;
    onEndedRef.current = onEnded;
  }, [onReady, onEnded]);

  useEffect(() => {
    // Load YouTube IFrame API
    const loadYouTubeAPI = () => {
      return new Promise<void>((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }

        // Check if script already exists
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        // Wait for API to load
        const checkAPI = () => {
          if (window.YT && window.YT.Player) {
            resolve();
          } else {
            setTimeout(checkAPI, 100);
          }
        };
        checkAPI();
      });
    };

    let isMounted = true;

    const initPlayer = async () => {
      // Prevent double initialization in StrictMode
      if (isInitializingRef.current) return;
      if (playerRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      isInitializingRef.current = true;

      try {
        await loadYouTubeAPI();

        // Check if component was unmounted during async operation
        if (!isMounted || !containerRef.current) {
          isInitializingRef.current = false;
          return;
        }

        // Create a placeholder div for YouTube to replace
        const playerId = iframeIdRef.current;
        const placeholder = document.createElement('div');
        placeholder.id = playerId;
        container.appendChild(placeholder);

        playerRef.current = new window.YT.Player(playerId, {
          height: '400',
          width: '100%',
          videoId: videoId,
          playerVars: {
            start: Math.floor(startTime),
            autoplay: autoplay ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onReady: (event: any) => {
              console.log('[VideoPlayer] Player ready');
              if (!isMounted) return;

              event.target.seekTo(startTime, true);
              if (onReadyRef.current) onReadyRef.current();

              if (autoplay) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;

              // Monitor playback to stop at endTime
              if (event.data === window.YT.PlayerState.PLAYING) {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }

                intervalRef.current = setInterval(() => {
                  if (!isMounted) {
                    if (intervalRef.current) {
                      clearInterval(intervalRef.current);
                    }
                    return;
                  }

                  const currentTime = event.target.getCurrentTime();
                  if (currentTime >= endTime) {
                    event.target.pauseVideo();
                    if (intervalRef.current) {
                      clearInterval(intervalRef.current);
                    }
                    if (onEndedRef.current) onEndedRef.current();
                  }
                }, 100);
              } else if (event.data === window.YT.PlayerState.PAUSED ||
                         event.data === window.YT.PlayerState.ENDED) {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
              }
            },
          },
        });
      } catch (error) {
        console.error('[VideoPlayer] Error initializing player:', error);
        isInitializingRef.current = false;
      }
    };

    initPlayer();

    return () => {
      isMounted = false;

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Safely destroy player
      if (playerRef.current) {
        try {
          // Check if destroy method exists and player is valid
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          }
        } catch (error) {
          console.warn('[VideoPlayer] Error destroying player:', error);
        }
        playerRef.current = null;
      }

      // Reset initialization flag
      isInitializingRef.current = false;

      // Clean up container innerHTML as fallback
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [videoId, startTime, endTime, autoplay]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: '16/9',
        maxHeight: '400px',
        backgroundColor: '#000'
      }}
    />
  );
}
