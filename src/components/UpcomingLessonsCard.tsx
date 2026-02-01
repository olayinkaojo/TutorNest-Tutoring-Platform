import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Video,
  BookOpen,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface UpcomingLesson {
  id: string;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  googleMeetLink?: string;
  subject?: string;
}

interface UpcomingLessonsCardProps {
  session: any;
  activeChildId?: string | null;
  userRole: 'parent' | 'tutor';
  onViewBookings?: () => void;
}

export function UpcomingLessonsCard({ 
  session, 
  activeChildId, 
  userRole,
  onViewBookings 
}: UpcomingLessonsCardProps) {
  const [lessons, setLessons] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.access_token) {
      loadUpcomingLessons();
    }
  }, [session, activeChildId]);

  const loadUpcomingLessons = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const allBookings = data.bookings || [];
        
        // Filter for upcoming lessons
        const now = new Date();
        let upcoming = allBookings.filter((booking: UpcomingLesson) => {
          const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
          return bookingDateTime > now && booking.status === 'confirmed';
        });

        // If viewing from parent dashboard with active child, filter for that child
        if (userRole === 'parent' && activeChildId) {
          upcoming = upcoming.filter((booking: UpcomingLesson) => 
            booking.studentId === activeChildId
          );
        }

        // Sort by date/time (earliest first)
        upcoming.sort((a: UpcomingLesson, b: UpcomingLesson) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA.getTime() - dateB.getTime();
        });

        // Take first 5
        setLessons(upcoming.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading upcoming lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntil = (date: string, startTime: string): string => {
    const bookingDateTime = new Date(`${date}T${startTime}`);
    const now = new Date();
    const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil < 1) {
      const minutesUntil = Math.floor(hoursUntil * 60);
      return `in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
    } else if (hoursUntil < 24) {
      return `in ${Math.floor(hoursUntil)} hour${Math.floor(hoursUntil) !== 1 ? 's' : ''}`;
    } else {
      const daysUntil = Math.floor(hoursUntil / 24);
      return `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
    }
  };

  const isToday = (date: string): boolean => {
    const bookingDate = new Date(date);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString();
  };

  const formatDate = (date: string): string => {
    if (isToday(date)) {
      return 'Today';
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (new Date(date).toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return new Date(date).toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Lessons</CardTitle>
          <CardDescription>View scheduled tutoring sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Lessons</CardTitle>
            <CardDescription>
              {activeChildId 
                ? 'Scheduled sessions for this child' 
                : 'View scheduled tutoring sessions'}
            </CardDescription>
          </div>
          {lessons.length > 0 && onViewBookings && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewBookings}
            >
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {lessons.length > 0 ? (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const isUpcomingSoon = (() => {
                const bookingDateTime = new Date(`${lesson.date}T${lesson.startTime}`);
                const hoursUntil = (bookingDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
                return hoursUntil <= 2;
              })();

              return (
                <Card 
                  key={lesson.id} 
                  className={`p-4 hover:shadow-md transition-shadow ${
                    isUpcomingSoon ? 'border-[#5d9827] border-2 bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          className={isUpcomingSoon ? 'bg-[#5d9827] text-white' : 'bg-[#625d9c] text-white'}
                        >
                          {formatDate(lesson.date)}
                        </Badge>
                        {isUpcomingSoon && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Starting Soon
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {lesson.startTime} - {lesson.endTime}
                          </span>
                          <span className="text-gray-500">
                            ({getTimeUntil(lesson.date, lesson.startTime)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>
                            {userRole === 'parent' 
                              ? `${lesson.studentName} with ${lesson.tutorName}`
                              : `${lesson.studentName}`
                            }
                          </span>
                        </div>

                        {lesson.subject && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <span>{lesson.subject}</span>
                          </div>
                        )}

                        {lesson.googleMeetLink && (
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Video call link available</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {lesson.googleMeetLink && isUpcomingSoon && (
                      <Button
                        size="sm"
                        className="bg-[#5d9827] hover:bg-[#4a7a1f] flex-shrink-0"
                        onClick={() => window.open(lesson.googleMeetLink, '_blank')}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-2">No upcoming lessons scheduled</p>
            {userRole === 'parent' && (
              <p className="text-sm">
                {activeChildId 
                  ? 'Book a session with a tutor to get started'
                  : 'Select a child profile to view their lessons'
                }
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
