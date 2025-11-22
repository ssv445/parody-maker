"use client";

import { useEffect, useRef, useState } from "react";

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
  const [isReady, setIsReady] = useState(false);

  // Keep current values in refs
  const endTimeRef = useRef(endTime);
  const onEndedRef = useRef(onEnded);

  // Update refs when props change
  useEffect(() => {
    endTimeRef.current = endTime;
    onEndedRef.current = onEnded;
  }, [endTime, onEnded]);

  // Load YouTube API and initialize player
  useEffect(() => {
    const loadAPI = async () => {
      if (window.YT && window.YT.Player) return;

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }

      return new Promise<void>((resolve) => {
        const check = () => {
          if (window.YT && window.YT.Player) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    };

    const init = async () => {
      await loadAPI();

      const container = containerRef.current;
      if (!container || playerRef.current) return;

      const div = document.createElement('div');
      container.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        height: '400',
        width: '100%',
        videoId,
        playerVars: {
          start: Math.floor(startTime),
          autoplay: autoplay ? 1 : 0,
          controls: 1,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            if (onReady) onReady();
          },
          onStateChange: (event: any) => {
            // Start monitoring when playing
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (intervalRef.current) clearInterval(intervalRef.current);

              intervalRef.current = setInterval(() => {
                if (!playerRef.current) return;

                const current = playerRef.current.getCurrentTime();
                if (current >= endTimeRef.current) {
                  playerRef.current.pauseVideo();
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  if (onEndedRef.current) onEndedRef.current();
                }
              }, 100);
            } else {
              // Stop monitoring when not playing
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          },
        },
      });
    };

    init();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
      const container = containerRef.current;
      if (container) container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle segment changes
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    // Clear any running interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop current video
    try {
      playerRef.current.pauseVideo();
    } catch (e) {}

    // Load new segment
    setTimeout(() => {
      if (!playerRef.current) return;

      playerRef.current.loadVideoById({
        videoId,
        startSeconds: startTime,
      });

      if (autoplay) {
        setTimeout(() => {
          if (playerRef.current) playerRef.current.playVideo();
        }, 300);
      }
    }, 100);
  }, [videoId, startTime, endTime, autoplay, isReady]);

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
