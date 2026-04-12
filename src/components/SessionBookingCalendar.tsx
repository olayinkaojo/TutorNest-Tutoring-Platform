import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { projectId } from '../utils/supabase/info';
import { formatNaira } from '../utils/currency';
import { BookSessionWithPayment } from './BookSessionWithPayment';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Search,
  BookOpen,
  Video
} from 'lucide-react';

interface SessionBookingCalendarProps {
  session: any;
  activeChildId: string;
  childName?: string;
}

interface Tutor {
  id: string;
  name: string;
  subjects: string[];
  hourlyRate: number;
  availability?: any;
}

interface TimeSlot {
  time: string;
  available: boolean;
  blocked?: boolean;
}

export function SessionBookingCalendar({ 
  session, 
  activeChildId,
  childName 
}: SessionBookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTutor, setSelectedTutor] = useState<string>('');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<string>('60');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentPlans, setShowPaymentPlans] = useState(false);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTutors();
  }, []);

  const isTutorVerified = (tutor: any) => {
    const verificationStatus = String(tutor.verificationStatus || '').toLowerCase();
    if (verificationStatus === 'verified') return true;

    // Some payloads may expose boolean verification fields instead.
    return tutor.isVerified === true || tutor.verified === true;
  };

  const normalizeTutors = (rawTutors: any[]): Tutor[] => {
    return (rawTutors || [])
      .filter((tutor: any) => isTutorVerified(tutor))
      .map((tutor: any) => {
        const id = tutor.id || tutor.userId;
        if (!id) return null;

        const name =
          tutor.name ||
          tutor.fullName ||
          `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() ||
          'Unknown Tutor';

        return {
          id,
          name,
          subjects: tutor.subjects || [],
          hourlyRate: Number(tutor.hourlyRate || 25),
          availability: tutor.availability,
        };
      })
      .filter(Boolean) as Tutor[];
  };

  useEffect(() => {
    if (selectedDate && selectedTutor) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedTutor]);

  const fetchTutors = async () => {
    setLoadingTutors(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const normalized = normalizeTutors(data.tutors || []);

        if (normalized.length > 0) {
          setTutors(normalized);
          return;
        }
      }

      // Fallback: search endpoint is less restrictive and already powers tutor discovery.
      const fallbackResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/search/tutors?minPrice=0&maxPrice=10000&minRating=0&dbsRequired=false`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch tutors');
      }

      const fallbackData = await fallbackResponse.json();
      setTutors(normalizeTutors(fallbackData.tutors || []));
    } catch (err: any) {
      console.error('Error fetching tutors:', err);
      setError('Failed to load tutors. Please try again.');
    } finally {
      setLoadingTutors(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !selectedTutor) return;

    setLoadingSlots(true);
    setError('');

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/${selectedTutor}/availability?date=${dateStr}&studentId=${activeChildId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || generateDefaultSlots());
    } catch (err: any) {
      console.error('Error fetching availability:', err);
      // Generate default slots if API fails
      setAvailableSlots(generateDefaultSlots());
    } finally {
      setLoadingSlots(false);
    }
  };

  const generateDefaultSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    // Generate slots from 9 AM to 8 PM
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        // Random availability for demo
        const available = Math.random() > 0.3;
        slots.push({ time, available });
      }
    }
    return slots;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const calculatePrice = () => {
    const tutor = tutors.find(t => t.id === selectedTutor);
    if (!tutor) return '0.00';
    const hours = parseInt(sessionDuration) / 60;
    return (tutor.hourlyRate * hours).toFixed(2);
  };

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTutor || !selectedSlot) {
      setError('Please select a date, tutor, and time slot');
      return;
    }

    setBooking(true);
    setError('');

    try {
      const endTime = calculateEndTime(selectedSlot, parseInt(sessionDuration));
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tutorId: selectedTutor,
            studentId: activeChildId,
            date: selectedDate.toISOString().split('T')[0],
            startTime: selectedSlot,
            endTime: endTime,
            duration: parseInt(sessionDuration),
            price: calculatePrice(),
            notes: sessionNotes,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to book session');
      }

      const responseData = await response.json();

      setSuccess('Session booked successfully! The tutor and student will receive calendar invites.');
      setShowConfirmDialog(false);
      
      // Show the Google Meet link
      if (responseData.booking?.googleMeetLink) {
        setSuccess(`Session booked successfully! Google Meet link: ${responseData.booking.googleMeetLink}`);
      }
      
      // Reset form
      setSelectedSlot('');
      setSessionNotes('');
      
      // Refresh available slots
      await fetchAvailableSlots();

      // Clear success message after 10 seconds
      setTimeout(() => setSuccess(''), 10000);
    } catch (err: any) {
      console.error('Error booking session:', err);
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  const selectedTutorData = tutors.find(t => t.id === selectedTutor);

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

      {/* Student Info */}
      {childName && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white">
                {childName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking session for:</p>
                <p className="font-medium">{childName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Tutor Selection and Calendar */}
        <div className="space-y-6">
          {/* Tutor Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: '#625d9c' }} />
                Select Tutor
              </CardTitle>
              <CardDescription>Choose a tutor to book a session with</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTutors ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 animate-pulse mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Loading tutors...</p>
                </div>
              ) : tutors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">No tutors available</p>
                  <p className="text-xs">Please check back later</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tutors.map((tutor) => (
                    <button
                      key={tutor.id}
                      onClick={() => setSelectedTutor(tutor.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTutor === tutor.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{tutor.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {tutor.subjects?.join(', ') || 'Multiple subjects'}
                          </p>
                        </div>
                        {selectedTutor === tutor.id && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" style={{ color: '#625d9c' }} />
                Select Date
              </CardTitle>
              <CardDescription>Choose a date for the session</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Time Slots and Booking */}
        <div className="space-y-6">
          {/* Session Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: '#625d9c' }} />
                Session Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Available Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: '#625d9c' }} />
                Available Time Slots
              </CardTitle>
              <CardDescription>
                {selectedDate ? 
                  `Slots for ${selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}` :
                  'Select a date to view available slots'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTutor ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Please select a tutor first</p>
                </div>
              ) : !selectedDate ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Please select a date</p>
                </div>
              ) : loadingSlots ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Loading available slots...</p>
                </div>
              ) : availableSlots.filter(s => s.available).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No available slots for this date</p>
                  <p className="text-xs mt-1">Please try another date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {availableSlots
                    .filter(slot => slot.available)
                    .map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot.time)}
                        disabled={slot.blocked}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          selectedSlot === slot.time
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : slot.blocked
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Summary & Action */}
          {selectedSlot && selectedTutor && (
            <Card className="border-2" style={{ borderColor: '#625d9c' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tutor:</span>
                    <span className="font-medium">{selectedTutorData?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">
                      {selectedDate?.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="font-medium">
                      {formatTime(selectedSlot)} - {formatTime(calculateEndTime(selectedSlot, parseInt(sessionDuration)))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="font-medium">{parseInt(sessionDuration)} minutes</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-600">Total Price:</span>
                    <span className="font-medium text-lg" style={{ color: '#5d9827' }}>
                      {formatNaira(Number(calculatePrice()))}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPaymentPlans(true)}
                  className="w-full text-white h-12"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  <Video className="w-5 h-5 mr-2" />
                  Book Session
                </Button>

                <p className="text-xs text-center text-gray-500">
                  Choose a plan and pay securely with Flutterwave
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Plan Dialog */}
      {showPaymentPlans && selectedTutor && selectedDate && selectedSlot && (
        <BookSessionWithPayment
          session={session}
          tutorId={selectedTutor}
          tutorName={selectedTutorData?.name ?? ''}
          studentId={activeChildId}
          studentName={childName ?? ''}
          startDate={selectedDate.toISOString().split('T')[0]}
          startTime={selectedSlot}
          onSuccess={(sessionsCreated) => {
            setShowPaymentPlans(false);
            setSuccess(`Payment successful! ${sessionsCreated} session${sessionsCreated > 1 ? 's' : ''} booked and added to your calendar.`);
            setSelectedSlot('');
            setSessionNotes('');
            fetchAvailableSlots();
          }}
          onCancel={() => setShowPaymentPlans(false)}
        />
      )}

      {/* Confirmation Dialog (kept for reference — now superseded by payment flow) */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Session Booking</DialogTitle>
            <DialogDescription>
              Review the booking details and add any notes for the tutor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tutor:</span>
                <span className="font-medium">{selectedTutorData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Student:</span>
                <span className="font-medium">{childName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Date & Time:</span>
                <span className="font-medium">
                  {selectedDate?.toLocaleDateString('en-GB')} at {formatTime(selectedSlot)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="font-medium">{parseInt(sessionDuration)} minutes</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="font-medium text-lg" style={{ color: '#5d9827' }}>{formatNaira(Number(calculatePrice()))}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Session Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or special requirements for this session..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Calendar invites will be sent to both the tutor and student. This time slot will be blocked on both calendars.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={booking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookSession}
              disabled={booking}
              className="text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {booking ? 'Booking...' : `Confirm & Pay ${formatNaira(Number(calculatePrice()))}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}