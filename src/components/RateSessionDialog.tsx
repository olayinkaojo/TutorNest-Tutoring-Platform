import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Star, CheckCircle, AlertCircle, BookOpen, Calendar, User } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface RateSessionDialogProps {
  session: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string;
  parentId: string;
}

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Poor', color: 'text-red-500' },
  2: { label: 'Fair', color: 'text-orange-500' },
  3: { label: 'Good', color: 'text-yellow-500' },
  4: { label: 'Very Good', color: 'text-blue-500' },
  5: { label: 'Excellent!', color: 'text-green-600' },
};

export function RateSessionDialog({ session, open, onClose, onSuccess, accessToken, parentId }: RateSessionDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const displayRating = hoveredRating || rating;

  const handleClose = () => {
    if (submitting) return;
    setRating(0);
    setHoveredRating(0);
    setComment('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a star rating'); return; }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.id,
            tutorId: session.tutorId,
            parentId: parentId || session.parentId || session.userId,
            studentId: session.studentId,
            rating,
            comment: comment.trim(),
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const sessionSubject = session?.notes || session?.subject || 'Tutoring Session';
  const sessionDate = session?.date
    ? new Date(`${session.date}T12:00:00`).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {submitted ? 'Review Submitted!' : `Rate Session with ${session?.tutorName || 'Tutor'}`}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          // Success state
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Thank you for your feedback!</p>
            <p className="text-sm text-gray-500">Your review helps other families find great tutors.</p>
            <div className="flex gap-0.5 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-7 h-7 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Session context card */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium">{session?.tutorName || 'Tutor'}</span>
                {session?.studentName && (
                  <span className="text-gray-500">· for {session.studentName}</span>
                )}
              </div>
              {sessionSubject && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{sessionSubject}</span>
                </div>
              )}
              {sessionDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{sessionDate}</span>
                </div>
              )}
            </div>

            {/* Star rating */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-gray-700">How was the session?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= displayRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-200 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {displayRating > 0 && (
                <p className={`text-sm font-semibold ${RATING_LABELS[displayRating].color}`}>
                  {RATING_LABELS[displayRating].label}
                </p>
              )}
              {displayRating === 0 && (
                <p className="text-sm text-gray-400">Tap a star to rate</p>
              )}
            </div>

            {/* Comment */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Comments <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <span className="text-xs text-gray-400">{comment.length}/500</span>
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Share what made this session ${displayRating >= 4 ? 'great' : 'memorable'}…`}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                Your honest feedback helps improve the quality of tutoring for everyone.
              </p>
            </div>

            {/* Progress bar for comment */}
            {comment.length > 0 && (
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all rounded-full"
                  style={{ width: `${(comment.length / 500) * 100}%` }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {!submitted && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="text-white min-w-[120px]"
              style={{ backgroundColor: '#625d9c' }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                'Submit Review'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
