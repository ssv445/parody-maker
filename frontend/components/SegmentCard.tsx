"use client";

import { useState, useEffect, useRef } from "react";
import { Segment } from "@/lib/types";
import { timeToSeconds, secondsToTime } from "@/lib/youtube";

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
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showEndDropdown, setShowEndDropdown] = useState(false);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const endDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalStartTime(segment.startTime);
    setLocalEndTime(segment.endTime);
    setSongTitle(segment.songTitle);
  }, [segment]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startDropdownRef.current && !startDropdownRef.current.contains(event.target as Node)) {
        setShowStartDropdown(false);
      }
      if (endDropdownRef.current && !endDropdownRef.current.contains(event.target as Node)) {
        setShowEndDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced update with smart preview
  const handleStartTimeChange = (value: string) => {
    setLocalStartTime(value);

    setTimeout(() => {
      const newSegment = { ...segment, startTime: value };
      onUpdate(newSegment);

      if (onPreview) {
        const startSeconds = timeToSeconds(value);
        onPreview(segment.videoId, startSeconds, startSeconds + 5);
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
        if (delta < 0) {
          onPreview(segment.videoId, newSeconds, currentSeconds);
        } else {
          onPreview(segment.videoId, currentSeconds, newSeconds);
        }
      }
      setShowStartDropdown(false);
    } else {
      const currentSeconds = timeToSeconds(localEndTime);
      const newSeconds = currentSeconds + delta;
      const newTime = secondsToTime(newSeconds);
      setLocalEndTime(newTime);

      const newSegment = { ...segment, endTime: newTime };
      onUpdate(newSegment);

      if (onPreview) {
        if (delta < 0) {
          onPreview(segment.videoId, newSeconds, currentSeconds);
        } else {
          onPreview(segment.videoId, currentSeconds, newSeconds);
        }
      }
      setShowEndDropdown(false);
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
        } p-3 cursor-pointer hover:shadow-sm min-w-[280px]`}
        onClick={onClick}
      >
        {/* Header Row */}
        <div className="flex items-start gap-2 mb-3">
          {/* Arrow Buttons */}
          <div className="flex flex-col gap-0 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={isFirst}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              title="Move up"
            >
              ↑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={isLast}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              title="Move down"
            >
              ↓
            </button>
          </div>

          {/* Thumbnail & Title Column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <img
                src={segment.thumbnail}
                alt={songTitle}
                className="w-16 h-10 object-cover rounded flex-shrink-0"
              />
              <input
                type="text"
                value={songTitle}
                onChange={(e) => handleSongTitleChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-xs font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                placeholder="Song title..."
              />
            </div>
            <div className="text-xs text-gray-500">
              Duration: {formatDuration(duration)}
              {segment.verified && (
                <span className="ml-2 text-green-600">✓</span>
              )}
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-red-100 rounded text-red-600 transition-colors"
            title="Delete segment"
          >
            ×
          </button>
        </div>

        {/* Time Controls */}
        <div className="space-y-2">
          {/* Start Time Row */}
          <div className="flex items-center gap-1">
            <span className="text-sm" title="Start time">⏮</span>
            <input
              type="text"
              value={localStartTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="00:00:00"
              className="w-16 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex flex-col">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  incrementTime('start');
                }}
                className="w-5 h-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-t flex items-center justify-center"
                title="+1s"
              >
                ▲
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  decrementTime('start');
                }}
                className="w-5 h-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-b flex items-center justify-center"
                title="-1s"
              >
                ▼
              </button>
            </div>

            {/* Start Extend Dropdown */}
            <div className="relative" ref={startDropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStartDropdown(!showStartDropdown);
                }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                title="Extend start"
              >
                ⏪
              </button>
              {showStartDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[80px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('start', -5);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    -5s
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('start', -10);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    -10s
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('start', -15);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    -15s
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('start', -30);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    -30s
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* End Time Row */}
          <div className="flex items-center gap-1">
            <span className="text-sm" title="End time">⏭</span>
            <input
              type="text"
              value={localEndTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="00:01:00"
              className="w-16 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex flex-col">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  incrementTime('end');
                }}
                className="w-5 h-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-t flex items-center justify-center"
                title="+1s"
              >
                ▲
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  decrementTime('end');
                }}
                className="w-5 h-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-b flex items-center justify-center"
                title="-1s"
              >
                ▼
              </button>
            </div>

            {/* End Extend Dropdown */}
            <div className="relative" ref={endDropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEndDropdown(!showEndDropdown);
                }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                title="Extend end"
              >
                ⏩
              </button>
              {showEndDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[80px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('end', 5);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    +5s
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('end', 10);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    +10s
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('end', 15);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    +15s
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustTime('end', 30);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    +30s
                  </button>
                </div>
              )}
            </div>
          </div>
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
              "{songTitle}" will be permanently removed.
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
