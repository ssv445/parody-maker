"use client";

import { useEffect, useRef, useState } from "react";

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
  const iframeIdRef = useRef<string>(`youtube-player-${Date.now()}`);
  const [isReady, setIsReady] = useState(false);

  // Store refs for callbacks to avoid reinitializing
  const onReadyRef = useRef(onReady);
  const onEndedRef = useRef(onEnded);
  const previousVideoIdRef = useRef<string>(videoId);
  const previousStartTimeRef = useRef<number>(startTime);

  // Keep refs updated
  useEffect(() => {
    onReadyRef.current = onReady;
    onEndedRef.current = onEnded;
  }, [onReady, onEnded]);

  // Initialize player ONCE
  useEffect(() => {
    const loadYouTubeAPI = () => {
      return new Promise<void>((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }

        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

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
      if (playerRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      try {
        await loadYouTubeAPI();

        if (!isMounted || !containerRef.current) return;

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
              if (!isMounted) return;

              setIsReady(true);
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

        previousVideoIdRef.current = videoId;
        previousStartTimeRef.current = startTime;
      } catch (error) {
        console.error('[VideoPlayer] Error initializing player:', error);
      }
    };

    initPlayer();

    return () => {
      isMounted = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          }
        } catch (error) {
          console.warn('[VideoPlayer] Error destroying player:', error);
        }
        playerRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); // ONLY INIT ONCE!

  // Handle videoId changes WITHOUT remounting
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    if (videoId !== previousVideoIdRef.current) {
      console.log('[VideoPlayer] Loading new video:', videoId);
      playerRef.current.loadVideoById({
        videoId: videoId,
        startSeconds: startTime,
      });
      previousVideoIdRef.current = videoId;
      previousStartTimeRef.current = startTime;
    }
  }, [videoId, startTime, isReady]);

  // Handle time changes WITHOUT remounting
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    // Check if we need to seek
    if (videoId === previousVideoIdRef.current) {
      const timeDiff = Math.abs(startTime - previousStartTimeRef.current);

      if (timeDiff > 0.5) {
        console.log('[VideoPlayer] Seeking to:', startTime);
        try {
          const currentTime = playerRef.current.getCurrentTime();

          // Only seek if we're not already near the target time
          if (Math.abs(currentTime - startTime) > 1) {
            playerRef.current.seekTo(startTime, true);
            previousStartTimeRef.current = startTime;
          }
        } catch (error) {
          console.error('[VideoPlayer] Error seeking:', error);
        }
      }
    }
  }, [startTime, endTime, videoId, isReady]);

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
