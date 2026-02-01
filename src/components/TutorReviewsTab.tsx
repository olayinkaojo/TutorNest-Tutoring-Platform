import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Star, TrendingUp, MessageSquare, AlertTriangle } from 'lucide-react';
import { ReviewsList } from './ReviewsList';
import { DisputeManager } from './DisputeManager';
import { projectId } from '../utils/supabase/info';

interface TutorReviewsTabProps {
  accessToken: string;
  tutorId: string;
}

export function TutorReviewsTab({ accessToken, tutorId }: TutorReviewsTabProps) {
  const [ratingData, setRatingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatingData();
  }, []);

  const loadRatingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor/${tutorId}/rating`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setRatingData(data);
      }
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Rating</CardTitle>
            <CardDescription>Your average rating from all reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl" style={{ color: '#625d9c' }}>
                    {ratingData?.averageRating?.toFixed(1) || '0.0'}
                  </div>
                  <div>
                    {renderStars(ratingData?.averageRating || 0)}
                    <p className="text-sm text-gray-600 mt-1">
                      Based on {ratingData?.totalReviews || 0} review{ratingData?.totalReviews !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>Breakdown of your ratings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingData?.ratingDistribution?.[stars] || 0;
                  const total = ratingData?.totalReviews || 1;
                  const percentage = (count / total) * 100;

                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-sm w-8">{stars}★</span>
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: stars >= 4 ? '#5d9827' : stars >= 3 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews and Disputes */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Disputes</CardTitle>
          <CardDescription>
            Manage your reviews and respond to feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reviews">
            <TabsList className="mb-4">
              <TabsTrigger value="reviews">
                <MessageSquare className="w-4 h-4 mr-2" />
                All Reviews
              </TabsTrigger>
              <TabsTrigger value="disputes">
                <AlertTriangle className="w-4 h-4 mr-2" />
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
