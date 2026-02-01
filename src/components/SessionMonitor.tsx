import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Video, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Flag,
  Users,
  Download,
  Eye
} from 'lucide-react';

interface SessionMonitorProps {
  session: any;
}

interface SessionReport {
  id: string;
  bookingId: string;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  sessionData: {
    tutorName: string;
    studentName: string;
    startTime: string;
    endTime: string;
    attendees: any[];
  };
  resolution?: string;
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedToday: number;
  averageDuration: number;
  reportedSessions: number;
}

export function SessionMonitor({ session }: SessionMonitorProps) {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    completedToday: 0,
    averageDuration: 0,
    reportedSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState<SessionReport | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchMonitoringData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sessions/monitor`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setStats(data.stats || stats);
      }
    } catch (err: any) {
      console.error('Error fetching monitoring data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'reviewed' | 'resolved') => {
    setResolving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sessions/reports/${reportId}/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status,
            resolution,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve report');
      }

      setSelectedReport(null);
      setResolution('');
      await fetchMonitoringData();
    } catch (err: any) {
      console.error('Error resolving report:', err);
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const handleExportLogs = async (reportId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sessions/reports/${reportId}/export`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-report-${reportId}.json`;
      a.click();
    } catch (err: any) {
      console.error('Error exporting logs:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending Review</Badge>;
      case 'reviewed':
        return <Badge variant="secondary">Reviewed</Badge>;
      case 'resolved':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  if (loading && reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Video className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading session data...</p>
        </CardContent>
      </Card>
    );
  }

  if (selectedReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Report Details</CardTitle>
          <CardDescription>Review and resolve this session report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Tutor</p>
                <p className="text-gray-700">{selectedReport.sessionData.tutorName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Student</p>
                <p className="text-gray-700">{selectedReport.sessionData.studentName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Session Time</p>
                <p className="text-gray-700">
                  {formatDate(selectedReport.sessionData.startTime)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Reported By</p>
                <p className="text-gray-700">{selectedReport.reportedBy}</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <p className="text-sm font-medium mb-2 text-red-800">Report Reason</p>
              <p className="text-gray-700">{selectedReport.reason}</p>
            </div>

            {/* Attendance Log */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-3">Attendance Log</p>
              <div className="space-y-2">
                {selectedReport.sessionData.attendees.map((attendee, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <p className="text-sm font-medium">{attendee.userName}</p>
                      <p className="text-xs text-gray-600">{attendee.role}</p>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <p>Joined: {formatDate(attendee.joinedAt)}</p>
                      {attendee.leftAt && <p>Left: {formatDate(attendee.leftAt)}</p>}
                      {attendee.duration && <p>Duration: {attendee.duration}m</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Add notes about the investigation and resolution..."
                className="w-full p-3 border rounded-lg resize-none"
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReport(null);
                setResolution('');
              }}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportLogs(selectedReport.id)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
            <Button
              onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
              disabled={resolving}
              className="flex-1 text-white"
              style={{ backgroundColor: '#5d9827' }}
            >
              {resolving ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          </div>
        </CardContent>
      </Card>
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

      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <h2 className="mt-1">{stats.totalSessions}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Now</p>
                <h2 className="mt-1">{stats.activeSessions}</h2>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <h2 className="mt-1">{stats.completedToday}</h2>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <h2 className="mt-1">{stats.averageDuration}m</h2>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reported</p>
                <h2 className="mt-1">{stats.reportedSessions}</h2>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Flag className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reports</CardTitle>
              <CardDescription>Session reports requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReports.map((report) => (
                    <Card key={report.id} className="bg-red-50 border-red-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">
                              {report.sessionData.tutorName} & {report.sessionData.studentName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(report.sessionData.startTime)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Reported by: {report.reportedBy} • {formatDate(report.reportedAt)}
                            </p>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>

                        <div className="p-3 bg-white rounded-lg mb-3">
                          <p className="text-sm text-gray-700">{report.reason}</p>
                        </div>

                        <Button
                          onClick={() => setSelectedReport(report)}
                          className="w-full text-white"
                          style={{ backgroundColor: '#625d9c' }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review Report
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolved Reports</CardTitle>
              <CardDescription>Reviewed and resolved session reports</CardDescription>
            </CardHeader>
            <CardContent>
              {resolvedReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No resolved reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resolvedReports.map((report) => (
                    <Card key={report.id} className="bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">
                              {report.sessionData.tutorName} & {report.sessionData.studentName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(report.sessionData.startTime)}
                            </p>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>

                        {report.resolution && (
                          <div className="p-3 bg-white rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Resolution:</p>
                            <p className="text-sm text-gray-700">{report.resolution}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Session Monitoring:</strong> All virtual classroom sessions are tracked for attendance
          and can be reported by participants. Abuse flags trigger immediate review.
        </AlertDescription>
      </Alert>
    </div>
  );
}