"use client";

import { useEffect, useRef } from "react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Check if player is already initialized
    if (playerRef.current) return;

    // Dynamically import Video.js and YouTube plugin
    let player: any;

    const initPlayer = async () => {
      try {
        // Import Video.js CSS
        await import("video.js/dist/video-js.css");

        // Import Video.js
        const videojsModule = await import("video.js");
        const videojs = videojsModule.default;

        // Import YouTube plugin
        await import("videojs-youtube");

        // Check again if video element has already been initialized
        const videoElement = videoRef.current!;
        if (videoElement.hasAttribute('data-vjs-player')) {
          console.log("Player already initialized, skipping");
          return;
        }

        // Initialize player
        player = videojs(videoElement, {
          techOrder: ["youtube"],
          controls: true,
          fluid: true,
          youtube: {
            ytControls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
        });

        playerRef.current = player;

        // Set source
        player.src({
          type: "video/youtube",
          src: `https://www.youtube.com/watch?v=${videoId}`,
        });

        // Wait for player to be ready
        player.ready(() => {
          console.log("Player ready");

          // Seek to start time
          player.currentTime(startTime);

          if (onReady) {
            onReady();
          }

          if (autoplay) {
            player.play().catch((e: any) => {
              console.log("Autoplay prevented:", e);
            });
          }
        });

        // Monitor time and trigger onEnded when reaching endTime
        const checkTime = () => {
          if (player && !player.paused()) {
            const currentTime = player.currentTime();
            if (currentTime >= endTime) {
              player.pause();
              if (onEnded) {
                onEnded();
              }
            }
          }
        };

        const intervalId = setInterval(checkTime, 100);

        // Cleanup
        return () => {
          clearInterval(intervalId);
          if (player && !player.isDisposed()) {
            player.dispose();
          }
        };
      } catch (error) {
        console.error("Error initializing Video.js player:", error);
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
      }
    };
  }, [videoId, startTime, endTime, onReady, onEnded, autoplay]);

  return (
    <div data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered"
        style={{ width: "100%", height: "400px" }}
      />
    </div>
  );
}
