import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import VideoConferencingRoom from './VideoConferencingRoom';
import MediaControls from './MediaControls';
import ScreenSharePanel from './ScreenSharePanel';

interface TutoringSessionVideoProps {
  sessionId: string;
  userId: string;
  userName: string;
  role: 'tutor' | 'student';
  onEndSession: () => void;
  onError?: (error: string) => void;
}

interface SessionParticipant {
  id: string;
  name: string;
  isAudio: boolean;
  isVideo: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
  connectedAt?: string;
}

export default function TutoringSessionVideo({
  sessionId,
  userId,
  userName,
  role,
  onEndSession,
  onError,
}: TutoringSessionVideoProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showScreenSharePanel, setShowScreenSharePanel] = useState(false);
  const [screenShareStats, setScreenShareStats] = useState(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize media on mount
  useEffect(() => {
    initializeMedia();
    connectToSession();

    return () => {
      cleanup();
    };
  }, []);

  // Update screen share panel stats periodically
  useEffect(() => {
    if (isScreenSharing) {
      const interval = setInterval(async () => {
        // Fetch screen share stats from API
        try {
          // This would call your backend API to get stats
          // await fetch(`/make-server-cbd74580/screen-share/${screenShareId}/stats`)
          setScreenShareStats({
            resolution: '1280x720',
            frameRate: 15,
            bandwidth: 2.5,
            duration: 120,
            frameCaptured: 1800,
          });
        } catch (err) {
          console.error('Failed to fetch screen share stats:', err);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isScreenSharing]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      localStreamRef.current = stream;

      // Store initial audio/video state
      setIsMuted(false);
      setIsVideoOn(true);
    } catch (err) {
      const errorMsg = 'Failed to initialize media devices';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const connectToSession = async () => {
    setIsConnecting(true);

    try {
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch session participants from API
      // const response = await fetch(`/make-server-cbd74580/video/session/${sessionId}/peers`);
      // const { peers } = await response.json();

      // Mock participants for demo
      const mockParticipants: SessionParticipant[] = [];
      if (role === 'tutor') {
        mockParticipants.push({
          id: 'student-1',
          name: 'Student One',
          isAudio: true,
          isVideo: true,
          isScreenSharing: false,
          connectedAt: new Date().toISOString(),
        });
      } else {
        mockParticipants.push({
          id: 'tutor-1',
          name: 'Tutor Name',
          isAudio: true,
          isVideo: true,
          isScreenSharing: false,
          connectedAt: new Date().toISOString(),
        });
      }

      setParticipants(mockParticipants);
      setIsConnecting(false);
    } catch (err) {
      const errorMsg = 'Failed to connect to session';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsConnecting(false);
    }
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOn;
      });
    }
    setIsVideoOn(!isVideoOn);
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        setIsScreenSharing(false);
        // Call API to stop screen share
        // await fetch(`/make-server-cbd74580/screen-share/${screenShareId}/stop`, { method: 'POST' })
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
        });

        // Replace video track with screen
        const sender = localStreamRef.current?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && screenStream.getVideoTracks()[0]) {
          await sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }

        setIsScreenSharing(true);
        setShowScreenSharePanel(true);

        // Call API to start screen share
        // const response = await fetch(`/make-server-cbd74580/screen-share/start`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        //   body: JSON.stringify({ sessionId, userName, audioIncluded: true })
        // })

        // When screen share ends, revert to camera
        screenStream.getTracks()[0].addEventListener('ended', () => {
          handleStopScreenShare();
        });
      }
    } catch (err) {
      if ((err as any).name !== 'NotAllowedError') {
        console.error('Screen sharing error:', err);
      }
    }
  };

  const handleStopScreenShare = async () => {
    try {
      // Get camera stream again
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      // Replace video track back to camera
      const sender = localStreamRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && cameraStream.getVideoTracks()[0]) {
        await sender.replaceTrack(cameraStream.getVideoTracks()[0]);
      }

      setIsScreenSharing(false);
    } catch (err) {
      console.error('Failed to revert to camera:', err);
    }
  };

  const handleResolutionChange = async (resolution: string) => {
    // Call API to update screen share resolution
    // await fetch(`/make-server-cbd74580/screen-share/${screenShareId}/resolution`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ resolution })
    // })
  };

  const handleFrameRateChange = async (fps: number) => {
    // Call API to update screen share frame rate
    // await fetch(`/make-server-cbd74580/screen-share/${screenShareId}/frame-rate`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ fps })
    // })
  };

  const handleEndCall = async () => {
    cleanup();
    onEndSession();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
  };

  // Loading state
  if (isConnecting) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Connecting to session...</p>
          <p className="text-gray-400 text-sm mt-2">
            Initializing media devices and connecting to {participants.length} participant(s)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col relative">
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-3 flex items-center gap-3 z-50">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main video area */}
      <div className="flex-1 overflow-hidden">
        <VideoConferencingRoom
          sessionId={sessionId}
          userId={userId}
          userName={userName}
          participants={participants}
          onEndCall={handleEndCall}
          onScreenShareStart={handleToggleScreenShare}
          onScreenShareStop={handleStopScreenShare}
        />
      </div>

      {/* Control bar */}
      <MediaControls
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={() => setIsHandRaised(!isHandRaised)}
        onEndCall={handleEndCall}
        onOpenSettings={() => {
          // Open settings modal
        }}
        onOpenChat={() => {
          // Open chat panel
        }}
      />

      {/* Screen share panel - overlay */}
      {showScreenSharePanel && (
        <div className="absolute right-4 bottom-24 z-40">
          <ScreenSharePanel
            isSharing={isScreenSharing}
            currentSharer={{ id: userId, name: userName }}
            stats={screenShareStats}
            onResolutionChange={handleResolutionChange}
            onFrameRateChange={handleFrameRateChange}
            onClose={() => setShowScreenSharePanel(false)}
          />
        </div>
      )}

      {/* Session info */}
      <div className="absolute top-4 left-4 bg-black/50 px-3 py-2 rounded text-white text-sm z-30">
        <p className="font-semibold">
          {role === 'tutor' ? '👨‍🏫' : '👨‍🎓'} {role.charAt(0).toUpperCase() + role.slice(1)}
        </p>
        <p className="text-xs text-gray-300">Session ID: {sessionId.slice(0, 8)}...</p>
      </div>
    </div>
  );
}
