import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Star, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { ReviewReplyDialog } from './ReviewReplyDialog';

interface Review {
  id: string;
  sessionId: string;
  tutorId: string;
  parentId: string;
  rating: number;
  comment: string;
  createdAt: string;
  flagged: boolean;
  profanityDetected: boolean;
  resolved: boolean;
  reply: {
    tutorId: string;
    text: string;
    createdAt: string;
    flagged: boolean;
  } | null;
}

interface ReviewsListProps {
  tutorId?: string;
  parentId?: string;
  accessToken: string;
  userRole: 'parent' | 'tutor' | 'admin';
  currentUserId?: string;
}

export function ReviewsList({ tutorId, parentId, accessToken, userRole, currentUserId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReplyDialog, setShowReplyDialog] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [tutorId, parentId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/reviews?`;
      if (tutorId) url += `tutorId=${tutorId}`;
      if (parentId) url += `parentId=${parentId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (review: Review) => {
    setSelectedReview(review);
    setShowReplyDialog(true);
  };

  const handleFlagReview = async (reviewId: string) => {
    const reason = prompt('Please provide a reason for flagging this review:');
    if (!reason) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/reviews/${reviewId}/flag`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        alert('Review flagged for admin review');
        loadReviews();
      }
    } catch (error) {
      console.error('Error flagging review:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading reviews...
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No reviews yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                      P
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(review.rating)}
                      {review.resolved && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                      {review.flagged && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                {userRole === 'tutor' && currentUserId === review.tutorId && !review.reply && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReply(review)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                )}
                {userRole === 'tutor' && currentUserId === review.tutorId && !review.flagged && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFlagReview(review.id)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Flag
                  </Button>
                )}
              </div>

              {review.comment && (
                <p className="text-gray-700 mb-4">{review.comment}</p>
              )}

              {review.profanityDetected && userRole === 'admin' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⚠️ This review was flagged for potential profanity
                  </p>
                </div>
              )}

              {/* Tutor Reply */}
              {review.reply && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback style={{ backgroundColor: '#5d9827', color: 'white' }}>
                        T
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">Tutor Response</span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.reply.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.reply.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply Dialog */}
      {selectedReview && (
        <ReviewReplyDialog
          review={selectedReview}
          open={showReplyDialog}
          onClose={() => {
            setShowReplyDialog(false);
            setSelectedReview(null);
          }}
          onSuccess={() => {
            loadReviews();
            setShowReplyDialog(false);
            setSelectedReview(null);
          }}
          accessToken={accessToken}
          tutorId={currentUserId || ''}
        />
      )}
    </>
  );
}
