import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CreditCard, Calendar, User, Clock, BookOpen, CheckCircle, Loader2 } from 'lucide-react';
import { PaymentProcessor } from './PaymentProcessor';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface BookSessionWithPaymentProps {
  session: any;
  booking: {
    id?: string;
    tutorId: string;
    tutorName: string;
    studentId: string;
    studentName: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    subject: string;
    amount: number;
    notes?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BookSessionWithPayment({
  session,
  booking,
  onSuccess,
  onCancel,
}: BookSessionWithPaymentProps) {
  const [currentStep, setCurrentStep] = useState<'review' | 'payment'>('review');
  const [bookingId, setBookingId] = useState(booking.id || '');
  const [creating, setCreating] = useState(false);

  const createBooking = async () => {
    setCreating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tutorId: booking.tutorId,
            studentId: booking.studentId,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            duration: booking.duration,
            subject: booking.subject,
            price: booking.amount,
            notes: booking.notes,
            status: 'pending_payment',
          }),
        }
      );

      const data = await response.json();

      if (data.booking?.id) {
        setBookingId(data.booking.id);
        setCurrentStep('payment');
      } else {
        throw new Error(data.error || 'Failed to create booking');
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setCreating(false);
    }
  };

  const handlePaymentSuccess = (payment: any) => {
    toast.success('Payment successful! Your session is confirmed.');
    onSuccess?.();
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Tutoring Session</DialogTitle>
          <DialogDescription>
            Review your booking details and complete payment
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="review" disabled>
              1. Review Booking
            </TabsTrigger>
            <TabsTrigger value="payment" disabled={!bookingId}>
              2. Payment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tutor</p>
                    <p>{booking.tutorName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Student</p>
                    <p>{booking.studentName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p>{booking.subject}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p>{new Date(booking.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                    <p className="text-sm text-muted-foreground">({booking.duration} minutes)</p>
                  </div>
                </div>

                {booking.notes && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{booking.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-[#625d9c]/20 bg-[#625d9c]/5">
              <CardHeader>
                <CardTitle className="text-base">Pricing Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session Fee</span>
                  <span>₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tutor Receives (80%)</span>
                  <span>₦{(booking.amount * 0.8).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee (20%)</span>
                  <span>₦{(booking.amount * 0.2).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>Total to Pay</span>
                    <span className="text-xl">₦{booking.amount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                After reviewing the details, you'll proceed to secure payment. Your session will be confirmed once payment is completed.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={createBooking} 
                disabled={creating}
                className="flex-1"
                style={{ background: '#625d9c' }}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Proceed to Payment
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4 mt-6">
            {bookingId && (
              <PaymentProcessor
                bookingId={bookingId}
                tutorId={booking.tutorId}
                studentId={booking.studentId}
                subject={booking.subject}
                amount={booking.amount}
                email={session.user?.email || ''}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                metadata={{
                  tutorName: booking.tutorName,
                  studentName: booking.studentName,
                  date: booking.date,
                  time: booking.startTime,
                }}
              />
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onCancel} className="w-full">
                Cancel Booking
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
