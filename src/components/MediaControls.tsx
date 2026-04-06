import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  Share2Off,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Settings,
  MessageSquare,
  Hand,
} from 'lucide-react';

interface MediaControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onEndCall: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  audioLevel?: number;
}

export default function MediaControls({
  isMuted,
  isVideoOn,
  isScreenSharing,
  isHandRaised,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onEndCall,
  onOpenSettings,
  onOpenChat,
  audioLevel = 0,
}: MediaControlsProps) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const moreOptionsRef = useRef<HTMLDivElement>(null);

  const controls = [
    {
      id: 'mute',
      label: isMuted ? 'Unmute' : 'Mute',
      icon: isMuted ? MicOff : Mic,
      isActive: isMuted,
      onClick: onToggleMute,
      color: isMuted ? 'bg-red-500' : 'bg-gray-700',
      hoverColor: isMuted ? 'hover:bg-red-600' : 'hover:bg-gray-600',
    },
    {
      id: 'video',
      label: isVideoOn ? 'Stop Video' : 'Start Video',
      icon: isVideoOn ? Video : VideoOff,
      isActive: !isVideoOn,
      onClick: onToggleVideo,
      color: !isVideoOn ? 'bg-red-500' : 'bg-gray-700',
      hoverColor: !isVideoOn ? 'hover:bg-red-600' : 'hover:bg-gray-600',
    },
    {
      id: 'screen',
      label: isScreenSharing ? 'Stop Sharing' : 'Share Screen',
      icon: isScreenSharing ? Share2Off : Share2,
      isActive: isScreenSharing,
      onClick: onToggleScreenShare,
      color: isScreenSharing ? 'bg-blue-500' : 'bg-gray-700',
      hoverColor: isScreenSharing ? 'hover:bg-blue-600' : 'hover:bg-gray-600',
    },
    {
      id: 'hand',
      label: isHandRaised ? 'Lower Hand' : 'Raise Hand',
      icon: Hand,
      isActive: isHandRaised,
      onClick: onToggleHandRaise,
      color: isHandRaised ? 'bg-yellow-500' : 'bg-gray-700',
      hoverColor: isHandRaised ? 'hover:bg-yellow-600' : 'hover:bg-gray-600',
    },
  ];

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
      <div className="flex items-center justify-center gap-2">
        {/* Primary controls */}
        {controls.map((control) => {
          const Icon = control.icon;
          return (
            <button
              key={control.id}
              onClick={control.onClick}
              className={`p-2 md:p-3 rounded-full transition ${control.color} ${control.hoverColor} text-white relative group`}
              title={control.label}
            >
              <Icon className="w-5 h-5 md:w-6 md:h-6" />

              {/* Audio level indicator for mute button */}
              {control.id === 'mute' && !isMuted && audioLevel > 0 && (
                <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse" />
              )}

              {/* Tooltip */}
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition">
                {control.label}
              </div>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700 mx-2"></div>

        {/* Chat button */}
        <button
          onClick={onOpenChat}
          className="p-2 md:p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition group relative"
          title="Open chat"
        >
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition">
            Chat
          </div>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 md:p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition group relative"
          title="Settings"
        >
          <Settings className="w-5 h-5 md:w-6 md:h-6" />
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition">
            Settings
          </div>
        </button>

        {/* More options dropdown */}
        <div className="relative" ref={moreOptionsRef}>
          <button
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="p-2 md:p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition group relative"
            title="More options"
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.5 1.5H9.5V10.5H.5V11.5H9.5V20.5H10.5V11.5H19.5V10.5H10.5V1.5Z" />
            </svg>
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition">
              More
            </div>
          </button>

          {/* Dropdown menu */}
          {showMoreOptions && (
            <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
              <button className="w-full px-4 py-2 text-left text-white hover:bg-gray-800 transition flex items-center gap-2 whitespace-nowrap">
                <Volume2 className="w-4 h-4" />
                Test Audio
              </button>
              <button className="w-full px-4 py-2 text-left text-white hover:bg-gray-800 transition flex items-center gap-2 whitespace-nowrap">
                <VolumeX className="w-4 h-4" />
                Audio Settings
              </button>
              <button className="w-full px-4 py-2 text-left text-white hover:bg-gray-800 transition flex items-center gap-2 whitespace-nowrap border-t border-gray-700">
                📊 Network Stats
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700 mx-2"></div>

        {/* End call button */}
        <button
          onClick={onEndCall}
          className="p-2 md:p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition group relative"
          title="End call"
        >
          <PhoneOff className="w-5 h-5 md:w-6 md:h-6" />
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition">
            End Call
          </div>
        </button>
      </div>

      {/* Compact mobile view label */}
      <div className="text-center text-xs text-gray-400 mt-2 md:hidden">
        {isMuted && <span className="ml-2">🔇 Muted</span>}
        {!isVideoOn && <span className="ml-2">📷 Camera off</span>}
        {isScreenSharing && <span className="ml-2">🖥️ Sharing</span>}
      </div>
    </div>
  );
}
