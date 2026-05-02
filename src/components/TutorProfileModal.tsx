import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Star,
  Shield,
  Clock,
  DollarSign,
  BookOpen,
  Users,
  Award,
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertCircle,
  Send,
  Sparkles,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface TutorProfileModalProps {
  tutor: any;
  isOpen: boolean;
  onClose: () => void;
  session: any;
  activeChildId?: string | null;
  onInvite?: (tutorId: string) => Promise<void>;
  onMessage?: (tutorId: string, tutorName: string) => void;
  onBook?: (tutor: any) => void;
}

interface Review {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
  subject: string;
}

export function TutorProfileModal({
  tutor,
  isOpen,
  onClose,
  session,
  activeChildId,
  onInvite,
  onMessage,
  onBook,
}: TutorProfileModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availability, setAvailability] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadReviews();
      loadStats();
    }
  }, [isOpen, tutor?.id]);

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/${tutor.userId || tutor.id}/reviews`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/${tutor.userId || tutor.id}/stats`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleInvite = async () => {
    setError('');
    setIsInviting(true);
    try {
      if (onInvite) {
        await onInvite(tutor.userId || tutor.id);
        setInvited(true);
        setSuccess('Invitation sent! The tutor will be notified.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleMessage = () => {
    if (onMessage) {
      onMessage(tutor.userId || tutor.id, `${tutor.firstName} ${tutor.lastName}`);
      onClose();
    }
  };

  const ratingBreakdown = reviews.length > 0
    ? {
        fiveStar: reviews.filter((r) => r.rating === 5).length,
        fourStar: reviews.filter((r) => r.rating === 4).length,
        threeStar: reviews.filter((r) => r.rating === 3).length,
        twoStar: reviews.filter((r) => r.rating === 2).length,
        oneStar: reviews.filter((r) => r.rating === 1).length,
      }
    : null;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : tutor.rating || '5.0';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tutor Profile</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-6 pr-4">
            {/* Success/Error Messages */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-200">
              <div className="flex gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }} className="text-lg">
                    {tutor.firstName?.[0]}{tutor.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {tutor.firstName} {tutor.lastName}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="default" style={{ backgroundColor: '#625d9c' }}>
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {averageRating} ({reviews.length} reviews)
                    </Badge>
                    {tutor.dbsStatus === 'verified' && (
                      <Badge style={{ backgroundColor: '#5d9827' }}>
                        <Shield className="w-3 h-3 mr-1" />
                        DBS Verified
                      </Badge>
                    )}
                    {tutor.isTopRated && (
                      <Badge style={{ backgroundColor: '#ea580c' }}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Top Rated
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{tutor.totalLessons || 0} lessons taught • {tutor.responseRate || 95}% response rate</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <h3 className="font-semibold mb-2 text-lg">About</h3>
              <p className="text-gray-700 leading-relaxed">{tutor.bio || 'No bio provided'}</p>
            </div>

            {/* Quick Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{stats.studentCount || 0}</p>
                    <p className="text-xs text-gray-600">Students</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <BookOpen className="w-5 h-5 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{stats.totalLessons || 0}</p>
                    <p className="text-xs text-gray-600">Lessons</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{stats.hoursTeaching || 0}h</p>
                    <p className="text-xs text-gray-600">Teaching</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Award className="w-5 h-5 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold">{tutor.yearExperience || 0}+ yrs</p>
                    <p className="text-xs text-gray-600">Experience</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Expertise */}
            <div>
              <h3 className="font-semibold mb-3 text-lg">Expertise</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {tutor.subjects?.map((subject: string) => (
                      <Badge key={subject} variant="secondary">
                        {subject}
                      </Badge>
                    )) || <p className="text-sm text-gray-500">Not specified</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Grade Levels</p>
                  <div className="flex flex-wrap gap-2">
                    {tutor.yearGroups?.map((group: string) => (
                      <Badge key={group} variant="outline">
                        {group}
                      </Badge>
                    )) || <p className="text-sm text-gray-500">Not specified</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Rates & Availability */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Hourly Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₦{tutor.hourlyRate || '0'}/hr</p>
                  {tutor.discountMultipleSessions && (
                    <p className="text-xs text-gray-600 mt-1">Multiple session discount available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="capitalize font-medium">{tutor.availability || 'Flexible'}</p>
                  <p className="text-xs text-gray-600 mt-1">Response time: {tutor.responseTime || '< 1 hour'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Reviews Breakdown */}
            {reviews.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4 text-lg">Student Reviews</h3>
                
                {/* Rating Distribution */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-2">
                        <div className="flex gap-0.5 w-16">
                          {[...Array(stars)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                          {[...Array(5 - stars)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-gray-300" />
                          ))}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-full"
                            style={{ width: `${(ratingBreakdown?.[`${stars}Star` as keyof typeof ratingBreakdown] || 0) / reviews.length * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 w-8">{ratingBreakdown?.[`${stars}Star` as keyof typeof ratingBreakdown] || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Cards */}
                <div className="space-y-3">
                  {reviews.slice(0, 5).map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-sm">{review.studentName}</p>
                            <p className="text-xs text-gray-600">{review.subject} • {new Date(review.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {reviews.length > 5 && (
                  <Button variant="outline" className="w-full mt-4">
                    View All {reviews.length} Reviews
                  </Button>
                )}
              </div>
            )}

            {/* Qualifications */}
            {tutor.qualifications && (
              <div>
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Qualifications
                </h3>
                <ul className="space-y-2">
                  {(Array.isArray(tutor.qualifications)
                    ? tutor.qualifications
                    : String(tutor.qualifications).split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean)
                  ).map((qual: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{qual}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="border-t pt-4 flex gap-2 mt-4 flex-wrap">
          <Button
            onClick={handleMessage}
            variant="outline"
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          {onBook ? (
            <Button
              onClick={() => onBook(tutor)}
              className="flex-1 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Session
            </Button>
          ) : (
            <Button
              onClick={handleInvite}
              disabled={isInviting || invited}
              className="flex-1 text-white"
              style={{ backgroundColor: invited ? '#9ca3af' : '#625d9c' }}
            >
              {invited ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Invited
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
