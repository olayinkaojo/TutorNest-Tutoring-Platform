import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  FileText,
  Eye,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Target,
  Award,
  BookOpen,
  MessageSquare,
  User,
  Download,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { useRealtimeReports, WebSocketEvents } from '../hooks/useWebSocket';
import { studentAPI } from '../utils/student-api-client';
import { useRealtimeStudentReports } from '../hooks/useRealtimeNotifications';

interface SessionReport {
  id: string;
  sessionId: string;
  tutorId: string;
  tutorName?: string;
  studentId: string;
  studentName: string;
  subject: string;
  date: string;
  duration: number;
  topicsCovered: string;
  studentPerformance: string;
  strengths: string;
  areasForImprovement: string;
  homeworkAssigned: string;
  nextSessionPlan: string;
  behaviorNotes: string;
  overallRating: number;
  progressStatus: 'excellent' | 'good' | 'satisfactory' | 'needs-attention';
  attendance: 'present' | 'late' | 'absent';
  engagement: number;
  comprehension: number;
  participation: number;
  createdAt: string;
  updatedAt: string;
}

interface SessionReportsViewerProps {
  userId: string;
  accessToken: string;
  viewType: 'student' | 'parent' | 'admin';
  studentId?: string; // For parent view, to filter by specific child
  children?: any[]; // For parent view, list of children
}

export function SessionReportsViewer({ 
  userId, 
  accessToken, 
  viewType,
  studentId: initialStudentId,
  children = []
}: SessionReportsViewerProps) {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<SessionReport | null>(null);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTutor, setFilterTutor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(initialStudentId || 'all');
  // Subjects from paid bookings (superset of report subjects)
  const [bookedSubjects, setBookedSubjects] = useState<string[]>([]);

  // Load subjects from paid bookings so the filter shows all subjects, not just ones with reports
  useEffect(() => {
    if (viewType !== 'student' && viewType !== 'parent') return;
    const fetchBookedSubjects = async () => {
      try {
        // For parent view: fetch bookings for each child, then union all subjects
        if (viewType === 'parent' && children.length > 0) {
          const perChildResults = await Promise.all(
            children.map((child: any) =>
              fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings?studentId=${child.id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
              ).then(r => r.ok ? r.json() : { bookings: [] }).catch(() => ({ bookings: [] }))
            )
          );
          const subjects = Array.from(new Set(
            perChildResults.flatMap((d: any) => (d.bookings || []).map((b: any) => b.subject).filter(Boolean))
          )) as string[];
          setBookedSubjects(subjects);
          return;
        }
        // Student view: own bookings
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const subjects = Array.from(new Set(
          (data.bookings || []).map((b: any) => b.subject).filter(Boolean)
        )) as string[];
        setBookedSubjects(subjects);
      } catch (_) {}
    };
    fetchBookedSubjects();
  }, [viewType, accessToken, children.length]);

  // Real-time updates via WebSocket
  const handleRealtimeUpdate = (type: string, data: unknown) => {
    if (type === WebSocketEvents.REPORT_SUBMITTED || type === WebSocketEvents.REPORT_UPDATED) {
      // Refresh reports when new report is submitted
      fetchReports();
    }
  };

  const { isConnected } = useRealtimeReports(userId, accessToken, handleRealtimeUpdate);

  // Real-time notifications for student reports (if viewing as student)
  const { notifications: realtimeNotifications } = useRealtimeStudentReports(
    viewType === 'student' ? userId : '',
    accessToken,
    viewType === 'student',
    (reportId, title) => {
      console.log(`📬 New report notification: ${title}`);
      // Refresh reports to show new one
      fetchReports();
    }
  );

  // Mark report as viewed by student
  const markReportAsViewed = async (reportId: string) => {
    try {
      // Call API to mark as viewed
      await studentAPI.markReportViewed(accessToken, reportId);
      console.log(`✅ Report ${reportId} marked as viewed`);
      
      // Update local state
      setReports(prev =>
        prev.map(r =>
          r.id === reportId ? { ...r, viewed: true, viewedAt: new Date().toISOString() } : r
        )
      );
    } catch (error) {
      console.error('Error marking report as viewed:', error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedStudent]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = '';

      if (viewType === 'admin') {
        // Admin sees all reports
        url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/all`;
      } else if (viewType === 'parent') {
        // Parent sees reports for their children
        const childId = selectedStudent === 'all' ? '' : selectedStudent;
        url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/by-parent/${userId}${childId ? `?studentId=${childId}` : ''}`;
      } else if (viewType === 'student') {
        // Student sees their own reports
        url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/by-student/${userId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching session reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'satisfactory': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'needs-attention': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getProgressStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <TrendingUp className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'satisfactory': return <Target className="w-4 h-4" />;
      case 'needs-attention': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const renderStars = (rating: number, size: string = 'w-5 h-5') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const filteredReports = reports.filter(report => {
    if (filterSubject !== 'all' && report.subject !== filterSubject) return false;
    if (filterTutor !== 'all' && report.tutorId !== filterTutor) return false;
    if (filterStatus !== 'all' && report.progressStatus !== filterStatus) return false;
    return true;
  });

  // Merge subjects from paid bookings (bookedSubjects) with any subjects in existing reports
  const uniqueSubjects = Array.from(new Set([
    ...bookedSubjects,
    ...reports.map(r => r.subject).filter(Boolean),
  ]));
  const uniqueTutors = Array.from(new Set(reports.map(r => ({ id: r.tutorId, name: r.tutorName || 'Unknown Tutor' }))));

  const exportToPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = filteredReports.map(r => `
      <div style="page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <h3 style="margin:0;font-size:16px;color:#1a202c;">${r.subject || 'Session'} — ${r.studentName}</h3>
            <p style="margin:4px 0 0;font-size:13px;color:#718096;">${r.tutorName || ''} · ${new Date(r.date + 'T12:00:00+01:00').toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <span style="padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;background:${r.progressStatus === 'excellent' ? '#c6f6d5' : r.progressStatus === 'good' ? '#bee3f8' : r.progressStatus === 'satisfactory' ? '#fef3c7' : '#fed7d7'};color:${r.progressStatus === 'excellent' ? '#276749' : r.progressStatus === 'good' ? '#2c5282' : r.progressStatus === 'satisfactory' ? '#92400e' : '#9b2c2c'};">${r.progressStatus?.replace('-', ' ').toUpperCase()}</span>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          ${r.topicsCovered ? `<tr><td style="padding:6px 0;color:#718096;width:180px;">Topics Covered</td><td style="padding:6px 0;">${r.topicsCovered}</td></tr>` : ''}
          ${r.studentPerformance ? `<tr><td style="padding:6px 0;color:#718096;">Performance</td><td style="padding:6px 0;">${r.studentPerformance}</td></tr>` : ''}
          ${r.strengths ? `<tr><td style="padding:6px 0;color:#718096;">Strengths</td><td style="padding:6px 0;">${r.strengths}</td></tr>` : ''}
          ${r.areasForImprovement ? `<tr><td style="padding:6px 0;color:#718096;">Areas for Improvement</td><td style="padding:6px 0;">${r.areasForImprovement}</td></tr>` : ''}
          ${r.homeworkAssigned ? `<tr><td style="padding:6px 0;color:#718096;">Homework</td><td style="padding:6px 0;">${r.homeworkAssigned}</td></tr>` : ''}
          ${r.nextSessionPlan ? `<tr><td style="padding:6px 0;color:#718096;">Next Session Plan</td><td style="padding:6px 0;">${r.nextSessionPlan}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#718096;">Overall Rating</td><td style="padding:6px 0;">${'★'.repeat(r.overallRating)}${'☆'.repeat(5 - r.overallRating)} (${r.overallRating}/5)</td></tr>
          <tr><td style="padding:6px 0;color:#718096;">Attendance</td><td style="padding:6px 0;">${r.attendance}</td></tr>
        </table>
      </div>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Session Reports</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1a202c;max-width:800px;margin:0 auto;}
        h1{font-size:22px;margin-bottom:4px;}p.sub{font-size:13px;color:#718096;margin-bottom:24px;}
        @media print{@page{margin:20mm;}}</style></head>
      <body><h1>Session Reports</h1>
      <p class="sub">Exported ${new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })} · ${filteredReports.length} report(s)</p>
      ${rows}<script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">
            {viewType === 'admin' && 'All Session Reports'}
            {viewType === 'parent' && 'Your Children\'s Session Reports'}
            {viewType === 'student' && 'Your Session Reports'}
          </h2>
          <p className="text-gray-600">
            {viewType === 'admin' && 'View and monitor all tutor session reports across the platform'}
            {viewType === 'parent' && 'Track your children\'s progress through detailed tutor feedback'}
            {viewType === 'student' && 'Review feedback and insights from your tutoring sessions'}
          </p>
        </div>
        {filteredReports.length > 0 && (
          <Button onClick={exportToPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {viewType === 'parent' && children.length > 0 && (
              <div>
                <Label>Select Child</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Children</SelectItem>
                    {children.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.firstName && child.lastName
                          ? `${child.firstName} ${child.lastName}`
                          : child.name || child.full_name || 'Child'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Filter by Subject</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(viewType === 'admin' || viewType === 'parent') && uniqueTutors.length > 0 && (
              <div>
                <Label>Filter by Tutor</Label>
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tutors</SelectItem>
                    {uniqueTutors.map(tutor => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Filter by Progress</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Progress Levels</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="satisfactory">Satisfactory</SelectItem>
                  <SelectItem value="needs-attention">Needs Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {reports.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Reports</p>
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <h2 className="mb-1">{reports.length}</h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Average Rating</p>
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              <h2 className="mb-1">
                {(reports.reduce((sum, r) => sum + r.overallRating, 0) / reports.length).toFixed(1)}
              </h2>
              <div className="flex gap-1 mt-1">
                {renderStars(Math.round(reports.reduce((sum, r) => sum + r.overallRating, 0) / reports.length), 'w-3 h-3')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Excellent Progress</p>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="mb-1">
                {reports.filter(r => r.progressStatus === 'excellent').length}
              </h2>
              <p className="text-xs text-gray-500">
                {((reports.filter(r => r.progressStatus === 'excellent').length / reports.length) * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Perfect Attendance</p>
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="mb-1">
                {reports.filter(r => r.attendance === 'present').length}
              </h2>
              <p className="text-xs text-gray-500">
                {((reports.filter(r => r.attendance === 'present').length / reports.length) * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Loading reports...</p>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-gray-900">No session reports yet</h3>
              <p className="text-gray-600">
                {viewType === 'student' && 'Your tutors will create reports after each session'}
                {viewType === 'parent' && 'Session reports will appear here after tutors complete sessions with your children'}
                {viewType === 'admin' && 'No session reports have been created yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {viewType !== 'student' && (
                        <h3 className="text-gray-900">{report.studentName}</h3>
                      )}
                      {(viewType === 'admin' || viewType === 'student') && report.tutorName && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{report.tutorName}</span>
                        </div>
                      )}
                      <Badge style={{ backgroundColor: '#625d9c', color: 'white' }}>
                        {report.subject}
                      </Badge>
                      <Badge className={getProgressStatusColor(report.progressStatus)}>
                        {getProgressStatusIcon(report.progressStatus)}
                        <span className="ml-1 capitalize">{report.progressStatus.replace('-', ' ')}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {report.duration} mins
                      </span>
                      <span className="flex items-center gap-1">
                        Attendance: <Badge variant="outline" className="capitalize">{report.attendance}</Badge>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {renderStars(report.overallRating, 'w-4 h-4')}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingReport(report);
                        // Mark as viewed if student is viewing (for student dashboard)
                        if (viewType === 'student') {
                          markReportAsViewed(report.id);
                        }
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Topics Covered</p>
                    <p className="text-sm line-clamp-2">{report.topicsCovered || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Engagement</p>
                    <div className="flex items-center gap-2">
                      {renderStars(report.engagement, 'w-3 h-3')}
                      <span className="text-xs text-gray-500">({report.engagement}/5)</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Comprehension</p>
                    <div className="flex items-center gap-2">
                      {renderStars(report.comprehension, 'w-3 h-3')}
                      <span className="text-xs text-gray-500">({report.comprehension}/5)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Report Dialog */}
      {viewingReport && (
        <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Report Details</DialogTitle>
              <DialogDescription>
                {viewingReport.studentName} - {viewingReport.subject}
                {viewingReport.tutorName && ` with ${viewingReport.tutorName}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(viewingReport.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {viewingReport.duration} minutes
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Attendance</p>
                  <Badge className="capitalize">{viewingReport.attendance}</Badge>
                </div>
              </div>

              {/* Ratings */}
              <div>
                <h4 className="mb-3">Session Ratings</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Overall Rating</p>
                    {renderStars(viewingReport.overallRating)}
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Progress Status</p>
                    <Badge className={getProgressStatusColor(viewingReport.progressStatus)}>
                      {getProgressStatusIcon(viewingReport.progressStatus)}
                      <span className="ml-1 capitalize">{viewingReport.progressStatus.replace('-', ' ')}</span>
                    </Badge>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Engagement</p>
                    {renderStars(viewingReport.engagement)}
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Comprehension</p>
                    {renderStars(viewingReport.comprehension)}
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Participation</p>
                    {renderStars(viewingReport.participation)}
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2">Topics Covered</h4>
                  <p className="text-gray-700">{viewingReport.topicsCovered}</p>
                </div>

                <div>
                  <h4 className="mb-2">Student Performance</h4>
                  <p className="text-gray-700">{viewingReport.studentPerformance}</p>
                </div>

                {viewingReport.strengths && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600" />
                      Strengths
                    </h4>
                    <p className="text-gray-700">{viewingReport.strengths}</p>
                  </div>
                )}

                {viewingReport.areasForImprovement && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2">
                      <Target className="w-5 h-5" style={{ color: '#625d9c' }} />
                      Areas for Improvement
                    </h4>
                    <p className="text-gray-700">{viewingReport.areasForImprovement}</p>
                  </div>
                )}

                {viewingReport.homeworkAssigned && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" style={{ color: '#5d9827' }} />
                      Homework Assigned
                    </h4>
                    <p className="text-gray-700">{viewingReport.homeworkAssigned}</p>
                  </div>
                )}

                {viewingReport.nextSessionPlan && (
                  <div>
                    <h4 className="mb-2">Next Session Plan</h4>
                    <p className="text-gray-700">{viewingReport.nextSessionPlan}</p>
                  </div>
                )}

                {viewingReport.behaviorNotes && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      Behavior & Engagement Notes
                    </h4>
                    <p className="text-gray-700">{viewingReport.behaviorNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setViewingReport(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
