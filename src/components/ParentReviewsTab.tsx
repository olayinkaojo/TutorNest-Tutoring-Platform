import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Star, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { ReviewsList } from './ReviewsList';
import { DisputeManager } from './DisputeManager';
import { RateSessionDialog } from './RateSessionDialog';
import { projectId } from '../utils/supabase/info';

interface ParentReviewsTabProps {
  accessToken: string;
  parentId: string;
}

export function ParentReviewsTab({ accessToken, parentId }: ParentReviewsTabProps) {
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

  useEffect(() => {
    loadPendingSessions();
  }, [accessToken, parentId, refreshKey]);

  const loadPendingSessions = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };

      // Fetch all bookings for this parent
      const bookingsRes = await fetch(`${BASE}/bookings`, { headers });
      if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');
      const { bookings = [] } = await bookingsRes.json();

      // Filter to completed sessions only
      const completed = bookings.filter((b: any) => b.status === 'completed');
      if (completed.length === 0) {
        setPendingSessions([]);
        return;
      }

      // Fetch all reviews this parent has already written
      const reviewsRes = await fetch(`${BASE}/reviews?parentId=${parentId}`, { headers });
      const { reviews = [] } = reviewsRes.ok ? await reviewsRes.json() : { reviews: [] };
      const reviewedSessionIds = new Set(reviews.map((r: any) => r.sessionId));

      // Only show sessions that haven't been reviewed yet
      const unreviewed = completed.filter((b: any) => !reviewedSessionIds.has(b.id));
      setPendingSessions(unreviewed);
    } catch (err) {
      console.error('Error loading pending review sessions:', err);
      setPendingSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRateSession = (session: any) => {
    setSelectedSession(session);
    setShowRateDialog(true);
  };

  const handleReviewSuccess = () => {
    setShowRateDialog(false);
    setSelectedSession(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Ratings</CardTitle>
          <CardDescription>
            Rate tutors and manage your feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="my-reviews">
            <TabsList className="mb-4">
              <TabsTrigger value="my-reviews">
                <Star className="w-4 h-4 mr-2" />
                My Reviews
              </TabsTrigger>
              <TabsTrigger value="pending">
                <MessageSquare className="w-4 h-4 mr-2" />
                Pending Reviews
                {pendingSessions.length > 0 && (
                  <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {pendingSessions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="disputes">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Disputes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-reviews">
              <ReviewsList
                parentId={parentId}
                accessToken={accessToken}
                userRole="parent"
                currentUserId={parentId}
              />
            </TabsContent>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Sessions to Review</CardTitle>
                  <CardDescription>
                    Rate your completed tutoring sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : pendingSessions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No pending reviews</p>
                      <p className="text-sm mt-1">Completed sessions will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingSessions.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="mb-1">
                                  {session.notes || session.subject || 'Tutoring Session'}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  with {session.tutorName || 'Tutor'}
                                  {session.studentName ? ` · ${session.studentName}` : ''}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {session.date
                                    ? new Date(session.date).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                      })
                                    : ''}
                                </p>
                              </div>
                              <Button
                                onClick={() => handleRateSession(session)}
                                className="text-white"
                                style={{ backgroundColor: '#625d9c' }}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Rate Session
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
        />
      )}
    </div>
  );
}
