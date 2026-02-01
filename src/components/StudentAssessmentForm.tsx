import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Star, 
  TrendingUp, 
  Target, 
  BookOpen, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface AssessmentFormProps {
  bookingId: string;
  studentId: string;
  studentName: string;
  subject: string;
  sessionDate: string;
  tutorId: string;
  accessToken: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface AssessmentScores {
  understanding: number; // 1-5
  participation: number; // 1-5
  homeworkCompletion: number; // 1-5
  attentiveness: number; // 1-5
  improvement: number; // 1-5
}

export function StudentAssessmentForm({
  bookingId,
  studentId,
  studentName,
  subject,
  sessionDate,
  tutorId,
  accessToken,
  onComplete,
  onCancel
}: AssessmentFormProps) {
  const [scores, setScores] = useState<AssessmentScores>({
    understanding: 3,
    participation: 3,
    homeworkCompletion: 3,
    attentiveness: 3,
    improvement: 3
  });
  
  const [topicsCovered, setTopicsCovered] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [comments, setComments] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleScoreChange = (category: keyof AssessmentScores, value: number) => {
    setScores(prev => ({ ...prev, [category]: value }));
  };

  const calculateOverallScore = () => {
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    return Math.round((total / 25) * 100); // Convert to percentage
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A', color: '#5d9827', label: 'Excellent' };
    if (percentage >= 80) return { grade: 'B', color: '#625d9c', label: 'Very Good' };
    if (percentage >= 70) return { grade: 'C', color: '#3b82f6', label: 'Good' };
    if (percentage >= 60) return { grade: 'D', color: '#f59e0b', label: 'Fair' };
    return { grade: 'F', color: '#ef4444', label: 'Needs Improvement' };
  };

  const handleSubmit = async () => {
    // Validation
    if (!topicsCovered.trim()) {
      setError('Please specify topics covered in this session');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const overallScore = calculateOverallScore();
      const gradeInfo = getGrade(overallScore);

      const assessment = {
        bookingId,
        studentId,
        tutorId,
        subject,
        sessionDate,
        scores,
        overallScore,
        grade: gradeInfo.grade,
        topicsCovered: topicsCovered.trim(),
        strengths: strengths.trim(),
        areasForImprovement: areasForImprovement.trim(),
        comments: comments.trim(),
        homeworkAssigned: homeworkAssigned.trim(),
        nextSessionGoals: nextSessionGoals.trim(),
        submittedAt: new Date().toISOString()
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/assessments/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(assessment)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit assessment');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting assessment:', err);
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const ScoreSelector = ({ 
    label, 
    category, 
    icon: Icon 
  }: { 
    label: string; 
    category: keyof AssessmentScores; 
    icon: any 
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-600" />
        <label className="text-sm font-medium">{label}</label>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(value => (
          <button
            key={value}
            type="button"
            onClick={() => handleScoreChange(category, value)}
            className={`w-10 h-10 rounded-lg border-2 transition-all ${
              scores[category] === value
                ? 'border-[#625d9c] bg-[#625d9c] text-white scale-110'
                : 'border-gray-300 hover:border-[#625d9c] hover:bg-gray-50'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {scores[category] === 1 && 'Poor'}
        {scores[category] === 2 && 'Below Average'}
        {scores[category] === 3 && 'Average'}
        {scores[category] === 4 && 'Good'}
        {scores[category] === 5 && 'Excellent'}
      </p>
    </div>
  );

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#5d9827' }} />
            <h3 className="text-xl font-semibold mb-2">Assessment Submitted!</h3>
            <p className="text-gray-600">The student's performance has been recorded.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallScore = calculateOverallScore();
  const gradeInfo = getGrade(overallScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Assessment</CardTitle>
              <CardDescription>Evaluate student performance for this session</CardDescription>
            </div>
            <Badge 
              className="text-white px-4 py-2"
              style={{ backgroundColor: gradeInfo.color }}
            >
              {overallScore}% - Grade {gradeInfo.grade}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Student</p>
                <p className="font-medium">{studentName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Subject</p>
                <p className="font-medium">{subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Session Date</p>
                <p className="font-medium">{new Date(sessionDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: '#625d9c' }} />
            Performance Scores
          </CardTitle>
          <CardDescription>Rate the student on a scale of 1-5 for each category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreSelector label="Understanding of Concepts" category="understanding" icon={BookOpen} />
          <ScoreSelector label="Class Participation" category="participation" icon={MessageSquare} />
          <ScoreSelector label="Homework Completion" category="homeworkCompletion" icon={CheckCircle} />
          <ScoreSelector label="Attentiveness" category="attentiveness" icon={Target} />
          <ScoreSelector label="Improvement Since Last Session" category="improvement" icon={TrendingUp} />
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Topics Covered <span className="text-red-500">*</span>
            </label>
            <textarea
              value={topicsCovered}
              onChange={(e) => setTopicsCovered(e.target.value)}
              placeholder="List the main topics covered in this session..."
              className="w-full border rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Student Strengths
            </label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What did the student do well?"
              className="w-full border rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Areas for Improvement
            </label>
            <textarea
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              placeholder="What areas need more work?"
              className="w-full border rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Homework Assigned
            </label>
            <textarea
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
              placeholder="What homework was assigned for next session?"
              className="w-full border rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Next Session Goals
            </label>
            <textarea
              value={nextSessionGoals}
              onChange={(e) => setNextSessionGoals(e.target.value)}
              placeholder="What should be the focus for the next session?"
              className="w-full border rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Additional Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any other observations or notes..."
              className="w-full border rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1"
          style={{ backgroundColor: '#625d9c' }}
        >
          {submitting ? 'Submitting...' : 'Submit Assessment'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
