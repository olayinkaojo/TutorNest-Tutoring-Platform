import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Star, MessageSquare, AlertTriangle, Loader2, TrendingUp, BookOpen, Calendar, CheckCircle } from 'lucide-react';
import { ReviewsList } from './ReviewsList';
import { DisputeManager } from './DisputeManager';
import { RateSessionDialog } from './RateSessionDialog';
import { projectId } from '../utils/supabase/info';

interface ParentReviewsTabProps {
  accessToken: string;
  parentId: string;
}

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

export function ParentReviewsTab({ accessToken, parentId }: ParentReviewsTabProps) {
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');

  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    loadData();
  }, [accessToken, parentId, refreshKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, reviewsRes] = await Promise.all([
        fetch(`${BASE}/bookings`, { headers }),
        fetch(`${BASE}/reviews?parentId=${parentId}`, { headers }),
      ]);

      const { bookings = [] } = bookingsRes.ok ? await bookingsRes.json() : { bookings: [] };
      const { reviews = [] } = reviewsRes.ok ? await reviewsRes.json() : { reviews: [] };

      setMyReviews(reviews);

      const reviewedSessionIds = new Set(reviews.map((r: any) => r.sessionId));
      const completedUnreviewed = bookings.filter(
        (b: any) => b.status === 'completed' && !reviewedSessionIds.has(b.id),
      );
      setPendingSessions(completedUnreviewed);

      // Auto-switch to pending tab if there are pending reviews
      if (completedUnreviewed.length > 0 && reviews.length === 0) {
        setActiveTab('pending');
      } else if (reviews.length > 0) {
        setActiveTab('my-reviews');
      }
    } catch (err) {
      console.error('Error loading review data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuccess = () => {
    setShowRateDialog(false);
    setSelectedSession(null);
    setRefreshKey((k) => k + 1);
  };

  // Summary stats derived from reviews
  const stats = useMemo(() => {
    if (myReviews.length === 0) return null;
    const avgGiven = myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length;
    const tutorIds = new Set(myReviews.map((r) => r.tutorId));
    return {
      totalReviews: myReviews.length,
      avgGiven: avgGiven.toFixed(1),
      tutorsReviewed: tutorIds.size,
      withReplies: myReviews.filter((r) => r.reply).length,
    };
  }, [myReviews]);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );

  const getInitials = (name?: string) => {
    if (!name) return 'T';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      {!loading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold" style={{ color: '#625d9c' }}>{stats.totalReviews}</p>
              <p className="text-xs text-gray-500 mt-0.5">Reviews Written</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <p className="text-2xl font-bold text-yellow-600">{stats.avgGiven}</p>
              </div>
              <p className="text-xs text-gray-500">Avg Rating Given</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.tutorsReviewed}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tutors Reviewed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.withReplies}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tutor Replies</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending sessions banner */}
      {!loading && pendingSessions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {pendingSessions.length} session{pendingSessions.length !== 1 ? 's' : ''} awaiting your review
                  </p>
                  <p className="text-xs text-gray-500">Your feedback helps tutors improve and guides other families</p>
                </div>
              </div>
              <Button
                size="sm"
                className="text-white flex-shrink-0"
                style={{ backgroundColor: '#f59e0b' }}
                onClick={() => setActiveTab('pending')}
              >
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main tabs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Reviews & Feedback</CardTitle>
          <CardDescription>Rate sessions, view your reviews, and manage disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-5 w-full sm:w-auto">
              <TabsTrigger value="my-reviews" className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                My Reviews
                {myReviews.length > 0 && (
                  <span className="ml-1 bg-gray-200 text-gray-700 text-xs rounded-full px-1.5 py-0.5 font-medium">
                    {myReviews.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Pending
                {pendingSessions.length > 0 && (
                  <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                    {pendingSessions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="disputes" className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Disputes
              </TabsTrigger>
            </TabsList>

            {/* My Reviews */}
            <TabsContent value="my-reviews">
              {loading ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin mb-3" />
                  <p className="text-sm">Loading your reviews…</p>
                </div>
              ) : myReviews.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-600 mb-1">No reviews yet</p>
                  <p className="text-sm text-gray-400 max-w-xs mb-4">
                    After completing tutoring sessions, you can rate and review your tutors here.
                  </p>
                  {pendingSessions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('pending')}
                      style={{ borderColor: '#625d9c', color: '#625d9c' }}
                    >
                      <Star className="w-3.5 h-3.5 mr-1.5" />
                      Review {pendingSessions.length} pending session{pendingSessions.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              ) : (
                <ReviewsList
                  parentId={parentId}
                  accessToken={accessToken}
                  userRole="parent"
                  currentUserId={parentId}
                  onDelete={() => setRefreshKey((k) => k + 1)}
                />
              )}
            </TabsContent>

            {/* Pending Reviews */}
            <TabsContent value="pending">
              {loading ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin mb-3" />
                  <p className="text-sm">Loading sessions…</p>
                </div>
              ) : pendingSessions.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-medium text-gray-700 mb-1">All caught up!</p>
                  <p className="text-sm text-gray-400">
                    You've reviewed all your completed sessions. Great job!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Your feedback helps tutors grow and guides other families in choosing the right tutor.
                  </p>
                  {pendingSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="border hover:border-purple-300 transition-colors group"
                    >
                      <CardContent className="py-4 px-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-11 h-11 flex-shrink-0">
                              <AvatarFallback
                                style={{ backgroundColor: '#625d9c', color: 'white' }}
                                className="font-semibold text-sm"
                              >
                                {getInitials(session.tutorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {session.tutorName || 'Tutor'}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {(session.notes || session.subject) && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <BookOpen className="w-3 h-3" />
                                    {session.notes || session.subject}
                                  </div>
                                )}
                                {session.studentName && (
                                  <span className="text-xs text-gray-400">
                                    for {session.studentName}
                                  </span>
                                )}
                                {session.date && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(session.date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowRateDialog(true);
                            }}
                            size="sm"
                            className="text-white flex-shrink-0 group-hover:shadow-md transition-shadow"
                            style={{ backgroundColor: '#625d9c' }}
                          >
                            <Star className="w-3.5 h-3.5 mr-1.5" />
                            Rate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Disputes */}
            <TabsContent value="disputes">
              <DisputeManager
                accessToken={accessToken}
                userId={parentId}
                userRole="parent"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rate session dialog */}
      {selectedSession && (
        <RateSessionDialog
          session={selectedSession}
          open={showRateDialog}
          onClose={() => {
            setShowRateDialog(false);
            setSelectedSession(null);
          }}
          onSuccess={handleReviewSuccess}
          accessToken={accessToken}
          parentId={parentId}
        />
      )}
    </div>
  );
}
