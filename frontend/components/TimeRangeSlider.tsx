"use client";

import { useState, useRef, useEffect } from "react";
import { timeToSeconds, secondsToTime } from "@/lib/youtube";

interface TimeRangeSliderProps {
  startTime: string;
  endTime: string;
  maxDuration?: number;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export default function TimeRangeSlider({
  startTime,
  endTime,
  maxDuration = 300,
  onStartTimeChange,
  onEndTimeChange,
}: TimeRangeSliderProps) {
  const [activeMarker, setActiveMarker] = useState<'start' | 'end' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startSeconds = timeToSeconds(startTime);
  const endSeconds = timeToSeconds(endTime);

  const handleMarkerClick = (marker: 'start' | 'end', e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setActiveMarker(marker);
  };

  const adjustTime = (delta: number) => {
    if (!activeMarker) return;

    if (activeMarker === 'start') {
      const newTime = Math.max(0, Math.min(startSeconds + delta, endSeconds - 1));
      onStartTimeChange(secondsToTime(newTime));
    } else {
      const newTime = Math.max(startSeconds + 1, Math.min(endSeconds + delta, maxDuration));
      onEndTimeChange(secondsToTime(newTime));
    }
  };

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setActiveMarker(null);
      }
    };

    if (activeMarker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeMarker]);

  const currentTime = activeMarker === 'start' ? startTime : endTime;

  return (
    <div className="relative h-8">
      {/* Toolbar Overlay - Matches slider width */}
      {activeMarker && (
        <div
          ref={overlayRef}
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center z-10"
        >
          <div className="bg-gray-900/95 backdrop-blur-sm text-white py-1.5 px-2 rounded-full shadow-2xl">
            <div className="flex items-center gap-1.5">
              {/* Decrement buttons */}
              <button
                onClick={() => adjustTime(-5)}
                className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
              >
                -5
              </button>
              <button
                onClick={() => adjustTime(-1)}
                className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
              >
                -1
              </button>

              {/* Current timestamp in center */}
              <div className="px-2.5 py-1 bg-blue-600 rounded font-mono text-xs font-semibold min-w-[60px] text-center">
                {currentTime}
              </div>

              {/* Increment buttons */}
              <button
                onClick={() => adjustTime(1)}
                className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
              >
                +1
              </button>
              <button
                onClick={() => adjustTime(5)}
                className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
              >
                +5
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slider - Hidden when overlay is active */}
      <div ref={sliderRef} className={`absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 bg-gray-200 rounded-full ${activeMarker ? 'invisible' : ''}`}>
        {/* Selected Range */}
        <div
          className="absolute h-full bg-blue-500 rounded-full"
          style={{
            left: `${(startSeconds / maxDuration) * 100}%`,
            right: `${100 - (endSeconds / maxDuration) * 100}%`,
          }}
        />

        {/* Start Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{
            left: `${(startSeconds / maxDuration) * 100}%`,
          }}
          onClick={(e) => handleMarkerClick('start', e)}
          onTouchStart={(e) => handleMarkerClick('start', e)}
        >
          <div className="relative">
            <div
              className={`transition-all ${
                activeMarker === 'start'
                  ? 'w-5 h-5 bg-blue-700 scale-110'
                  : 'w-4 h-4 bg-blue-600'
              } border-2 border-white rounded-full shadow-md cursor-pointer hover:scale-110`}
            />
            <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg">
              {startTime}
            </div>
          </div>
        </div>

        {/* End Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 translate-x-1/2"
          style={{
            left: `${(endSeconds / maxDuration) * 100}%`,
          }}
          onClick={(e) => handleMarkerClick('end', e)}
          onTouchStart={(e) => handleMarkerClick('end', e)}
        >
          <div className="relative">
            <div
              className={`transition-all ${
                activeMarker === 'end'
                  ? 'w-5 h-5 bg-blue-700 scale-110'
                  : 'w-4 h-4 bg-blue-600'
              } border-2 border-white rounded-full shadow-md cursor-pointer hover:scale-110`}
            />
            <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg">
              {endTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
