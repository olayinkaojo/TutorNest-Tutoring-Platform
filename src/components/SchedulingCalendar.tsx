import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, Plus, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface Event {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: string;
  source?: 'tutornest' | 'google';
  status?: string;
  htmlLink?: string;
}

interface SchedulingCalendarProps {
  session: any;
  userId: string;
  userRole: 'parent' | 'tutor';
  googleCalendarConnected?: boolean;
}

export function SchedulingCalendar({ session, userId, userRole, googleCalendarConnected }: SchedulingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    loadEvents();
  }, [currentDate, googleCalendarConnected]);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    
    try {
      const promises: Promise<any>[] = [];
      
      // Get the date range based on current view
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
      
      // Load TutorNest bookings
      promises.push(
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        ).then(res => res.json())
      );
      
      // Load Google Calendar events if connected
      if (googleCalendarConnected) {
        promises.push(
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          ).then(res => res.json())
        );
      }
      
      const results = await Promise.all(promises);
      
      const allEvents: Event[] = [];
      
      // Process TutorNest bookings
      if (results[0]?.bookings) {
        const bookingEvents = results[0].bookings
          .filter((b: any) => b.status !== 'cancelled')
          .map((booking: any) => ({
            id: booking.id,
            summary: `Session with ${userRole === 'parent' ? booking.tutorName : booking.studentName}`,
            description: booking.notes || '',
            start: { dateTime: `${booking.date}T${booking.startTime}` },
            end: { dateTime: `${booking.date}T${booking.endTime}` },
            location: 'TutorNest Virtual Classroom',
            source: 'tutornest' as const,
            status: booking.status,
          }));
        allEvents.push(...bookingEvents);
      }
      
      // Process Google Calendar events
      if (results[1]?.events) {
        const googleEvents = results[1].events.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'Untitled Event',
          description: event.description || '',
          start: { dateTime: event.start.dateTime || event.start.date },
          end: { dateTime: event.end.dateTime || event.end.date },
          location: event.location || '',
          source: 'google' as const,
          htmlLink: event.htmlLink,
        }));
        allEvents.push(...googleEvents);
      }
      
      setEvents(allEvents);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Schedule Calendar
              </CardTitle>
              <CardDescription>
                View your upcoming sessions and availability
                {googleCalendarConnected && (
                  <Badge variant="outline" className="ml-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Google Calendar Synced
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[150px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!googleCalendarConnected && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Google Calendar to see all your events in one place and prevent scheduling conflicts.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {getDaysInMonth().map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const hasEvents = dayEvents.length > 0;
                  const isTodayDate = isToday(date);
                  
                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[80px] p-1 border rounded-lg relative
                        ${date ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'}
                        ${isTodayDate ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}
                        ${hasEvents ? 'font-medium' : ''}
                      `}
                      onClick={() => date && setSelectedDate(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm ${isTodayDate ? 'text-purple-700' : 'text-gray-700'}`}>
                            {date.getDate()}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded truncate ${
                                  event.source === 'tutornest'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                                title={event.summary}
                              >
                                {formatTime(event.start.dateTime)} {event.summary}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-100"></div>
                  <span className="text-gray-600">TutorNest Sessions</span>
                </div>
                {googleCalendarConnected && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-100"></div>
                    <span className="text-gray-600">Google Calendar</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </CardTitle>
            <CardDescription>
              {getEventsForDate(selectedDate).length} event(s) scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No events scheduled for this day</p>
              ) : (
                getEventsForDate(selectedDate).map(event => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${
                      event.source === 'tutornest'
                        ? 'border-purple-200 bg-purple-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{event.summary}</h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                        )}
                      </div>
                      <Badge variant={event.source === 'tutornest' ? 'default' : 'secondary'}>
                        {event.source === 'tutornest' ? 'TutorNest' : 'Google'}
                      </Badge>
                    </div>
                    {event.htmlLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => window.open(event.htmlLink, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View in Google Calendar
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
