import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { formatNaira } from '../utils/currency';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PostSessionReport } from './PostSessionReport';
import { ViewSessionReport } from './ViewSessionReport';
import { parentAPI } from '../utils/api-client';
import { useRealtimeBookings, WebSocketEvents } from '../hooks/useWebSocket';
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Video,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Ban,
  FileText,
  BookOpen,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface BookingManagerProps {
  session: any;
  userRole: 'parent' | 'tutor';
  userId: string;
  studentId?: string; // filter bookings to a specific child
}

interface Booking {
  id: string;
  tutorId: string;
  studentId: string;
  parentId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  tutorName: string;
  studentName: string;
  subject?: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: string;
  googleMeetLink?: string;
}

export function BookingManager({ session, userRole, userId, studentId }: BookingManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPostReport, setShowPostReport] = useState<Booking | null>(null);
  const [showViewReport, setShowViewReport] = useState<Booking | null>(null);
  const [bookingReports, setBookingReports] = useState<Record<string, any>>({});

  // Real-time updates via WebSocket
  const handleRealtimeUpdate = (type: string, data: unknown) => {
    switch (type) {
      case WebSocketEvents.BOOKING_CREATED:
        setSuccess('New booking created');
        fetchBookings();
        break;

      case WebSocketEvents.BOOKING_CONFIRMED:
        setSuccess('Booking confirmed');
        fetchBookings();
        break;

      case WebSocketEvents.BOOKING_CANCELLED:
        setSuccess('Booking cancelled');
        fetchBookings();
        break;

      case WebSocketEvents.BOOKING_UPDATED:
        setSuccess('Booking updated');
        fetchBookings();
        break;

      case WebSocketEvents.REPORT_SUBMITTED:
        setSuccess('Session report submitted by tutor');
        fetchBookings();
        break;

      default:
        break;
    }
  };

  const { isConnected } = useRealtimeBookings(studentId || userId, session.access_token, handleRealtimeUpdate);

  useEffect(() => {
    fetchBookings();
  }, [studentId]);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');

    try {
      // Use API client instead of hardcoded fetch
      const bookingsList = await parentAPI.getBookings(session.access_token, studentId || '');
      setBookings(bookingsList);

      // Fetch reports for all bookings at once (batch instead of individual)
      const bookingIds = bookingsList.map((b: Booking) => b.id);
      
      if (bookingIds.length > 0) {
        try {
          const reportsData = await parentAPI.getBookingReports(session.access_token, bookingIds);
          setBookingReports(reportsData);
        } catch (err) {
          console.error('Error fetching reports:', err);
          // Don't fail completely if reports can't load - bookings are still visible
        }
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canCancel = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking > 24 && booking.status === 'confirmed';
  };

  const canReschedule = (booking: Booking) => {
    return canCancel(booking);
  };

  const calculateRefund = async (booking: Booking): Promise<{ amount: string; percentage: number } | null> => {
    try {
      const refundData = await parentAPI.calculateRefund(session.access_token, booking.id);
      return {
        amount: refundData.refundAmount.toFixed(2),
        percentage: refundData.refundPercentage,
      };
    } catch (err) {
      console.error('Error calculating refund:', err);
      return null;
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setCancelling(true);
    setError('');

    try {
      // Get refund info from backend before cancelling
      const refundData = await parentAPI.calculateRefund(session.access_token, selectedBooking.id);
      
      // Show confirmation with actual refund amount
      const confirmed = window.confirm(
        `Are you sure you want to cancel this booking?\n\nRefund Amount: ₦${refundData.refundAmount.toFixed(2)} (${refundData.refundPercentage}%)`
      );
      
      if (!confirmed) {
        setCancelling(false);
        return;
      }

      // Cancel the booking (backend handles refund calculation)
      const response = await parentAPI.cancelBooking(
        session.access_token,
        selectedBooking.id,
        'Cancelled by parent'
      );

      if (response.success) {
        setSuccess(`Booking cancelled successfully. Refund of ₦${response.refundAmount.toFixed(2)} will be processed shortly.`);
        setShowCancelConfirm(false);
        setSelectedBooking(null);
        await fetchBookings();
      } else {
        throw new Error('Failed to cancel booking');
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      setError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'rescheduled':
        return <Badge variant="outline">Rescheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(`${b.date}T${b.startTime}`) > new Date()
  );

  const pastBookings = bookings.filter(
    (b) => b.status === 'completed' || 
           b.status === 'cancelled' || 
           new Date(`${b.date}T${b.startTime}`) < new Date()
  );

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            {/* Primary: name + status */}
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">
                {userRole === 'parent' ? booking.tutorName : booking.studentName}
              </h3>
              {getStatusBadge(booking.status)}
            </div>
            {/* Subject — immediately below the name */}
            {booking.subject && (
              <div className="mb-3">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: '#f0edfb', color: '#625d9c' }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {booking.subject}
                </span>
              </div>
            )}
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(booking.date)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {formatNaira(parseFloat(booking.price || '20000'))}
              </div>
            </div>
          </div>
        </div>

        {booking.status === 'confirmed' && (
          <div className="space-y-2 mt-4">
            {/* Enter Classroom — links to the stored meet/Jitsi URL */}
            {booking.googleMeetLink ? (
              <a
                href={booking.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  className="w-full text-white"
                  style={{ backgroundColor: '#5d9827' }}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Enter Classroom
                </Button>
              </a>
            ) : (
              <Button className="w-full" variant="outline" disabled>
                <Video className="w-4 h-4 mr-2" />
                Classroom link not yet available
              </Button>
            )}

            <div className="flex gap-2">
              {canReschedule(booking) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSuccess('Rescheduling feature coming soon!');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reschedule
                </Button>
              )}
              {canCancel(booking) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowCancelConfirm(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              {!canCancel(booking) && !canReschedule(booking) && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    Cannot cancel within 24 hours of lesson
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Virtual classroom link info */}
            {booking.googleMeetLink && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <Video className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">Virtual Classroom Ready</p>
                    <p className="text-xs text-blue-600 mt-1 font-mono break-all">
                      {booking.googleMeetLink}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {booking.status === 'cancelled' && booking.refundAmount && (
          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Refund: {formatNaira(parseFloat(booking.refundAmount!))}
            </AlertDescription>
          </Alert>
        )}

        {/* POST-SESSION REPORTS - Show for past sessions */}
        {new Date(`${booking.date}T${booking.endTime}`) < new Date() && (
          <div className="space-y-2 mt-4">
            {/* For Tutors: Submit Report button (only for past sessions) */}
            {userRole === 'tutor' && (
              <Button
                onClick={() => setShowPostReport(booking)}
                variant="outline"
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                {bookingReports[booking.id] ? 'Edit Session Report' : 'Submit Session Report'}
              </Button>
            )}

            {/* For Parents: View Report button (only if report exists) */}
            {userRole === 'parent' && bookingReports[booking.id] && (
              <Button
                onClick={() => setShowViewReport(booking)}
                variant="outline"
                className="w-full"
                style={{ borderColor: '#625d9c', color: '#625d9c' }}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Session Report
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading bookings...</p>
        </CardContent>
      </Card>
    );
  }

  if (showCancelConfirm && selectedBooking) {
    const refundAmount = calculateRefund(selectedBooking);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cancel Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Are you sure you want to cancel this booking?
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Date & Time</p>
              <p className="text-gray-700">
                {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.startTime)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Refund Amount</p>
              <p className="text-gray-700">{formatNaira(parseFloat(refundAmount))}</p>
              <p className="text-xs text-gray-500 mt-1">
                {parseFloat(refundAmount) === parseFloat(selectedBooking.price)
                  ? 'Full refund (cancelled more than 24 hours in advance)'
                  : 'Partial refund (50% - cancelled within 24 hours)'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelConfirm(false);
                setSelectedBooking(null);
              }}
              className="h-12"
            >
              Keep Booking
            </Button>
            <Button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="h-12 text-white bg-red-600 hover:bg-red-700"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPostReport) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setShowPostReport(null)}
          className="mb-4"
        >
          ← Back to Bookings
        </Button>
        <PostSessionReport
          session={session}
          bookingId={showPostReport.id}
          userRole={userRole}
          studentName={showPostReport.studentName}
          tutorName={showPostReport.tutorName}
          startTime={showPostReport.startTime}
          endTime={showPostReport.endTime}
          onReportSubmit={(report) => {
            setBookingReports(prev => ({
              ...prev,
              [showPostReport.id]: report
            }));
            setShowPostReport(null);
          }}
        />
      </div>
    );
  }

  if (showViewReport) {
    const report = bookingReports[showViewReport.id];
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setShowViewReport(null)}
          className="mb-4"
        >
          ← Back to Bookings
        </Button>
        <ViewSessionReport
          session={session}
          bookingId={showViewReport.id}
          userRole={userRole}
          studentName={showViewReport.studentName}
          tutorName={showViewReport.tutorName}
          startTime={showViewReport.startTime}
          endTime={showViewReport.endTime}
          report={report}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No upcoming bookings</p>
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-4">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No past bookings</p>
              </CardContent>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Connection Status Indicator */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="w-3 h-3 text-green-600" />
            <span>Real-time updates active</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-gray-400" />
            <span>Connecting...</span>
          </>
        )}
      </div>
      </div>
    </div>
  );
}