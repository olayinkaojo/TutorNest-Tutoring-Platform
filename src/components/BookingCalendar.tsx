import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar } from './ui/calendar';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  Calendar as CalendarIcon,
  User
} from 'lucide-react';

interface BookingCalendarProps {
  session: any;
  tutorId: string;
  tutorProfile: any;
  studentId: string;
  onBookingComplete?: () => void;
}

interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export function BookingCalendar({ 
  session, 
  tutorId, 
  tutorProfile, 
  studentId,
  onBookingComplete 
}: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  useEffect(() => {
    checkGoogleCalendarStatus();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const checkGoogleCalendarStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/google-calendar/status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGoogleCalendarConnected(data.connected);
      }
    } catch (err) {
      console.error('Error checking Google Calendar status:', err);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    setLoading(true);
    setError('');

    try {
      const dateString = date.toISOString().split('T')[0];
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/availability/${tutorId}/slots?date=${dateString}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (err: any) {
      console.error('Error fetching slots:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
      setShowConfirmation(true);
    }
  };

  const calculatePrice = () => {
    if (!selectedSlot) return 0;
    const hourlyRate = parseFloat(tutorProfile.hourlyRate || '0');
    const start = new Date(`2000-01-01T${selectedSlot.startTime}`);
    const end = new Date(`2000-01-01T${selectedSlot.endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return (hourlyRate * hours).toFixed(2);
  };

  const handleBooking = async () => {
    if (!selectedSlot) return;

    setBooking(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tutorId,
            studentId,
            date: selectedSlot.date,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            price: calculatePrice(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      const data = await response.json();
      setSuccess('Booking confirmed! You will receive a confirmation email shortly.');
      setShowConfirmation(false);
      setSelectedSlot(null);
      
      // Refresh available slots
      if (selectedDate) {
        await fetchAvailableSlots(selectedDate);
      }

      if (onBookingComplete) {
        onBookingComplete();
      }
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message);
    } finally {
      setBooking(false);
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

      {googleCalendarConnected && !showConfirmation && (
        <Alert className="bg-blue-50 border-blue-200">
          <CalendarIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Google Calendar Sync Active:</strong> Your booking will be automatically added to your Google Calendar with a Meet link for the virtual classroom.
          </AlertDescription>
        </Alert>
      )}

      {!showConfirmation ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Available Slots */}
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
              {selectedDate && (
                <p className="text-sm text-gray-600">
                  {selectedDate.toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Clock className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#625d9c' }} />
                  <p className="text-gray-600">Loading slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No available slots for this date</p>
                  <p className="text-sm mt-2">Try selecting a different day</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={slot.available ? 'outline' : 'ghost'}
                      disabled={!slot.available}
                      onClick={() => handleSlotSelect(slot)}
                      className="w-full justify-between h-auto py-3"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                      {slot.available ? (
                        <Badge variant="secondary" style={{ backgroundColor: '#5d9827', color: 'white' }}>
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Booked</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Please review your booking details before confirming
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 mt-0.5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Tutor</p>
                  <p className="text-gray-700">
                    {tutorProfile.firstName} {tutorProfile.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <CalendarIcon className="w-5 h-5 mt-0.5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Date & Time</p>
                  <p className="text-gray-700">
                    {selectedSlot && formatDate(selectedSlot.date)}
                  </p>
                  <p className="text-gray-700">
                    {selectedSlot && `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <DollarSign className="w-5 h-5 mt-0.5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p className="text-gray-700">£{calculatePrice()}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    £{tutorProfile.hourlyRate}/hour
                  </p>
                </div>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Cancellation Policy:</strong> You can cancel or reschedule up to 24 hours before 
                the lesson for a full refund. Cancellations within 24 hours will incur a 50% fee.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedSlot(null);
                }}
                className="h-12"
              >
                Back
              </Button>
              <Button
                onClick={handleBooking}
                disabled={booking}
                className="h-12 text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                {booking ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm & Pay £{calculatePrice()}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              By confirming, you agree to our Terms of Service and Cancellation Policy
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}