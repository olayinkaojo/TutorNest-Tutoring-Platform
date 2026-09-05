import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Star, MessageSquare, AlertTriangle, CheckCircle, Pencil, Trash2, ThumbsUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { ReviewReplyDialog } from './ReviewReplyDialog';

interface Review {
  id: string;
  sessionId: string;
  tutorId: string;
  parentId: string;
  studentId: string | null;
  rating: number;
  comment: string;
  tutorName?: string;
  studentName?: string;
  subject?: string;
  sessionDate?: string;
  createdAt: string;
  updatedAt?: string;
  flagged: boolean;
  profanityDetected: boolean;
  resolved: boolean;
  reply: {
    tutorId: string;
    tutorName?: string;
    text: string;
    createdAt: string;
    updatedAt?: string;
    flagged: boolean;
  } | null;
}

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';

interface ReviewsListProps {
  tutorId?: string;
  parentId?: string;
  accessToken: string;
  userRole: 'parent' | 'tutor' | 'admin';
  currentUserId?: string;
  onDelete?: (reviewId: string) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

export function ReviewsList({
  tutorId,
  parentId,
  accessToken,
  userRole,
  currentUserId,
  onDelete,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('newest');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [showEditReplyDialog, setShowEditReplyDialog] = useState(false);
  const [editingReplyText, setEditingReplyText] = useState('');
  const [editingReply, setEditingReply] = useState(false);
  const [flagDialogReview, setFlagDialogReview] = useState<Review | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [deleteConfirmReview, setDeleteConfirmReview] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [tutorId, parentId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      let url = `${BASE}/reviews?`;
      if (tutorId) url += `tutorId=${tutorId}`;
      else if (parentId) url += `parentId=${parentId}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (res.ok) setReviews(data.reviews || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...reviews].sort((a, b) => {
    if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'highest') return b.rating - a.rating;
    if (sort === 'lowest') return a.rating - b.rating;
    return 0;
  });

  const handleFlag = async () => {
    if (!flagDialogReview || !flagReason.trim()) return;
    setFlagging(true);
    try {
      const res = await fetch(`${BASE}/reviews/${flagDialogReview.id}/flag`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: flagReason.trim() }),
      });
      if (res.ok) {
        toast.success('Review flagged for admin review');
        setFlagDialogReview(null);
        setFlagReason('');
        loadReviews();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to flag review');
      }
    } catch {
      toast.error('Failed to flag review');
    } finally {
      setFlagging(false);
    }
  };

  const handleEditReplySubmit = async () => {
    if (!selectedReview || !editingReplyText.trim()) return;
    setEditingReply(true);
    try {
      const res = await fetch(`${BASE}/reviews/${selectedReview.id}/reply`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: editingReplyText.trim() }),
      });
      if (res.ok) {
        toast.success('Reply updated');
        setShowEditReplyDialog(false);
        setSelectedReview(null);
        setEditingReplyText('');
        loadReviews();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to update reply');
      }
    } catch {
      toast.error('Failed to update reply');
    } finally {
      setEditingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmReview) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/reviews/${deleteConfirmReview.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        toast.success('Review deleted');
        setDeleteConfirmReview(null);
        onDelete?.(deleteConfirmReview.id);
        loadReviews();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to delete review');
      }
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  const renderStars = (rating: number, size = 'sm') => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} ${
            s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canDeleteReview = (review: Review) => {
    if (userRole !== 'parent') return false;
    if (review.parentId !== currentUserId) return false;
    const ageHours = (Date.now() - new Date(review.createdAt).getTime()) / 3_600_000;
    return ageHours <= 24;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading reviews…</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-medium text-gray-500 mb-1">No reviews yet</p>
        <p className="text-sm text-gray-400">Reviews will appear here after sessions are completed</p>
      </div>
    );
  }

  return (
    <>
      {/* Sort control */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="highest">Highest rated</SelectItem>
            <SelectItem value="lowest">Lowest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {sorted.map((review) => (
          <Card key={review.id} className={`transition-all ${review.flagged ? 'border-orange-200 bg-orange-50/30' : ''}`}>
            <CardContent className="pt-5 pb-5">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  {(review.studentPhoto || review.parentPhoto) && (
                    <AvatarImage src={review.studentPhoto || review.parentPhoto} className="object-cover" />
                  )}
                  <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }} className="text-sm font-semibold">
                    {getInitials(review.studentName || 'Parent')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {review.studentName || 'A student'}
                    </span>
                    {review.subject && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {review.subject}
                      </Badge>
                    )}
                    {review.resolved && (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-300 px-2 py-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                    {review.flagged && (
                      <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 px-2 py-0">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Under Review
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {renderStars(review.rating)}
                    <span className="text-xs font-medium text-gray-600">{RATING_LABELS[review.rating]}</span>
                    <span className="text-xs text-gray-400">
                      {review.sessionDate
                        ? `Session on ${new Date(`${review.sessionDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {userRole === 'tutor' && currentUserId === review.tutorId && !review.reply && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowReplyDialog(true);
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Reply
                    </Button>
                  )}
                  {userRole === 'tutor' && currentUserId === review.tutorId && review.reply && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-gray-500"
                      onClick={() => {
                        setSelectedReview(review);
                        setEditingReplyText(review.reply!.text);
                        setShowEditReplyDialog(true);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit reply
                    </Button>
                  )}
                  {userRole === 'tutor' && currentUserId === review.tutorId && !review.flagged && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-gray-400 hover:text-orange-600"
                      onClick={() => setFlagDialogReview(review)}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Flag
                    </Button>
                  )}
                  {canDeleteReview(review) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-gray-400 hover:text-red-600"
                      onClick={() => setDeleteConfirmReview(review)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Comment */}
              {review.comment ? (
                <p className="text-sm text-gray-700 leading-relaxed ml-[52px]">{review.comment}</p>
              ) : (
                <p className="text-sm text-gray-400 italic ml-[52px]">No written comment</p>
              )}

              {/* Tutor reply */}
              {review.reply && (
                <div className="mt-4 ml-[52px] pl-4 border-l-2 border-purple-200 bg-purple-50/50 rounded-r-lg py-3 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-6 h-6">
                      {review.tutorPhoto && <AvatarImage src={review.tutorPhoto} className="object-cover" />}
                      <AvatarFallback style={{ backgroundColor: '#5d9827', color: 'white' }} className="text-xs">
                        {getInitials(review.reply.tutorName || review.tutorName || 'T')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-gray-700">
                      {review.reply.tutorName || review.tutorName || 'Tutor'} replied
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.reply.updatedAt || review.reply.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {review.reply.updatedAt && (
                      <span className="text-xs text-gray-400 italic">(edited)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 ml-8">{review.reply.text}</p>
                </div>
              )}

              {/* Helpful count placeholder for future */}
              <div className="mt-3 ml-[52px] flex items-center gap-2">
                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <ThumbsUp className="w-3 h-3" />
                  Helpful
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply dialog */}
      {selectedReview && showReplyDialog && (
        <ReviewReplyDialog
          review={selectedReview}
          open={showReplyDialog}
          onClose={() => { setShowReplyDialog(false); setSelectedReview(null); }}
          onSuccess={() => { loadReviews(); setShowReplyDialog(false); setSelectedReview(null); }}
          accessToken={accessToken}
          tutorId={currentUserId || ''}
        />
      )}

      {/* Edit reply dialog */}
      <Dialog open={showEditReplyDialog} onOpenChange={(o) => { if (!o) { setShowEditReplyDialog(false); setSelectedReview(null); setEditingReplyText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Your Reply</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            {selectedReview && (
              <div className="p-3 bg-gray-50 rounded-lg">
                {renderStars(selectedReview.rating)}
                {selectedReview.comment && (
                  <p className="text-sm text-gray-700 mt-2">{selectedReview.comment}</p>
                )}
              </div>
            )}
            <Textarea
              value={editingReplyText}
              onChange={(e) => setEditingReplyText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Update your response…"
            />
            <p className="text-xs text-gray-400 text-right">{editingReplyText.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditReplyDialog(false); setSelectedReview(null); setEditingReplyText(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleEditReplySubmit}
              disabled={editingReply || !editingReplyText.trim()}
              className="text-white"
              style={{ backgroundColor: '#5d9827' }}
            >
              {editingReply ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag dialog */}
      <Dialog open={!!flagDialogReview} onOpenChange={(o) => { if (!o) { setFlagDialogReview(null); setFlagReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Flag This Review</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-gray-600">
              Flagged reviews are sent to our moderation team. Please provide a reason.
            </p>
            {flagDialogReview && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                {renderStars(flagDialogReview.rating)}
                {flagDialogReview.comment && <p className="mt-2">{flagDialogReview.comment}</p>}
              </div>
            )}
            <Textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Why are you flagging this review? (e.g. fake, abusive content…)"
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-gray-400 text-right">{flagReason.length}/300</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFlagDialogReview(null); setFlagReason(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleFlag}
              disabled={flagging || !flagReason.trim()}
              className="text-white bg-orange-500 hover:bg-orange-600"
            >
              {flagging ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Flagging…</> : 'Submit Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmReview} onOpenChange={(o) => { if (!o) setDeleteConfirmReview(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Review?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            This will permanently remove your review. You can only delete within 24 hours of submission.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmReview(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
