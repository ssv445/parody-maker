"use client";

import { useState, useEffect, useRef } from "react";
import { Segment } from "@/lib/types";
import { timeToSeconds, secondsToTime } from "@/lib/youtube";
import TimeRangeSlider from "./TimeRangeSlider";

interface SegmentCardProps {
  segment: Segment;
  index: number;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (segment: Segment) => void;
  onDelete: () => void;
  onClick: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onPreview?: (videoId: string, start: number, end: number) => void;
}

export default function SegmentCard({
  segment,
  index,
  isActive,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onClick,
  onMoveUp,
  onMoveDown,
  onPreview,
}: SegmentCardProps) {
  const [localStartTime, setLocalStartTime] = useState(segment.startTime);
  const [localEndTime, setLocalEndTime] = useState(segment.endTime);
  const [songTitle, setSongTitle] = useState(segment.songTitle);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setLocalStartTime(segment.startTime);
    setLocalEndTime(segment.endTime);
    setSongTitle(segment.songTitle);
  }, [segment]);

  // Debounced update with smart preview
  const handleStartTimeChange = (value: string) => {
    setLocalStartTime(value);

    setTimeout(() => {
      const newSegment = { ...segment, startTime: value };
      onUpdate(newSegment);

      if (onPreview) {
        const startSeconds = timeToSeconds(value);
        // Play from the new start time
        onPreview(segment.videoId, startSeconds, startSeconds + 10);
      }
    }, 500);
  };

  const handleEndTimeChange = (value: string) => {
    setLocalEndTime(value);

    setTimeout(() => {
      const newSegment = { ...segment, endTime: value };
      onUpdate(newSegment);

      if (onPreview) {
        const endSeconds = timeToSeconds(value);
        const previewStart = Math.max(0, endSeconds - 5);
        // Play 5 seconds before the end time
        onPreview(segment.videoId, previewStart, endSeconds);
      }
    }, 500);
  };

  const handleSongTitleChange = (value: string) => {
    setSongTitle(value);
    setTimeout(() => {
      onUpdate({ ...segment, songTitle: value });
    }, 500);
  };

  const adjustTime = (type: 'start' | 'end', delta: number) => {
    if (type === 'start') {
      const currentSeconds = timeToSeconds(localStartTime);
      const newSeconds = Math.max(0, currentSeconds + delta);
      const newTime = secondsToTime(newSeconds);
      setLocalStartTime(newTime);

      const newSegment = { ...segment, startTime: newTime };
      onUpdate(newSegment);

      if (onPreview) {
        // Play from the new start time
        onPreview(segment.videoId, newSeconds, newSeconds + 10);
      }
    } else {
      const currentSeconds = timeToSeconds(localEndTime);
      const newSeconds = currentSeconds + delta;
      const newTime = secondsToTime(newSeconds);
      setLocalEndTime(newTime);

      const newSegment = { ...segment, endTime: newTime };
      onUpdate(newSegment);

      if (onPreview) {
        // Play 5 seconds before the end time
        const previewStart = Math.max(0, newSeconds - 5);
        onPreview(segment.videoId, previewStart, newSeconds);
      }
    }
  };

  const incrementTime = (type: 'start' | 'end') => adjustTime(type, 1);
  const decrementTime = (type: 'start' | 'end') => adjustTime(type, -1);

  const duration = timeToSeconds(localEndTime) - timeToSeconds(localStartTime);
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const hasErrors = segment.validationErrors && segment.validationErrors.length > 0;

  return (
    <>
      <div
        className={`bg-white rounded-lg border-2 transition-all ${
          isActive
            ? "border-blue-400 shadow-md"
            : hasErrors
            ? "border-red-300"
            : "border-gray-200"
        } p-3 cursor-pointer hover:shadow-sm w-full md:min-w-[380px] md:w-auto`}
        onClick={onClick}
      >
        {/* Header Row - Simplified */}
        <div className="flex items-center gap-2 mb-3">
          {/* Navigation Arrows */}
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={isFirst}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              title="Move left"
            >
              &lt;
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={isLast}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              title="Move right"
            >
              &gt;
            </button>
          </div>

          {/* Thumbnail & Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src={segment.thumbnail}
              alt={songTitle}
              className="w-14 h-10 object-cover rounded flex-shrink-0"
            />
            <div className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
              {songTitle}
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="w-6 h-6 flex items-center justify-center hover:bg-red-100 rounded text-red-600 text-xl flex-shrink-0"
            title="Delete"
          >
            ×
          </button>
        </div>

        {/* Time Range Slider Component */}
        <div className="p-4">
          <TimeRangeSlider
            startTime={localStartTime}
            endTime={localEndTime}
            maxDuration={300}
            onStartTimeChange={handleStartTimeChange}
            onEndTimeChange={handleEndTimeChange}
          />
        </div>

        {/* Validation Errors */}
        {hasErrors && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            {segment.validationErrors.map((error, i) => (
              <div key={i} className="text-xs text-red-700">
                • {error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-2">Delete Segment?</h3>
            <p className="text-sm text-gray-600 mb-4">
              &quot;{songTitle}&quot; will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete();
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
