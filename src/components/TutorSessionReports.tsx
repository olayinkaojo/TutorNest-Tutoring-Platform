import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
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
  DialogTrigger,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import {
  FileText,
  Plus,
  Edit,
  Eye,
  Calendar,
  User,
  BookOpen,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Target,
  Award
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SessionReport {
  id: string;
  sessionId: string;
  tutorId: string;
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
  engagement: number; // 1-5
  comprehension: number; // 1-5
  participation: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

interface TutorSessionReportsProps {
  tutorId: string;
  accessToken: string;
}

export function TutorSessionReports({ tutorId, accessToken }: TutorSessionReportsProps) {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<SessionReport | null>(null);
  const [viewingReport, setViewingReport] = useState<SessionReport | null>(null);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sessionId: '',
    studentId: '',
    studentName: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    topicsCovered: '',
    studentPerformance: '',
    strengths: '',
    areasForImprovement: '',
    homeworkAssigned: '',
    nextSessionPlan: '',
    behaviorNotes: '',
    overallRating: 3,
    progressStatus: 'satisfactory' as const,
    attendance: 'present' as const,
    engagement: 3,
    comprehension: 3,
    participation: 3,
  });

  useEffect(() => {
    fetchReports();
    fetchStudents();
    fetchSessions();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/${tutorId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

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

  const fetchStudents = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/${tutorId}/students`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/${tutorId}/completed-sessions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    setFormData({
      sessionId: '',
      studentId: '',
      studentName: '',
      subject: '',
      date: new Date().toISOString().split('T')[0],
      duration: 60,
      topicsCovered: '',
      studentPerformance: '',
      strengths: '',
      areasForImprovement: '',
      homeworkAssigned: '',
      nextSessionPlan: '',
      behaviorNotes: '',
      overallRating: 3,
      progressStatus: 'satisfactory',
      attendance: 'present',
      engagement: 3,
      comprehension: 3,
      participation: 3,
    });
    setShowReportDialog(true);
  };

  const handleEditReport = (report: SessionReport) => {
    setEditingReport(report);
    setFormData({
      sessionId: report.sessionId,
      studentId: report.studentId,
      studentName: report.studentName,
      subject: report.subject,
      date: report.date,
      duration: report.duration,
      topicsCovered: report.topicsCovered,
      studentPerformance: report.studentPerformance,
      strengths: report.strengths,
      areasForImprovement: report.areasForImprovement,
      homeworkAssigned: report.homeworkAssigned,
      nextSessionPlan: report.nextSessionPlan,
      behaviorNotes: report.behaviorNotes,
      overallRating: report.overallRating,
      progressStatus: report.progressStatus,
      attendance: report.attendance,
      engagement: report.engagement,
      comprehension: report.comprehension,
      participation: report.participation,
    });
    setShowReportDialog(true);
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setFormData(prev => ({
        ...prev,
        sessionId: session.id,
        studentId: session.studentId,
        studentName: session.studentName,
        subject: session.subject,
        date: session.date,
        duration: session.duration || 60,
      }));
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const url = editingReport
        ? `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports/${editingReport.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-session-reports`;

      const response = await fetch(url, {
        method: editingReport ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tutorId,
        }),
      });

      if (response.ok) {
        setSuccess(editingReport ? 'Session report updated successfully!' : 'Session report created successfully!');
        setShowReportDialog(false);
        fetchReports();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save session report');
      }
    } catch (error) {
      console.error('Error saving session report:', error);
      setError('An error occurred while saving the report');
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
    if (filterStudent !== 'all' && report.studentId !== filterStudent) return false;
    if (filterSubject !== 'all' && report.subject !== filterSubject) return false;
    return true;
  });

  const uniqueSubjects = Array.from(new Set(reports.map(r => r.subject)));

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">Session Reports & Student Feedback</h2>
          <p className="text-gray-600">Document session outcomes and track student progress</p>
        </div>
        <Button onClick={handleCreateReport} style={{ backgroundColor: '#625d9c' }} className="text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <Label>Filter by Student</Label>
              <Select value={filterStudent} onValueChange={setFilterStudent}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name || student.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>
        </CardContent>
      </Card>

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
              <p className="text-gray-600 mb-4">
                Start documenting your sessions to track student progress and provide valuable feedback
              </p>
              <Button onClick={handleCreateReport} style={{ backgroundColor: '#625d9c' }} className="text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Report
              </Button>
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
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900">{report.studentName}</h3>
                      <Badge style={{ backgroundColor: '#625d9c', color: 'white' }}>
                        {report.subject}
                      </Badge>
                      <Badge className={getProgressStatusColor(report.progressStatus)}>
                        {getProgressStatusIcon(report.progressStatus)}
                        <span className="ml-1 capitalize">{report.progressStatus.replace('-', ' ')}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingReport(report)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReport(report)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
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

      {/* Create/Edit Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Edit Session Report' : 'Create Session Report'}</DialogTitle>
            <DialogDescription>
              Document session details and provide feedback on student performance
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReport} className="space-y-6">
            {/* Session Selection or Manual Entry */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Select Completed Session (Optional)</Label>
                <Select value={selectedSession} onValueChange={handleSessionSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a session or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.studentName} - {session.subject} ({new Date(session.date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Student and Subject */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Student Name *</Label>
                <Input
                  value={formData.studentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                  placeholder="Student name"
                  required
                />
              </div>

              <div>
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>

              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  min="15"
                  max="240"
                  required
                />
              </div>
            </div>

            {/* Attendance and Progress Status */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Attendance *</Label>
                <Select 
                  value={formData.attendance} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, attendance: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Overall Progress Status *</Label>
                <Select 
                  value={formData.progressStatus} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, progressStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="needs-attention">Needs Attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rating Scales */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4>Session Ratings (1-5 stars)</h4>
              
              <div>
                <Label>Overall Session Rating *</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, overallRating: rating }))}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= formData.overallRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        } hover:scale-110 transition-transform`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Engagement Level *</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, engagement: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating <= formData.engagement
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Comprehension Level *</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, comprehension: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating <= formData.comprehension
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Participation Level *</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, participation: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating <= formData.participation
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Text Fields */}
            <div>
              <Label>Topics Covered *</Label>
              <Textarea
                value={formData.topicsCovered}
                onChange={(e) => setFormData(prev => ({ ...prev, topicsCovered: e.target.value }))}
                placeholder="List the main topics and concepts covered in this session"
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Student Performance Summary *</Label>
              <Textarea
                value={formData.studentPerformance}
                onChange={(e) => setFormData(prev => ({ ...prev, studentPerformance: e.target.value }))}
                placeholder="Describe how the student performed during this session"
                rows={3}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Strengths Observed</Label>
                <Textarea
                  value={formData.strengths}
                  onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                  placeholder="What did the student do well?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Areas for Improvement</Label>
                <Textarea
                  value={formData.areasForImprovement}
                  onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
                  placeholder="What areas need more focus?"
                  rows={3}
                />
              </div>
            </div>

            <div>
              <Label>Homework/Practice Assigned</Label>
              <Textarea
                value={formData.homeworkAssigned}
                onChange={(e) => setFormData(prev => ({ ...prev, homeworkAssigned: e.target.value }))}
                placeholder="Describe any homework or practice exercises assigned"
                rows={2}
              />
            </div>

            <div>
              <Label>Plan for Next Session</Label>
              <Textarea
                value={formData.nextSessionPlan}
                onChange={(e) => setFormData(prev => ({ ...prev, nextSessionPlan: e.target.value }))}
                placeholder="What will you focus on in the next session?"
                rows={2}
              />
            </div>

            <div>
              <Label>Behavior & Engagement Notes</Label>
              <Textarea
                value={formData.behaviorNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, behaviorNotes: e.target.value }))}
                placeholder="Any observations about student behavior, attitude, or engagement"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" style={{ backgroundColor: '#625d9c' }} className="text-white">
                <FileText className="w-4 h-4 mr-2" />
                {editingReport ? 'Update Report' : 'Create Report'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      {viewingReport && (
        <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Report Details</DialogTitle>
              <DialogDescription>
                {viewingReport.studentName} - {viewingReport.subject}
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewingReport(null)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setViewingReport(null);
                    handleEditReport(viewingReport);
                  }}
                  style={{ backgroundColor: '#625d9c' }}
                  className="text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
