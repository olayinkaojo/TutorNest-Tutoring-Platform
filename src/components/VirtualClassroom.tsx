import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Video, 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  ExternalLink,
  Shield,
  Flag,
  Mic,
  MicOff,
  MessageSquare,
  MessageSquareOff,
  UserX,
  FileText,
  Share2
} from 'lucide-react';

interface VirtualClassroomProps {
  session: any;
  bookingId: string;
  userRole: 'parent' | 'tutor' | 'student';
  studentName: string;
  tutorName: string;
  startTime: string;
  endTime: string;
}

interface SessionData {
  id: string;
  meetLink: string;
  status: 'scheduled' | 'active' | 'ended';
  startedAt?: string;
  endedAt?: string;
  attendees: {
    userId: string;
    userName: string;
    role: string;
    joinedAt: string;
    leftAt?: string;
    duration?: number;
  }[];
}

export function VirtualClassroom({ 
  session, 
  bookingId, 
  userRole,
  studentName,
  tutorName,
  startTime,
  endTime 
}: VirtualClassroomProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const attendanceInterval = useRef<any>(null);

  useEffect(() => {
    fetchSessionData();
    
    // Update time remaining every second
    const timer = setInterval(() => {
      updateTimeRemaining();
    }, 1000);

    return () => {
      clearInterval(timer);
      if (attendanceInterval.current) {
        clearInterval(attendanceInterval.current);
      }
    };
  }, []);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/classroom/session/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSessionData(data.session);
      } else {
        throw new Error('Failed to load session');
      }
    } catch (err: any) {
      console.error('Error fetching session:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) {
      const diff = start.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        setTimeRemaining(`Starts in ${hours}h ${minutes % 60}m`);
      } else {
        setTimeRemaining(`Starts in ${minutes}m`);
      }
    } else if (now >= start && now <= end) {
      const diff = end.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      setTimeRemaining(`${minutes} minutes remaining`);
    } else {
      setTimeRemaining('Session ended');
    }
  };

  const handleJoinSession = async () => {
    setJoining(true);
    setError('');

    try {
      // Record attendance
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/classroom/session/${bookingId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userName: userRole === 'tutor' ? tutorName : studentName,
            role: userRole,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join session');
      }

      const data = await response.json();
      
      // Open Google Meet in new window
      window.open(data.meetLink, '_blank', 'width=1200,height=800');

      // Start tracking attendance
      startAttendanceTracking();

      // Refresh session data
      await fetchSessionData();
    } catch (err: any) {
      console.error('Error joining session:', err);
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const startAttendanceTracking = () => {
    // Update attendance every 30 seconds while user is in session
    attendanceInterval.current = setInterval(async () => {
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/classroom/session/${bookingId}/ping`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
      } catch (err) {
        console.error('Attendance ping failed:', err);
      }
    }, 30000);
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session for all participants?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/classroom/session/${bookingId}/end`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      if (attendanceInterval.current) {
        clearInterval(attendanceInterval.current);
      }

      await fetchSessionData();
    } catch (err: any) {
      console.error('Error ending session:', err);
      setError(err.message);
    }
  };

  const handleReportIssue = async () => {
    if (!reportReason.trim()) {
      setError('Please describe the issue');
      return;
    }

    setSubmittingReport(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/classroom/session/${bookingId}/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reason: reportReason,
            reportedBy: userRole,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      setShowReportModal(false);
      setReportReason('');
      alert('Report submitted. Our team will review this session.');
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const canJoinSession = () => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Allow joining 5 minutes before and up to 5 minutes after scheduled end
    const joinWindow = 5 * 60 * 1000;
    return now >= new Date(start.getTime() - joinWindow) && 
           now <= new Date(end.getTime() + joinWindow);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Video className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading classroom...</p>
        </CardContent>
      </Card>
    );
  }

  if (!sessionData) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Session not found. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Session Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Virtual Classroom</CardTitle>
              <CardDescription>
                {studentName} with {tutorName}
              </CardDescription>
            </div>
            <Badge 
              variant={sessionData.status === 'active' ? 'default' : 'secondary'}
              style={sessionData.status === 'active' ? { backgroundColor: '#5d9827' } : {}}
            >
              {sessionData.status === 'active' ? 'Live' : 
               sessionData.status === 'ended' ? 'Ended' : 'Scheduled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Scheduled Time</p>
              <p className="font-medium">
                {new Date(startTime).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
                {' - '}
                {new Date(endTime).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="font-medium">{timeRemaining}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Participants</p>
              <p className="font-medium">
                {sessionData.attendees.filter(a => !a.leftAt).length} active
              </p>
            </div>
          </div>

          {/* Join Button */}
          {canJoinSession() && sessionData.status !== 'ended' && (
            <div className="text-center py-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Video className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <h3 className="mb-2">Ready to Join</h3>
              <p className="text-gray-600 mb-4">
                Join via Google Meet for a secure video session
              </p>
              <Button
                onClick={handleJoinSession}
                disabled={joining}
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                {joining ? 'Joining...' : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Join Google Meet Session
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Session Not Available */}
          {!canJoinSession() && sessionData.status !== 'ended' && (
            <Alert className="bg-amber-50 border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Session not yet available.</strong> You can join 5 minutes before the scheduled start time.
              </AlertDescription>
            </Alert>
          )}

          {/* Features Available */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Available Features</p>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-green-600" />
                </div>
                <span>HD Video & Audio</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <span>Live Chat</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-purple-600" />
                </div>
                <span>Screen Sharing</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <span>File Sharing</span>
              </div>
            </div>
          </div>

          {/* Tutor Controls */}
          {userRole === 'tutor' && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Tutor Controls</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReportModal(true)}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
                {sessionData.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEndSession}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    End Session for All
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: Mute, chat controls, and participant removal are available within Google Meet
              </p>
            </div>
          )}

          {/* Attendance Log */}
          {sessionData.attendees.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Attendance</p>
              <div className="space-y-2">
                {sessionData.attendees.map((attendee, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${!attendee.leftAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium">{attendee.userName}</p>
                        <p className="text-xs text-gray-600">
                          {attendee.role.charAt(0).toUpperCase() + attendee.role.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">
                        Joined: {new Date(attendee.joinedAt).toLocaleTimeString('en-GB', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {attendee.duration && (
                        <p className="text-xs text-gray-600">
                          Duration: {formatDuration(attendee.duration)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Safety & Security:</strong> All sessions are secured through Google Meet. Only booked participants
          can join. Sessions are monitored for safety and can be reported if issues arise.
        </AlertDescription>
      </Alert>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Report Issue</CardTitle>
              <CardDescription>
                Report inappropriate behavior or technical issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe the issue
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please provide details about what happened..."
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={4}
                />
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  A snapshot of the session log will be sent to our support team for review.
                  Abuse flags trigger an immediate support workflow.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReportIssue}
                  disabled={submittingReport || !reportReason.trim()}
                  className="flex-1 text-white bg-red-600 hover:bg-red-700"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}