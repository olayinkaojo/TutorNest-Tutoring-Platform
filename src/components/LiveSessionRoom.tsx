import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Clock, 
  Users,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Share2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface LiveSessionRoomProps {
  bookingId: string;
  session: any;
  userRole: 'tutor' | 'student' | 'parent';
  onSessionEnd?: () => void;
}

export function LiveSessionRoom({
  bookingId,
  session,
  userRole,
  onSessionEnd,
}: LiveSessionRoomProps) {
  const [liveSession, setLiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportIssue, setReportIssue] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    fetchOrStartSession();

    // Update elapsed time every second
    const interval = setInterval(() => {
      if (liveSession?.startedAt && liveSession?.status === 'active') {
        const start = new Date(liveSession.startedAt).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchOrStartSession = async () => {
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession) {
        throw new Error('Please sign in');
      }

      // Check if session already exists
      const checkResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sessions/booking/${bookingId}`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );

      const checkData = await checkResponse.json();

      if (checkData.session && checkData.session.status === 'active') {
        // Join existing session
        await joinSession(checkData.session.id, authSession.access_token);
      } else {
        // Start new session
        await startSession(authSession.access_token);
      }
    } catch (error: any) {
      console.error('Error with session:', error);
      toast.error(error.message || 'Failed to initialize session');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sessions/${bookingId}/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setLiveSession(data.session);
        toast.success('Session started successfully');
      } else {
        throw new Error(data.error || 'Failed to start session');
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast.error(error.message || 'Failed to start session');
    }
  };

  const joinSession = async (sessionId: string, accessToken: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sessions/${sessionId}/join`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setLiveSession(data.session);
        toast.success('Joined session successfully');
      } else {
        throw new Error(data.error || 'Failed to join session');
      }
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast.error(error.message || 'Failed to join session');
    }
  };

  const endSession = async () => {
    if (!liveSession) return;

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sessions/${liveSession.id}/end`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Session ended successfully');
        onSessionEnd?.();
      } else {
        throw new Error(data.error || 'Failed to end session');
      }
    } catch (error: any) {
      console.error('Error ending session:', error);
      toast.error(error.message || 'Failed to end session');
    }
  };

  const reportSessionIssue = async () => {
    if (!liveSession || !reportIssue) {
      toast.error('Please select an issue');
      return;
    }

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sessions/${liveSession.id}/report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            issue: reportIssue,
            description: reportDescription,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Issue reported successfully');
        setShowReportDialog(false);
        setReportIssue('');
        setReportDescription('');
      } else {
        throw new Error(data.error || 'Failed to report issue');
      }
    } catch (error: any) {
      console.error('Error reporting issue:', error);
      toast.error(error.message || 'Failed to report issue');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Initializing session...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Info Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-500">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                LIVE
              </Badge>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg tabular-nums">{formatTime(elapsedTime)}</span>
              </div>

              {liveSession?.attendance && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {Object.values(liveSession.attendance).filter(Boolean).length}/2 present
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report Session Issue</DialogTitle>
                    <DialogDescription>
                      Let us know if you're experiencing any problems
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Issue Type</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={reportIssue}
                        onChange={(e) => setReportIssue(e.target.value)}
                      >
                        <option value="">Select an issue...</option>
                        <option value="audio_problem">Audio Problem</option>
                        <option value="video_problem">Video Problem</option>
                        <option value="connection_issue">Connection Issue</option>
                        <option value="inappropriate_behavior">Inappropriate Behavior</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        placeholder="Provide additional details..."
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button onClick={reportSessionIssue} className="w-full">
                      Submit Report
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Area */}
      <Card>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {/* This would be replaced with actual video integration (e.g., Jitsi, Agora, etc.) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="h-24 w-24 mx-auto mb-4 opacity-50" />
                <p className="text-xl mb-2">Video Call Area</p>
                <p className="text-sm opacity-75">
                  Video Room ID: {liveSession?.videoRoomId}
                </p>
                <p className="text-xs opacity-50 mt-4">
                  Integrate with your preferred video calling service
                  <br />
                  (Jitsi, Agora, Zoom, Google Meet, etc.)
                </p>
              </div>
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant={videoEnabled ? 'default' : 'destructive'}
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className="rounded-full w-14 h-14"
                >
                  {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>

                <Button
                  size="lg"
                  variant={audioEnabled ? 'default' : 'destructive'}
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="rounded-full w-14 h-14"
                >
                  {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>

                {userRole === 'tutor' && (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={endSession}
                    className="rounded-full w-14 h-14"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Status */}
      {liveSession?.attendance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Tutor</span>
                {liveSession.attendance.tutor ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Present
                  </Badge>
                ) : (
                  <Badge variant="secondary">Waiting...</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Student</span>
                {liveSession.attendance.student ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Present
                  </Badge>
                ) : (
                  <Badge variant="secondary">Waiting...</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {userRole !== 'tutor' && (
        <Alert>
          <AlertDescription>
            Only the tutor can end the session. Please wait for the tutor to conclude the lesson.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
