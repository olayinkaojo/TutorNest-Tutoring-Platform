import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Sparkles,
  User,
  Star,
  BookOpen,
  Clock,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Heart,
  Brain,
  Calendar,
  MessageSquare,
  AlertCircle,
  Loader2,
  Award
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface SmartTutorMatchesProps {
  session: any;
  studentId: string;
  studentName?: string;
  onSelectTutor?: (tutorId: string) => void;
}

interface TutorMatch {
  tutorId: string;
  tutor: any;
  matchScore: number;
  matchBreakdown: any;
  matchPercentage: number;
  compatibility: string;
}

export function SmartTutorMatches({ 
  session, 
  studentId, 
  studentName,
  onSelectTutor 
}: SmartTutorMatchesProps) {
  const [matches, setMatches] = useState<TutorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<TutorMatch | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [studentId]);

  const fetchMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/match/student/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err.message || 'Failed to load tutor matches');
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (compatibility: string) => {
    switch (compatibility) {
      case 'Excellent':
        return { bg: '#5d9827', text: 'white' };
      case 'Good':
        return { bg: '#22c55e', text: 'white' };
      case 'Fair':
        return { bg: '#f59e0b', text: 'white' };
      default:
        return { bg: '#9ca3af', text: 'white' };
    }
  };

  const TutorMatchCard = ({ match }: { match: TutorMatch }) => {
    const { bg, text } = getCompatibilityColor(match.compatibility);

    return (
      <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedMatch(match)}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                {match.tutor.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </div>
              <div className="flex-1">
                <h3 className="mb-1">{match.tutor.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{match.tutor.bio}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {match.tutor.subjects?.slice(0, 3).map((subject: string) => (
                    <Badge key={subject} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                  {match.tutor.subjects?.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{match.tutor.subjects.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-1"
                style={{ backgroundColor: bg }}
              >
                <span className="font-bold" style={{ color: text }}>
                  {match.matchPercentage}%
                </span>
              </div>
              <Badge style={{ backgroundColor: bg, color: text }}>
                {match.compatibility}
              </Badge>
            </div>
          </div>

          {/* Match Breakdown */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                <BookOpen className="w-4 h-4" />
                Subject Match
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(match.matchBreakdown.subject / 25) * 100} className="w-20 h-2" />
                <span className="font-medium">{Math.round((match.matchBreakdown.subject / 25) * 100)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                <Brain className="w-4 h-4" />
                Learning Style
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(match.matchBreakdown.learningStyle / 15) * 100} className="w-20 h-2" />
                <span className="font-medium">{Math.round((match.matchBreakdown.learningStyle / 15) * 100)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                <Calendar className="w-4 h-4" />
                Schedule
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(match.matchBreakdown.schedule / 20) * 100} className="w-20 h-2" />
                <span className="font-medium">{Math.round((match.matchBreakdown.schedule / 20) * 100)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                <DollarSign className="w-4 h-4" />
                Budget Fit
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(match.matchBreakdown.budget / 10) * 100} className="w-20 h-2" />
                <span className="font-medium">{Math.round((match.matchBreakdown.budget / 10) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-500">Hourly Rate</p>
              <p className="font-medium">£{match.tutor.hourlyRate}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Experience</p>
              <p className="font-medium">{match.tutor.yearsExperience || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMatch(match);
              }}
            >
              View Details
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: '#625d9c' }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectTutor) {
                  onSelectTutor(match.tutorId);
                }
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Finding your perfect tutor matches...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing compatibility across multiple dimensions</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const excellentMatches = matches.filter(m => m.compatibility === 'Excellent');
  const goodMatches = matches.filter(m => m.compatibility === 'Good');
  const fairMatches = matches.filter(m => m.compatibility === 'Fair');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="flex items-center gap-2">
                Smart Matches for {studentName}
                <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>
                  AI-Powered
                </Badge>
              </h3>
              <p className="text-sm text-gray-600">
                Found {matches.length} tutors ranked by compatibility
              </p>
            </div>
          </div>

          {matches.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5d9827' }}></div>
                  <span className="text-sm font-medium">Excellent</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#5d9827' }}>{excellentMatches.length}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Good</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{goodMatches.length}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium">Fair</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{fairMatches.length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tutors found matching the criteria</p>
            <p className="text-sm mt-2">Try adjusting the student's profile settings</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All Matches ({matches.length})
            </TabsTrigger>
            <TabsTrigger value="excellent">
              <Star className="w-4 h-4 mr-1" />
              Excellent ({excellentMatches.length})
            </TabsTrigger>
            <TabsTrigger value="good">
              Good ({goodMatches.length})
            </TabsTrigger>
            <TabsTrigger value="fair">
              Fair ({fairMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {matches.map((match) => (
              <TutorMatchCard key={match.tutorId} match={match} />
            ))}
          </TabsContent>

          <TabsContent value="excellent" className="space-y-4 mt-4">
            {excellentMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <p>No excellent matches yet</p>
                </CardContent>
              </Card>
            ) : (
              excellentMatches.map((match) => (
                <TutorMatchCard key={match.tutorId} match={match} />
              ))
            )}
          </TabsContent>

          <TabsContent value="good" className="space-y-4 mt-4">
            {goodMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <p>No good matches yet</p>
                </CardContent>
              </Card>
            ) : (
              goodMatches.map((match) => (
                <TutorMatchCard key={match.tutorId} match={match} />
              ))
            )}
          </TabsContent>

          <TabsContent value="fair" className="space-y-4 mt-4">
            {fairMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <p>No fair matches yet</p>
                </CardContent>
              </Card>
            ) : (
              fairMatches.map((match) => (
                <TutorMatchCard key={match.tutorId} match={match} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Detailed Match View Dialog would go here */}
    </div>
  );
}
