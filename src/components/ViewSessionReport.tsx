import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  BookOpen, 
  Target,
  Award,
  Clock,
  Calendar,
  ThumbsUp,
  Star,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface ViewSessionReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  report: any;
  session: any;
  userRole: 'parent' | 'tutor';
}

export function ViewSessionReport({ 
  open, 
  onOpenChange, 
  booking,
  report,
  session,
  userRole 
}: ViewSessionReportProps) {
  const [parentRating, setParentRating] = useState(0);
  const [parentFeedback, setParentFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(!!report?.parentRating);

  const handleSubmitRating = async () => {
    if (parentRating === 0) {
      return;
    }

    setSubmittingRating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings/${booking.id}/rate-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            rating: parentRating,
            feedback: parentFeedback,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }

      setRatingSubmitted(true);
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'satisfactory': return 'bg-amber-100 text-amber-800';
      case 'needs_improvement': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementLabel = (level: string) => {
    switch (level) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'satisfactory': return 'Satisfactory';
      case 'needs_improvement': return 'Needs Improvement';
      default: return level;
    }
  };

  if (!report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Report</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No report submitted yet</p>
            <p className="text-sm mt-2">The tutor will submit a report after the session</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: '#625d9c' }} />
            Session Report
          </DialogTitle>
          <DialogDescription>
            Detailed summary of the lesson and student progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Session Info */}
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="font-medium">{new Date(booking.date + 'T12:00:00+01:00').toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Time</span>
                  </div>
                  <p className="font-medium">{booking.startTime} - {booking.endTime}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Duration</span>
                  </div>
                  <p className="font-medium">{booking.duration} minutes</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Attendance</span>
                  </div>
                  <Badge className={report.studentAttended ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {report.studentAttended ? 'Present' : 'Absent'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Summary */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" style={{ color: '#625d9c' }} />
              Session Summary
            </h3>
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-700 whitespace-pre-wrap">{report.sessionSummary}</p>
              </CardContent>
            </Card>
          </div>

          {/* Topics Covered */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
              Topics Covered
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {report.topicsCovered?.map((topic: string) => (
                    <Badge 
                      key={topic} 
                      variant="secondary"
                      className="px-3 py-1"
                      style={{ backgroundColor: '#625d9c', color: 'white' }}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills Worked On */}
          {report.skillsWorked && report.skillsWorked.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5" style={{ color: '#5d9827' }} />
                Skills Practiced
              </h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {report.skillsWorked.map((skill: string) => (
                      <Badge 
                        key={skill} 
                        className="px-3 py-1 bg-green-100 text-green-800"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Engagement */}
          {report.studentEngagement && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg">
                <ThumbsUp className="w-5 h-5" style={{ color: '#625d9c' }} />
                Student Engagement
              </h3>
              <Card>
                <CardContent className="pt-6">
                  <Badge className={`px-4 py-2 text-base ${getEngagementColor(report.studentEngagement)}`}>
                    {getEngagementLabel(report.studentEngagement)}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Progress Assessment */}
          <div className="grid md:grid-cols-2 gap-4">
            {report.areasOfStrength && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Areas of Strength
                </h3>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <p className="text-gray-700 whitespace-pre-wrap">{report.areasOfStrength}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {report.areasForImprovement && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  Areas for Improvement
                </h3>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <p className="text-gray-700 whitespace-pre-wrap">{report.areasForImprovement}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Homework Assigned */}
          {report.homeworkAssigned && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg">
                <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
                Homework Assigned
              </h3>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <p className="text-gray-700 whitespace-pre-wrap mb-3">{report.homeworkAssigned}</p>
                  {report.homeworkDueDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Due: {new Date(report.homeworkDueDate).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Next Lesson Recommendations */}
          {report.nextLessonFocus && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" style={{ color: '#625d9c' }} />
                Next Lesson Focus
              </h3>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{report.nextLessonFocus}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recommendation */}
          {report.recommendNextSession && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Tutor Recommendation:</strong> The tutor recommends booking another session to continue the student's progress.
              </AlertDescription>
            </Alert>
          )}

          {/* Parent Rating Section (Only for parents who haven't rated yet) */}
          {userRole === 'parent' && !ratingSubmitted && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5" style={{ color: '#5d9827' }} />
                  Rate This Session
                </h3>
                <Card className="border-purple-200">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">How would you rate this session?</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setParentRating(rating)}
                            className="transition-all"
                          >
                            <Star
                              className={`w-10 h-10 ${
                                rating <= parentRating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Additional Feedback (Optional)</label>
                      <Textarea
                        value={parentFeedback}
                        onChange={(e) => setParentFeedback(e.target.value)}
                        placeholder="Share your thoughts about this session..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleSubmitRating}
                      disabled={parentRating === 0 || submittingRating}
                      className="w-full text-white"
                      style={{ backgroundColor: '#5d9827' }}
                    >
                      {submittingRating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Rating'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Show rating if already submitted */}
          {report.parentRating && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5" style={{ color: '#5d9827' }} />
                  Parent Rating
                </h3>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= report.parentRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {report.parentFeedback && (
                      <p className="text-gray-700">{report.parentFeedback}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Report Metadata */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t">
            Report submitted on {new Date(report.submittedAt).toLocaleDateString('en-GB', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
