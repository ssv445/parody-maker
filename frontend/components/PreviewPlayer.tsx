"use client";

import { useEffect, useRef, useState } from "react";
import { Segment } from "@/lib/types";
import { timeToSeconds } from "@/lib/youtube";

// We'll use YouTube IFrame API instead of Video.js for simpler implementation
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PreviewPlayerProps {
  segments: Segment[];
  currentSegmentIndex: number;
  onSegmentChange: (index: number) => void;
  onSegmentVerified: (index: number) => void;
}

export default function PreviewPlayer({
  segments,
  currentSegmentIndex,
  onSegmentChange,
  onSegmentVerified,
}: PreviewPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSegment = segments[currentSegmentIndex];

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      setIsReady(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true);
    };
  }, []);

  // Initialize player when API is ready and we have segments
  useEffect(() => {
    if (isReady && currentSegment) {
      initPlayer();
    }
  }, [isReady, currentSegmentIndex, segments.length]);

  const initPlayer = () => {
    if (!window.YT || !window.YT.Player) return;
    if (!containerRef.current || !currentSegment) return;

    // Destroy existing player
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.log('Error destroying player:', e);
      }
    }

    // Clear the container
    const container = document.getElementById("youtube-player");
    if (container) {
      container.innerHTML = '';
    }

    // Create new player
    try {
      playerRef.current = new window.YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: currentSegment.videoId,
        playerVars: {
          start: timeToSeconds(currentSegment.startTime),
          end: timeToSeconds(currentSegment.endTime),
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    } catch (e) {
      console.error('Error creating YouTube player:', e);
    }
  };

  const onPlayerReady = () => {
    console.log('YouTube player ready');
    // Mark segment as verified once loaded
    if (currentSegment) {
      onSegmentVerified(currentSegmentIndex);
    }
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      startTimeTracking();
    } else if (
      event.data === window.YT.PlayerState.PAUSED ||
      event.data === window.YT.PlayerState.ENDED
    ) {
      setIsPlaying(false);
      stopTimeTracking();

      // Auto-advance to next segment when current one ends
      if (event.data === window.YT.PlayerState.ENDED && currentSegmentIndex < segments.length - 1) {
        setTimeout(() => {
          onSegmentChange(currentSegmentIndex + 1);
        }, 500);
      }
    }
  };

  const startTimeTracking = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);

        // Check if we've reached the end time
        if (currentSegment) {
          const endTime = timeToSeconds(currentSegment.endTime);
          if (time >= endTime) {
            playerRef.current.pauseVideo();
            // Auto-advance to next segment
            if (currentSegmentIndex < segments.length - 1) {
              setTimeout(() => {
                onSegmentChange(currentSegmentIndex + 1);
              }, 500);
            }
          }
        }
      }
    }, 100);
  };

  const stopTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Note: Segment changes are now handled by the initPlayer useEffect above

  // Cleanup
  useEffect(() => {
    return () => {
      stopTimeTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handlePlayAll = () => {
    if (segments.length === 0) return;

    onSegmentChange(0);
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    }, 500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (segments.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: "400px" }}>
        <div className="text-center text-gray-500">
          <svg
            className="w-20 h-20 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Add segments to preview your parody song</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Player Container */}
      <div ref={containerRef} className="bg-black rounded-lg overflow-hidden mb-4" style={{ height: "400px" }}>
        <div id="youtube-player" style={{ width: "100%", height: "100%" }}></div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Current Segment Info */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Segment {currentSegmentIndex + 1} of {segments.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentSegment?.startTime} - {currentSegment?.endTime}
            </div>
          </div>
          <button
            onClick={handlePlayPause}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Play All Button */}
        <button
          onClick={handlePlayAll}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          ▶ Play All Segments
        </button>

        {/* Segment Navigation */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSegmentChange(Math.max(0, currentSegmentIndex - 1))}
            disabled={currentSegmentIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <div className="flex items-center justify-center text-sm font-medium text-gray-700">
            {currentSegmentIndex + 1} / {segments.length}
          </div>
          <button
            onClick={() => onSegmentChange(Math.min(segments.length - 1, currentSegmentIndex + 1))}
            disabled={currentSegmentIndex === segments.length - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
