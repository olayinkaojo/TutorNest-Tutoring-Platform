import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Star, MessageSquare, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { ReviewsList } from './ReviewsList';
import { DisputeManager } from './DisputeManager';
import { projectId } from '../utils/supabase/info';

interface TutorReviewsTabProps {
  accessToken: string;
  tutorId: string;
}

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

export function TutorReviewsTab({ accessToken, tutorId }: TutorReviewsTabProps) {
  const [ratingData, setRatingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatingData();
  }, [tutorId]);

  const loadRatingData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/tutor/${tutorId}/rating`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setRatingData(await res.json());
    } catch (err) {
      console.error('Error loading rating data:', err);
    } finally {
      setLoading(false);
    }
  };

  const avg = ratingData?.averageRating ?? 0;
  const total = ratingData?.totalReviews ?? 0;
  const dist = ratingData?.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const ratingColor = avg >= 4.5 ? '#5d9827' : avg >= 3.5 ? '#f59e0b' : avg > 0 ? '#ef4444' : '#9ca3af';

  const renderStars = (r: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-5 h-5 ${s <= Math.round(r) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Rating summary */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Overall rating */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#625d9c' }} />
              Overall Rating
            </CardTitle>
            <CardDescription>Your average score across all sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                <span className="text-sm text-gray-400">Loading…</span>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="text-6xl font-bold" style={{ color: ratingColor }}>
                  {avg > 0 ? avg.toFixed(1) : '—'}
                </div>
                <div>
                  {renderStars(avg)}
                  <p className="text-sm text-gray-500 mt-2">
                    Based on <strong>{total}</strong> review{total !== 1 ? 's' : ''}
                  </p>
                  {total === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Complete sessions to receive ratings</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Rating Breakdown</CardTitle>
            <CardDescription>Distribution of your star ratings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : (
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = dist[stars] || 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const barColor = stars >= 4 ? '#5d9827' : stars >= 3 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={stars} className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5 w-20 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews & Disputes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Feedback &amp; Disputes</CardTitle>
          <CardDescription>Respond to reviews and manage any disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reviews">
            <TabsList className="mb-5">
              <TabsTrigger value="reviews" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                All Reviews
                {total > 0 && (
                  <span className="ml-1 bg-gray-200 text-gray-700 text-xs rounded-full px-1.5 py-0.5 font-medium">
                    {total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="disputes" className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Disputes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews">
              <ReviewsList
                tutorId={tutorId}
                accessToken={accessToken}
                userRole="tutor"
                currentUserId={tutorId}
              />
            </TabsContent>

            <TabsContent value="disputes">
              <DisputeManager
                accessToken={accessToken}
                userId={tutorId}
                userRole="tutor"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
