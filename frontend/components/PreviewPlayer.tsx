"use client";

import { useState, useRef, useEffect } from "react";
import { Segment } from "@/lib/types";
import { timeToSeconds } from "@/lib/youtube";
import VideoPlayer from "./VideoPlayer";

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
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [previewStart, setPreviewStart] = useState<number>(0);
  const [previewEnd, setPreviewEnd] = useState<number>(0);

  const currentSegment = segments[currentSegmentIndex];

  const handleSegmentEnded = () => {
    if (currentSegmentIndex < segments.length - 1) {
      onSegmentChange(currentSegmentIndex + 1);
    } else {
      setAutoplayNext(false);
    }
  };

  const handlePlayAll = () => {
    if (segments.length === 0) return;
    onSegmentChange(0);
    setAutoplayNext(true);
  };

  // Handle preview from SegmentCard
  const handlePreview = (videoId: string, start: number, end: number) => {
    setPreviewVideoId(videoId);
    setPreviewStart(start);
    setPreviewEnd(end);
    setAutoplayNext(false);
  };

  // Expose preview handler to parent
  useEffect(() => {
    // Store in a ref that can be accessed by parent
    (window as any).__previewHandler = handlePreview;
    return () => {
      delete (window as any).__previewHandler;
    };
  }, []);

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

  // Determine what to play: preview or current segment
  const videoId = previewVideoId || currentSegment.videoId;
  const startTime = previewVideoId ? previewStart : timeToSeconds(currentSegment.startTime);
  const endTime = previewVideoId ? previewEnd : timeToSeconds(currentSegment.endTime);

  return (
    <div>
      {/* Video Player */}
      <div className="mb-4">
        <VideoPlayer
          videoId={videoId}
          startTime={startTime}
          endTime={endTime}
          onReady={() => {
            if (!previewVideoId) {
              onSegmentVerified(currentSegmentIndex);
            }
          }}
          onEnded={() => {
            if (previewVideoId) {
              // Preview ended, clear preview state
              setPreviewVideoId(null);
            } else {
              handleSegmentEnded();
            }
          }}
          autoplay={autoplayNext || !!previewVideoId}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Current Segment Info */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {previewVideoId ? (
                <span className="text-blue-600">⏯ Previewing changes...</span>
              ) : (
                currentSegment?.songTitle || `Segment ${currentSegmentIndex + 1}`
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {previewVideoId ? (
                `${Math.floor(previewStart)}s - ${Math.floor(previewEnd)}s`
              ) : (
                `${currentSegment?.startTime} - ${currentSegment?.endTime}`
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {currentSegmentIndex + 1} / {segments.length}
          </div>
        </div>

        {/* Play All Button */}
        <button
          onClick={handlePlayAll}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          ▶ Play All Segments
        </button>

        {/* Segment Navigation */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setPreviewVideoId(null);
              onSegmentChange(Math.max(0, currentSegmentIndex - 1));
            }}
            disabled={currentSegmentIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => {
              setPreviewVideoId(null);
              onSegmentChange(Math.min(segments.length - 1, currentSegmentIndex + 1));
            }}
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
