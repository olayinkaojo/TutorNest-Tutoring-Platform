import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { CheckCircle, AlertCircle, Clock, Plus, Trash2, Save } from 'lucide-react';

interface TutorAvailabilityManagerProps {
  session: any;
  tutorId: string;
}

interface TimeSlot {
  start: string; // HH:MM format
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeeklySchedule = {
  [key in 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday']: DayAvailability;
};

export function TutorAvailabilityManager({ session, tutorId }: TutorAvailabilityManagerProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    Monday: { enabled: false, slots: [] },
    Tuesday: { enabled: false, slots: [] },
    Wednesday: { enabled: false, slots: [] },
    Thursday: { enabled: false, slots: [] },
    Friday: { enabled: false, slots: [] },
    Saturday: { enabled: false, slots: [] },
    Sunday: { enabled: false, slots: [] },
  });

  const [timezone, setTimezone] = useState('Europe/London');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    fetchAvailability();
  }, []);

  function generateTimeOptions() {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  }

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/availability/${tutorId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.schedule) {
          setSchedule(data.schedule);
        }
        if (data.timezone) {
          setTimezone(data.timezone);
        }
      }
    } catch (err: any) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: keyof WeeklySchedule) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const addTimeSlot = (day: keyof WeeklySchedule) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: '09:00', end: '17:00' }],
      },
    }));
  };

  const removeTimeSlot = (day: keyof WeeklySchedule, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeSlot = (
    day: keyof WeeklySchedule,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validate time slots
    for (const [day, dayData] of Object.entries(schedule)) {
      if (dayData.enabled) {
        if (dayData.slots.length === 0) {
          setError(`Please add at least one time slot for ${day} or disable the day.`);
          return;
        }

        for (const slot of dayData.slots) {
          if (slot.start >= slot.end) {
            setError(`Invalid time slot on ${day}: Start time must be before end time.`);
            return;
          }
        }
      }
    }

    setSaving(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            schedule,
            timezone,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save availability');
      }

      setSuccess('Availability saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving availability:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading availability...</p>
        </CardContent>
      </Card>
    );
  }

  const daysOfWeek: (keyof WeeklySchedule)[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

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

      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
          <CardDescription>
            Set your recurring weekly schedule. All times are in 15-minute intervals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Los Angeles (PST/PDT)</SelectItem>
                <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {daysOfWeek.map((day) => (
            <Card key={day} className={schedule[day].enabled ? 'border-purple-200' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={schedule[day].enabled}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label className="cursor-pointer" onClick={() => handleDayToggle(day)}>
                      {day}
                    </Label>
                  </div>
                  {schedule[day].enabled && (
                    <Badge variant="secondary">
                      {schedule[day].slots.length} slot{schedule[day].slots.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {schedule[day].enabled && (
                  <div className="space-y-3">
                    {schedule[day].slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={slot.start}
                          onValueChange={(value) => updateTimeSlot(day, index, 'start', value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-gray-500">to</span>

                        <Select
                          value={slot.end}
                          onValueChange={(value) => updateTimeSlot(day, index, 'end', value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(day, index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(day)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Note:</strong> Your availability will be visible to parents when they search for tutors.
              Booked slots will be automatically blocked from your calendar.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Availability
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}