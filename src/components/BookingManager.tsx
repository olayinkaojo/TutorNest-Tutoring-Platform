import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { parseWAT, bookingDateLabel, formatRawTimeWAT, WAT_TIMEZONE, todayStringWAT } from '../utils/timezone';
import { formatNaira } from '../utils/currency';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
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
  Loader2,
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
  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

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
      let bookingsList: any[];

      if (userRole === 'tutor') {
        // Tutor role: only fetch sessions where this user is the tutor
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings?tutorId=${userId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const data = await response.json();
        bookingsList = data.bookings || [];
      } else {
        // Parent role: fetch bookings for the specific child (or all children)
        bookingsList = await parentAPI.getBookings(session.access_token, studentId || '');
      }

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
    const hoursUntilBooking = (parseWAT(booking.date, booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilBooking > 24 && booking.status === 'confirmed';
  };

  const canReschedule = (booking: Booking) => {
    return canCancel(booking);
  };

  const openReschedule = (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
    setError('');
  };

  const loadAvailableSlots = async (date: string) => {
    if (!rescheduleBooking) return;
    setLoadingSlots(true);
    setRescheduleTime('');
    setError('');
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/${rescheduleBooking.tutorId}/availability?date=${date}&studentId=${rescheduleBooking.studentId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRescheduleSlots(data.slots || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load available slots');
        setRescheduleSlots([]);
      }
    } catch (e: any) {
      console.error('Error loading slots', e);
      setError('Failed to load available slots. Please try again.');
      setRescheduleSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return;
    const [hh, mm] = rescheduleTime.split(':');
    const newEndTime = `${String(parseInt(hh) + 1).padStart(2, '0')}:${mm}`;
    setRescheduling(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings/${rescheduleBooking.id}/reschedule`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newDate: rescheduleDate, newStartTime: rescheduleTime, newEndTime }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSuccess('Booking rescheduled successfully');
        setRescheduleBooking(null);
        fetchBookings();
      } else {
        setError(data.error || 'Failed to reschedule booking');
      }
    } catch (e) {
      setError('Failed to reschedule booking');
    } finally {
      setRescheduling(false);
    }
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

  const formatTime = (time: string) => formatRawTimeWAT(time);

  const formatDate = (dateString: string) => {
    return new Date(`${dateString}T12:00:00+01:00`).toLocaleDateString('en-GB', {
      timeZone: WAT_TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
    (b) => b.status === 'confirmed' && parseWAT(b.date, b.startTime) > new Date()
  );

  const pastBookings = bookings.filter(
    (b) => b.status === 'completed' ||
           b.status === 'cancelled' ||
           parseWAT(b.date, b.startTime) < new Date()
  );

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const personName  = userRole === 'parent' ? booking.tutorName  : booking.studentName;
    const personLabel = userRole === 'parent' ? 'Your Tutor'       : 'Your Student';
    const initials    = personName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const isPast        = parseWAT(booking.date, booking.endTime  ) < new Date();
    const isUpcoming    = booking.status === 'confirmed' && parseWAT(booking.date, booking.startTime) > new Date();
    const hoursUntil    = (parseWAT(booking.date, booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
    const startingSoon  = isUpcoming && hoursUntil >= 0 && hoursUntil <= 2;
    const accentColor   = startingSoon ? '#5d9827' : '#625d9c';

    const statusStripe: Record<string, string> = {
      confirmed:   accentColor,
      completed:   '#6b7280',
      cancelled:   '#ef4444',
      rescheduled: '#f59e0b',
    };

    return (
      <Card className={`overflow-hidden transition-all hover:shadow-md ${startingSoon ? 'ring-2 ring-green-500 shadow-green-100' : ''}`}>
        {/* Status stripe */}
        <div className="h-1.5" style={{ backgroundColor: statusStripe[booking.status] ?? accentColor }} />

        <CardContent className="pt-5 pb-5">
          {/* ── Person header ── */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              {initials || <User className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                {personLabel}
              </p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight truncate">
                {personName}
              </h3>
              {/* Contextual sub-line */}
              {userRole === 'tutor' && booking.parentName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Booked by <span className="font-medium text-gray-700">{booking.parentName}</span>
                </p>
              )}
              {userRole === 'parent' && booking.studentName && booking.studentName !== booking.tutorName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Session for <span className="font-medium text-gray-700">{booking.studentName}</span>
                </p>
              )}
            </div>
            <div className="flex-shrink-0 pt-0.5">{getStatusBadge(booking.status)}</div>
          </div>

          {/* ── Subject pill ── */}
          {booking.subject && (
            <div className="mb-4">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: '#f0edfb', color: '#625d9c' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {booking.subject}
              </span>
            </div>
          )}

          {/* ── Stats strip ── */}
          <div className="grid grid-cols-3 gap-0 mb-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            <div className="py-3 px-2 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">{bookingDateLabel(booking.date)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(booking.date)}</p>
            </div>
            <div className="py-3 px-2 text-center border-x border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Time (WAT)</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">{formatTime(booking.startTime)}</p>
              <p className="text-xs text-gray-500 mt-0.5">– {booking.endTime}</p>
            </div>
            <div className="py-3 px-2 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fee</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">
                {formatNaira(parseFloat(booking.price || '20000'))}
              </p>
            </div>
          </div>

          {/* ── Starting-soon banner ── */}
          {startingSoon && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <p className="text-sm font-semibold text-green-800">
                Starting in {Math.max(1, Math.round(hoursUntil * 60))} minutes
              </p>
            </div>
          )}

          {/* ── Actions ── */}
          {booking.status === 'confirmed' && (
            <div className="space-y-2">
              {booking.googleMeetLink ? (
                <a href={booking.googleMeetLink} target="_blank" rel="noopener noreferrer" className="block">
                  <Button
                    className="w-full text-white font-semibold h-11"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {startingSoon ? 'Join Now — Session Starting!' : 'Enter Classroom'}
                  </Button>
                </a>
              ) : (
                <Button className="w-full h-11" variant="outline" disabled>
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
                    onClick={() => openReschedule(booking)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Reschedule
                  </Button>
                )}
                {canCancel(booking) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setSelectedBooking(booking); setShowCancelConfirm(true); }}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancel
                  </Button>
                )}
                {!canCancel(booking) && !canReschedule(booking) && (
                  <Alert className="bg-amber-50 border-amber-200 flex-1 py-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-xs">
                      Cannot cancel within 24 hours of lesson
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* ── Refund notice ── */}
          {booking.status === 'cancelled' && booking.refundAmount && (
            <Alert className="mt-3 bg-blue-50 border-blue-200">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Refund: {formatNaira(parseFloat(booking.refundAmount!))}
              </AlertDescription>
            </Alert>
          )}

          {/* ── Post-session reports ── */}
          {isPast && (
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
              {userRole === 'tutor' && (
                <Button onClick={() => setShowPostReport(booking)} variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  {bookingReports[booking.id] ? 'Edit Session Report' : 'Submit Session Report'}
                </Button>
              )}
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
  };

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
      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleBooking} onOpenChange={(open) => { if (!open) setRescheduleBooking(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" style={{ color: '#625d9c' }} />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Select a new date and time for your session with{' '}
              <strong>{rescheduleBooking?.tutorName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {rescheduleBooking && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                Current: <strong>{bookingDateLabel(rescheduleBooking.date)}</strong> at{' '}
                <strong>{formatRawTimeWAT(rescheduleBooking.startTime)}</strong>
              </div>
            )}
            <div>
              <Label htmlFor="reschedule-date">New Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                min={(() => {
                  const d = new Date(); d.setDate(d.getDate() + 2);
                  return d.toLocaleDateString('en-CA', { timeZone: WAT_TIMEZONE });
                })()}
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  if (e.target.value) loadAvailableSlots(e.target.value);
                }}
                className="mt-1"
              />
            </div>
            {loadingSlots && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking availability...
              </div>
            )}
            {rescheduleSlots.length > 0 && (
              <div>
                <Label>Available Time Slots (WAT)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {rescheduleSlots.filter(s => s.available).map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => setRescheduleTime(slot.time)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        rescheduleTime === slot.time
                          ? 'text-white border-transparent'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={rescheduleTime === slot.time ? { backgroundColor: '#625d9c' } : {}}
                    >
                      {slot.time}
                    </button>
                  ))}
                  {rescheduleSlots.filter(s => s.available).length === 0 && (
                    <p className="col-span-3 text-sm text-gray-500 text-center py-4">
                      No available slots on this date
                    </p>
                  )}
                </div>
              </div>
            )}
            {rescheduleDate && !loadingSlots && rescheduleSlots.length === 0 && (
              <p className="text-sm text-gray-500">No availability data for this date.</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRescheduleBooking(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ backgroundColor: '#625d9c' }}
                disabled={!rescheduleDate || !rescheduleTime || rescheduling}
                onClick={handleReschedule}
              >
                {rescheduling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rescheduling...</> : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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