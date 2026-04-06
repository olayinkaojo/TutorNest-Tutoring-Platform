import React, { useState, useEffect } from 'react';
import { X, Monitor, Settings2, BarChart3 } from 'lucide-react';

interface ScreenShareStats {
  resolution: string;
  frameRate: number;
  bandwidth: number;
  duration: number;
  frameCaptured: number;
}

interface ScreenSharePanelProps {
  isSharing: boolean;
  currentSharer?: {
    id: string;
    name: string;
  };
  stats?: ScreenShareStats;
  onResolutionChange: (resolution: string) => void;
  onFrameRateChange: (fps: number) => void;
  onClose: () => void;
}

export default function ScreenSharePanel({
  isSharing,
  currentSharer,
  stats,
  onResolutionChange,
  onFrameRateChange,
  onClose,
}: ScreenSharePanelProps) {
  const [showStats, setShowStats] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(stats?.resolution || '1280x720');
  const [selectedFps, setSelectedFps] = useState(stats?.frameRate || 15);

  const resolutionOptions = [
    { value: '1920x1080', label: '1080p (1920x1080)' },
    { value: '1280x720', label: '720p (1280x720)' },
    { value: '640x480', label: '480p (640x480)' },
    { value: '320x240', label: '240p (320x240)' },
  ];

  const fpsOptions = [
    { value: 30, label: '30 FPS' },
    { value: 24, label: '24 FPS' },
    { value: 15, label: '15 FPS' },
    { value: 10, label: '10 FPS' },
  ];

  const handleResolutionChange = (newResolution: string) => {
    setSelectedResolution(newResolution);
    onResolutionChange(newResolution);
  };

  const handleFpsChange = (newFps: number) => {
    setSelectedFps(newFps);
    onFrameRateChange(newFps);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Screen Sharing</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sharing status */}
      {isSharing && currentSharer && (
        <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <p className="text-sm text-blue-200">
            <span className="font-semibold">{currentSharer.name}</span> is sharing their screen
          </p>
        </div>
      )}

      {!isSharing && currentSharer && (
        <div className="mb-4 p-3 bg-gray-700 border border-gray-600 rounded-lg">
          <p className="text-sm text-gray-300">
            No active screen share
          </p>
        </div>
      )}

      {/* Quality settings */}
      <div className="space-y-4 mb-4">
        {/* Resolution selector */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Resolution
          </label>
          <select
            value={selectedResolution}
            onChange={(e) => handleResolutionChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {resolutionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Higher resolution = better quality but more bandwidth
          </p>
        </div>

        {/* FPS selector */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Frame Rate
          </label>
          <select
            value={selectedFps}
            onChange={(e) => handleFpsChange(parseInt(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {fpsOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Higher FPS = smoother but more bandwidth
          </p>
        </div>
      </div>

      {/* Statistics toggle */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition flex items-center justify-center gap-2 text-sm mb-4"
      >
        <BarChart3 className="w-4 h-4" />
        {showStats ? 'Hide' : 'Show'} Statistics
      </button>

      {/* Statistics display */}
      {showStats && stats && (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Resolution:</span>
            <span className="text-white font-mono">{stats.resolution}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Frame Rate:</span>
            <span className="text-white font-mono">{stats.frameRate} FPS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Bandwidth:</span>
            <span className="text-white font-mono">{stats.bandwidth.toFixed(2)} Mbps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Duration:</span>
            <span className="text-white font-mono">{formatDuration(stats.duration)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Frames Captured:</span>
            <span className="text-white font-mono">{stats.frameCaptured}</span>
          </div>

          {/* Bandwidth indicator */}
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-400">Bandwidth Usage</span>
              <span className="text-xs text-gray-400">{Math.round((stats.bandwidth / 8) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.bandwidth > 5
                    ? 'bg-red-500'
                    : stats.bandwidth > 3
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((stats.bandwidth / 8) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Optimization tips */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
        <p className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Optimization Tips
        </p>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Use 720p for most use cases</li>
          <li>• Reduce FPS on slow networks</li>
          <li>• Close other apps using bandwidth</li>
          <li>• Use wired connection when possible</li>
        </ul>
      </div>
    </div>
  );
}
