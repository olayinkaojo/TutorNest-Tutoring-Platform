import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Target,
  MessageSquare,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface StudentAssessmentsListProps {
  studentId: string;
  accessToken: string;
}

export function StudentAssessmentsList({ studentId, accessToken }: StudentAssessmentsListProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    fetchAssessments();
    fetchStats();
  }, [studentId]);

  const fetchAssessments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/assessments/student/${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch assessments:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/assessments/stats/student/${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching assessment stats:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching assessment stats:', error);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#5d9827';
      case 'B': return '#625d9c';
      case 'C': return '#3b82f6';
      case 'D': return '#f59e0b';
      case 'F': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'understanding': return <BookOpen className="w-4 h-4" />;
      case 'participation': return <MessageSquare className="w-4 h-4" />;
      case 'homeworkCompletion': return <CheckCircle className="w-4 h-4" />;
      case 'attentiveness': return <Target className="w-4 h-4" />;
      case 'improvement': return <TrendingUp className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'understanding': return 'Understanding';
      case 'participation': return 'Participation';
      case 'homeworkCompletion': return 'Homework';
      case 'attentiveness': return 'Attentiveness';
      case 'improvement': return 'Improvement';
      default: return category;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
            <p className="text-gray-500">Loading assessments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      {stats && stats.totalAssessments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: '#625d9c' }} />
              Performance Overview
            </CardTitle>
            <CardDescription>
              Based on {stats.totalAssessments} assessment{stats.totalAssessments !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Average Score */}
              <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Average Score</p>
                  {getTrendIcon(stats.recentTrend)}
                </div>
                <p className="text-3xl mb-1">{stats.averageScore}%</p>
                <p className="text-xs text-gray-500 capitalize">{stats.recentTrend}</p>
              </div>

              {/* Category Scores */}
              {Object.entries(stats.categoryAverages).slice(0, 5).map(([category, score]: [string, any]) => (
                <div key={category} className="p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(category)}
                    <p className="text-sm text-gray-600">{getCategoryLabel(category)}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl">{score.toFixed(1)}</p>
                    <p className="text-sm text-gray-500 mb-0.5">/ 5</p>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(score / 5) * 100}%`,
                        backgroundColor: score >= 4 ? '#5d9827' : score >= 3 ? '#625d9c' : '#f59e0b'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Subject Performance */}
            {Object.keys(stats.subjectPerformance).length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Performance by Subject</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(stats.subjectPerformance).map(([subject, score]: [string, any]) => (
                    <div key={subject} className="p-3 rounded-lg border text-center">
                      <p className="text-xs text-gray-600 mb-1">{subject}</p>
                      <p className="text-xl" style={{ color: getGradeColor(score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F') }}>
                        {score}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
          <CardDescription>
            Detailed feedback from completed sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length > 0 ? (
            <div className="space-y-3">
              {assessments.map((assessment: any) => {
                const isExpanded = expandedAssessmentId === assessment.id;
                
                return (
                  <div key={assessment.id} className="border rounded-lg">
                    {/* Assessment Header */}
                    <button
                      onClick={() => setExpandedAssessmentId(isExpanded ? null : assessment.id)}
                      className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <BookOpen className="w-4 h-4 text-gray-600" />
                            <span className="font-medium">{assessment.subject}</span>
                            <Badge
                              className="text-white"
                              style={{ backgroundColor: getGradeColor(assessment.grade) }}
                            >
                              Grade {assessment.grade} - {assessment.overallScore}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(assessment.sessionDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {assessment.tutorName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t">
                        {/* Performance Scores */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-3">Performance Scores</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {Object.entries(assessment.scores).map(([category, score]: [string, any]) => (
                              <div key={category} className="text-center p-2 rounded-lg bg-gray-50">
                                <div className="flex justify-center mb-1">
                                  {getCategoryIcon(category)}
                                </div>
                                <p className="text-xs text-gray-600 mb-1">{getCategoryLabel(category)}</p>
                                <p className="text-lg">{score}/5</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Topics Covered */}
                        {assessment.topicsCovered && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Topics Covered</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                              {assessment.topicsCovered}
                            </p>
                          </div>
                        )}

                        {/* Strengths */}
                        {assessment.strengths && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              Strengths
                            </h4>
                            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
                              {assessment.strengths}
                            </p>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {assessment.areasForImprovement && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-600" />
                              Areas for Improvement
                            </h4>
                            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                              {assessment.areasForImprovement}
                            </p>
                          </div>
                        )}

                        {/* Homework Assigned */}
                        {assessment.homeworkAssigned && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-purple-600" />
                              Homework Assigned
                            </h4>
                            <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded-lg border border-purple-200">
                              {assessment.homeworkAssigned}
                            </p>
                          </div>
                        )}

                        {/* Next Session Goals */}
                        {assessment.nextSessionGoals && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Star className="w-4 h-4" style={{ color: '#625d9c' }} />
                              Next Session Goals
                            </h4>
                            <p className="text-sm text-gray-700 p-3 rounded-lg border" style={{ backgroundColor: '#625d9c10', borderColor: '#625d9c40' }}>
                              {assessment.nextSessionGoals}
                            </p>
                          </div>
                        )}

                        {/* Additional Comments */}
                        {assessment.comments && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Additional Comments</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                              {assessment.comments}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No assessments available yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Assessments will appear here after completed tutoring sessions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}