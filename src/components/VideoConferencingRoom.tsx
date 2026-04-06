import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Share2, Share2Off, Volume2, Users, X } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isAudio: boolean;
  isVideo: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

interface VideoConferencingRoomProps {
  sessionId: string;
  userId: string;
  userName: string;
  participants: Participant[];
  onEndCall: () => void;
  onScreenShareStart: () => void;
  onScreenShareStop: () => void;
}

export default function VideoConferencingRoom({
  sessionId,
  userId,
  userName,
  participants,
  onEndCall,
  onScreenShareStart,
  onScreenShareStop,
}: VideoConferencingRoomProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'spotlight'>('gallery');
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<HTMLDivElement>(null);

  // Get current screen share if active
  const screenShareParticipant = participants.find((p) => p.isScreenSharing);
  const nonSharingParticipants = participants.filter((p) => !p.isScreenSharing);

  // When screen sharing active, switch to spotlight view
  useEffect(() => {
    if (screenShareParticipant && viewMode === 'gallery') {
      setViewMode('spotlight');
      setSpotlightUserId(screenShareParticipant.id);
    }
  }, [screenShareParticipant]);

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      onScreenShareStop();
    } else {
      setIsScreenSharing(true);
      onScreenShareStart();
    }
  };

  const handleEndCall = () => {
    onEndCall();
  };

  // Gallery view - grid of all participants
  const galleryView = (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-full p-2">
      {/* Self view */}
      <div className="bg-gray-800 rounded-lg overflow-hidden relative group">
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 h-full flex items-center justify-center">
          <div className="text-center">
            {isVideoOn ? (
              <div className="w-20 h-20 bg-blue-400 rounded-full mx-auto mb-2"></div>
            ) : (
              <Video className="w-12 h-12 mx-auto text-white" />
            )}
            <p className="text-white text-sm font-semibold">{userName} (You)</p>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
          {isMuted ? <MicOff className="w-3 h-3 inline" /> : <Mic className="w-3 h-3 inline" />}
        </div>
      </div>

      {/* Other participants */}
      {nonSharingParticipants.map((participant) => (
        <div
          key={participant.id}
          className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
          onClick={() => {
            setViewMode('spotlight');
            setSpotlightUserId(participant.id);
          }}
        >
          <div className="bg-gradient-to-b from-purple-500 to-purple-600 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-400 rounded-full mx-auto mb-2"></div>
              <p className="text-white text-sm font-semibold">{participant.name}</p>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white space-x-1">
            {participant.isAudio === false && <MicOff className="w-3 h-3 inline" />}
            {participant.isVideo === false && <VideoOff className="w-3 h-3 inline" />}
          </div>
        </div>
      ))}
    </div>
  );

  // Spotlight view - large video + thumbnails
  const spotlightParticipant =
    spotlightUserId === userId
      ? { id: userId, name: userName, isAudio: !isMuted, isVideo: isVideoOn }
      : participants.find((p) => p.id === spotlightUserId) || nonSharingParticipants[0];

  const spotlightView = (
    <div className="h-full flex flex-col">
      {/* Main spotlight */}
      <div className="flex-1 bg-gray-900 rounded-lg m-2 flex items-center justify-center relative overflow-hidden">
        {screenShareParticipant ? (
          // Screen share takes precedence
          <div
            ref={screenShareRef}
            className="w-full h-full bg-gray-800 flex items-center justify-center"
          >
            <div className="text-center text-white">
              <Share2 className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <p className="text-lg font-semibold">{screenShareParticipant.name}</p>
              <p className="text-sm text-gray-400">is sharing their screen</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-4"></div>
            <p className="text-white text-xl font-semibold">{spotlightParticipant?.name}</p>
            <p className="text-gray-400 text-sm">
              {spotlightParticipant?.isAudio === false ? 'Muted' : 'Speaking'}
            </p>
          </div>
        )}

        {/* Participant info overlay */}
        <div className="absolute top-4 left-4 bg-black/50 px-3 py-2 rounded-lg text-white">
          <p className="font-semibold">{spotlightParticipant?.name}</p>
          <div className="flex gap-2 text-xs mt-1">
            {spotlightParticipant?.isAudio === false && <span className="flex items-center gap-1">
              <MicOff className="w-3 h-3" />
              Muted
            </span>}
            {spotlightParticipant?.isVideo === false && <span className="flex items-center gap-1">
              <VideoOff className="w-3 h-3" />
              No Video
            </span>}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="h-24 bg-gray-900 border-t border-gray-700 p-2 overflow-x-auto">
        <div className="flex gap-2">
          {/* Self thumbnail */}
          <div
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer transition ${
              spotlightUserId === userId ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-gray-600'
            }`}
            onClick={() => setSpotlightUserId(userId)}
          >
            <div className="bg-gradient-to-b from-blue-500 to-blue-600 h-full flex items-center justify-center">
              <p className="text-white text-xs font-semibold text-center px-1">{userName}</p>
            </div>
          </div>

          {/* Other participant thumbnails */}
          {nonSharingParticipants.map((participant) => (
            <div
              key={participant.id}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer transition bg-gray-800 flex items-center justify-center ${
                spotlightUserId === participant.id ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-gray-600'
              }`}
              onClick={() => setSpotlightUserId(participant.id)}
            >
              <p className="text-white text-xs font-semibold text-center px-1">{participant.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col">
      {/* Video area */}
      <div ref={videoRef} className="flex-1 overflow-hidden">
        {viewMode === 'gallery' ? galleryView : spotlightView}
      </div>

      {/* Control bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Participant info */}
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">
              {participants.length + 1} participants {screenShareParticipant && '• Screen sharing'}
            </span>
          </div>

          {/* Center: Main controls */}
          <div className="flex gap-3">
            {/* Mute button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full transition ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Camera button */}
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-3 rounded-full transition ${
                !isVideoOn
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isVideoOn ? 'Stop video' : 'Start video'}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen share button */}
            <button
              onClick={handleScreenShare}
              className={`p-3 rounded-full transition ${
                isScreenSharing
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <Share2Off className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </button>

            {/* Volume button */}
            <button
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition"
              title="Volume"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* End call button */}
            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
              title="End call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Right: View mode toggle */}
          <div className="flex gap-2 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-3 py-1 rounded text-sm transition ${
                viewMode === 'gallery'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setViewMode('spotlight')}
              className={`px-3 py-1 rounded text-sm transition ${
                viewMode === 'spotlight'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Spotlight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
