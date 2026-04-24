import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  BookOpen, 
  Target,
  AlertCircle,
  Loader2,
  Award,
  Clock,
  ThumbsUp
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface PostSessionReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  session: any;
  onReportSubmitted?: () => void;
}

const SKILLS_CATEGORIES = {
  'Mathematics': [
    'Algebra', 'Geometry', 'Statistics', 'Calculus', 'Problem Solving', 
    'Mental Math', 'Word Problems', 'Fractions & Decimals'
  ],
  'English': [
    'Reading Comprehension', 'Creative Writing', 'Grammar', 'Vocabulary',
    'Essay Writing', 'Spelling', 'Literature Analysis', 'Speaking & Listening'
  ],
  'Science': [
    'Scientific Method', 'Lab Skills', 'Data Analysis', 'Critical Thinking',
    'Observation Skills', 'Hypothesis Formation', 'Experimental Design'
  ],
  'General': [
    'Time Management', 'Focus & Concentration', 'Note-Taking', 'Organization',
    'Critical Thinking', 'Confidence', 'Communication', 'Independence'
  ]
};

export function PostSessionReport({ 
  open, 
  onOpenChange, 
  booking, 
  session,
  onReportSubmitted 
}: PostSessionReportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Report fields
  const [sessionSummary, setSessionSummary] = useState('');
  const [topicsCovered, setTopicsCovered] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [skillsWorked, setSkillsWorked] = useState<string[]>([]);
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [homeworkDueDate, setHomeworkDueDate] = useState('');
  const [progressAssessment, setProgressAssessment] = useState('');
  const [studentEngagement, setStudentEngagement] = useState('');
  const [areasOfStrength, setAreasOfStrength] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [nextLessonFocus, setNextLessonFocus] = useState('');
  const [recommendNextSession, setRecommendNextSession] = useState(true);
  const [studentAttended, setStudentAttended] = useState(true);

  const addTopic = () => {
    if (newTopic.trim() && !topicsCovered.includes(newTopic.trim())) {
      setTopicsCovered([...topicsCovered, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setTopicsCovered(topicsCovered.filter(t => t !== topic));
  };

  const toggleSkill = (skill: string) => {
    setSkillsWorked(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    if (!sessionSummary.trim()) {
      setError('Please provide a session summary');
      return;
    }

    if (topicsCovered.length === 0) {
      setError('Please add at least one topic covered');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings/${booking.id}/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionSummary,
            topicsCovered,
            skillsWorked,
            homeworkAssigned,
            homeworkDueDate,
            progressAssessment,
            studentEngagement,
            areasOfStrength,
            areasForImprovement,
            nextLessonFocus,
            recommendNextSession,
            studentAttended,
            submittedAt: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      onReportSubmitted?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: '#625d9c' }} />
            Post-Session Report
          </DialogTitle>
          <DialogDescription>
            Document what was covered and the student's progress
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Session Info */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Student:</span>
                <p className="font-medium">{booking.studentName}</p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">{new Date(booking.date + 'T12:00:00+01:00').toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' })}</p>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <p className="font-medium">{booking.startTime} - {booking.endTime}</p>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <p className="font-medium">{booking.duration} minutes</p>
              </div>
            </div>
          </div>

          {/* Student Attendance */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="studentAttended"
                checked={studentAttended}
                onCheckedChange={(checked) => setStudentAttended(checked as boolean)}
              />
              <Label htmlFor="studentAttended" className="font-medium">
                Student attended this session
              </Label>
            </div>
            {!studentAttended && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  If the student did not attend, the parent may be eligible for a refund. Please provide details below.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Session Summary */}
          <div className="space-y-2">
            <Label htmlFor="sessionSummary">
              Session Summary *
              <span className="text-sm text-gray-500 ml-2">What did you work on today?</span>
            </Label>
            <Textarea
              id="sessionSummary"
              value={sessionSummary}
              onChange={(e) => setSessionSummary(e.target.value)}
              placeholder="Provide a detailed summary of today's lesson, what you covered, and how the student performed..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">{sessionSummary.length}/500 characters</p>
          </div>

          {/* Topics Covered */}
          <div className="space-y-2">
            <Label>
              Topics Covered *
              <span className="text-sm text-gray-500 ml-2">Add specific topics you taught</span>
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g., Quadratic Equations"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
              />
              <Button type="button" onClick={addTopic} variant="outline">
                Add
              </Button>
            </div>
            {topicsCovered.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                {topicsCovered.map((topic) => (
                  <Badge 
                    key={topic} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => removeTopic(topic)}
                  >
                    {topic} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Skills Worked On */}
          <div className="space-y-3">
            <Label>
              <Award className="w-4 h-4 inline mr-1" />
              Skills Worked On
              <span className="text-sm text-gray-500 ml-2">Select all that apply</span>
            </Label>
            
            {Object.entries(SKILLS_CATEGORIES).map(([category, skills]) => (
              <div key={category} className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{category}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`p-2 rounded-lg border-2 text-sm transition-all text-left ${
                        skillsWorked.includes(skill)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Homework Assigned */}
          <div className="space-y-3">
            <Label htmlFor="homework">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Homework Assigned (Optional)
            </Label>
            <Textarea
              id="homework"
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
              placeholder="Describe any homework tasks assigned to the student..."
              rows={3}
            />
            {homeworkAssigned && (
              <div className="space-y-2">
                <Label htmlFor="dueDate">Homework Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={homeworkDueDate}
                  onChange={(e) => setHomeworkDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}
          </div>

          {/* Student Engagement */}
          <div className="space-y-2">
            <Label htmlFor="engagement">
              Student Engagement Level
            </Label>
            <Select value={studentEngagement} onValueChange={setStudentEngagement}>
              <SelectTrigger id="engagement">
                <SelectValue placeholder="Select engagement level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent - Highly engaged and proactive</SelectItem>
                <SelectItem value="good">Good - Engaged and participated well</SelectItem>
                <SelectItem value="satisfactory">Satisfactory - Some engagement</SelectItem>
                <SelectItem value="needs_improvement">Needs Improvement - Low engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Progress Assessment */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strengths">
                <TrendingUp className="w-4 h-4 inline mr-1 text-green-600" />
                Areas of Strength
              </Label>
              <Textarea
                id="strengths"
                value={areasOfStrength}
                onChange={(e) => setAreasOfStrength(e.target.value)}
                placeholder="What did the student do well?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="improvements">
                <Target className="w-4 h-4 inline mr-1 text-amber-600" />
                Areas for Improvement
              </Label>
              <Textarea
                id="improvements"
                value={areasForImprovement}
                onChange={(e) => setAreasForImprovement(e.target.value)}
                placeholder="What needs more work?"
                rows={3}
              />
            </div>
          </div>

          {/* Next Lesson Focus */}
          <div className="space-y-2">
            <Label htmlFor="nextLesson">
              Next Lesson Recommendations
            </Label>
            <Textarea
              id="nextLesson"
              value={nextLessonFocus}
              onChange={(e) => setNextLessonFocus(e.target.value)}
              placeholder="What should we focus on in the next session?"
              rows={3}
            />
          </div>

          {/* Recommend Next Session */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recommend"
                checked={recommendNextSession}
                onCheckedChange={(checked) => setRecommendNextSession(checked as boolean)}
              />
              <Label htmlFor="recommend" className="font-medium">
                I recommend booking another session
              </Label>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <ThumbsUp className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              This report will be shared with the parent and help track the student's progress over time.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
