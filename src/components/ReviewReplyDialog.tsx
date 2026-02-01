import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { AlertCircle, Star } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface ReviewReplyDialogProps {
  review: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string;
  tutorId: string;
}

export function ReviewReplyDialog({ review, open, onClose, onSuccess, accessToken, tutorId }: ReviewReplyDialogProps) {
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [profanityWarning, setProfanityWarning] = useState('');

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      setError('Please enter a reply');
      return;
    }

    setSubmitting(true);
    setError('');
    setProfanityWarning('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/reviews/${review.id}/reply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tutorId,
            replyText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit reply');
      }

      if (data.warning) {
        setProfanityWarning(data.warning);
      }

      // Success
      setTimeout(() => {
        onSuccess();
        onClose();
        setReplyText('');
        setProfanityWarning('');
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting reply:', err);
      setError(err.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reply to Review</DialogTitle>
          <DialogDescription>
            Respond professionally to address the parent's feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Review */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              {renderStars(review.rating)}
              <span className="text-xs text-gray-500">
                {new Date(review.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>
            {review.comment && (
              <p className="text-sm text-gray-700">{review.comment}</p>
            )}
          </div>

          {/* Reply Input */}
          <div>
            <label className="text-sm mb-2 block">
              Your Response
            </label>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank you for your feedback..."
              rows={5}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {replyText.length}/500 characters
            </p>
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Tips:</strong> Be professional, acknowledge their feedback, and explain any actions you're taking to improve.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Profanity Warning */}
          {profanityWarning && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">{profanityWarning}</p>
            </div>
          )}

          {/* Success Message */}
          {submitting === false && profanityWarning && !error && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-700">Reply submitted successfully!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !replyText.trim()}
            className="text-white"
            style={{ backgroundColor: '#5d9827' }}
          >
            {submitting ? 'Submitting...' : 'Post Reply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
