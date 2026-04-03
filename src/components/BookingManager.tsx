import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { formatNaira } from '../utils/currency';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { VirtualClassroom } from './VirtualClassroom';
import { PostSessionReport } from './PostSessionReport';
import { ViewSessionReport } from './ViewSessionReport';
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
  FileText
} from 'lucide-react';

interface BookingManagerProps {
  session: any;
  userRole: 'parent' | 'tutor';
  userId: string;
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
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: string;
  googleMeetLink?: string;
}

export function BookingManager({ session, userRole, userId }: BookingManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showClassroom, setShowClassroom] = useState<Booking | null>(null);
  const [showPostReport, setShowPostReport] = useState<Booking | null>(null);
  const [showViewReport, setShowViewReport] = useState<Booking | null>(null);
  const [bookingReports, setBookingReports] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchBookings();
    
    // Poll for booking updates every 30 seconds
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data.bookings || []);

      // Fetch reports for each booking
      const reportsPromises = (data.bookings || []).map(async (booking: Booking) => {
        try {
          const reportResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings/${booking.id}/report`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
          if (reportResponse.ok) {
            const reportData = await reportResponse.json();
            return { bookingId: booking.id, report: reportData.report };
          }
        } catch (err) {
          console.error('Error fetching report for booking:', booking.id, err);
        }
        return null;
      });

      const reportsResults = await Promise.all(reportsPromises);
      const reports: Record<string, any> = {};
      reportsResults.forEach((result) => {
        if (result && result.report) {
          reports[result.bookingId] = result.report;
        }
      });
      setBookingReports(reports);
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

  const calculateRefund = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    const price = parseFloat(booking.price);
    
    if (hoursUntilBooking > 24) {
      return price.toFixed(2); // 100% refund
    } else if (hoursUntilBooking > 0) {
      return (price * 0.5).toFixed(2); // 50% refund
    } else {
      return '0.00'; // No refund
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setCancelling(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings/${selectedBooking.id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      setSuccess('Booking cancelled successfully. Refund will be processed shortly.');
      setShowCancelConfirm(false);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      setError(err.message);
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
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg">
                {userRole === 'parent' ? booking.tutorName : booking.studentName}
              </h3>
              {getStatusBadge(booking.status)}
            </div>
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
                {formatNaira(parseFloat(booking.price))}
              </div>
            </div>
          </div>
        </div>

        {booking.status === 'confirmed' && (
          <div className="space-y-2 mt-4">
            {/* Enter Classroom Button - Always visible for confirmed bookings */}
            {booking.googleMeetLink && (
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
            )}
            
            {/* Alternative Virtual Classroom Button */}
            <Button
              onClick={() => setShowClassroom(booking)}
              variant="outline"
              className="w-full"
            >
              <Video className="w-4 h-4 mr-2" />
              Open Virtual Classroom
            </Button>

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

            {/* Display Google Meet link info */}
            {booking.googleMeetLink && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Video className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">Google Meet Ready</p>
                    <p className="text-xs text-green-700 mt-1">
                      Click "Enter Classroom" to join the video session
                    </p>
                    <p className="text-xs text-green-600 mt-1 font-mono break-all">
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

  if (showClassroom) {
    const startDateTime = `${showClassroom.date}T${showClassroom.startTime}`;
    const endDateTime = `${showClassroom.date}T${showClassroom.endTime}`;

    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setShowClassroom(null)}
          className="mb-4"
        >
          ← Back to Bookings
        </Button>
        <VirtualClassroom
          session={session}
          bookingId={showClassroom.id}
          userRole={userRole}
          studentName={showClassroom.studentName}
          tutorName={showClassroom.tutorName}
          startTime={startDateTime}
          endTime={endDateTime}
        />
      </div>
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
    </div>
  );
}