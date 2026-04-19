import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { projectId } from '../utils/supabase/info';
import { formatNaira } from '../utils/currency';
import { BookSessionWithPayment } from './BookSessionWithPayment';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Search,
  BookOpen,
  Video,
  Star,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Filter,
  GraduationCap,
} from 'lucide-react';

interface SessionBookingCalendarProps {
  session: any;
  activeChildId: string;
  childName?: string;
  childSubjects?: string[];
  onBookingSuccess?: () => void;
}

interface Tutor {
  id: string;
  name: string;
  subjects: string[];
  hourlyRate: number;
  availability?: any;
  // Bio / profile fields
  bio?: string;
  about?: string;
  experienceYears?: number;
  qualifications?: string;
  location?: string;
  teachingFormat?: string;
  dbsChecked?: boolean;
  hasInsurance?: boolean;
  languages?: string[];
  methodologies?: string[];
  ageGroups?: string[];
  rating?: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
  blocked?: boolean;
}

export function SessionBookingCalendar({
  session,
  activeChildId,
  childName,
  childSubjects = [],
  onBookingSuccess,
}: SessionBookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTutor, setSelectedTutor] = useState<string>('');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<string>('60');
  const [showPaymentPlans, setShowPaymentPlans] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Subject + filter state
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [maxRate, setMaxRate] = useState<string>('all');
  const [dbsOnly, setDbsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Tutor bio expansion
  const [expandedTutorId, setExpandedTutorId] = useState<string>('');

  useEffect(() => {
    fetchTutors();
  }, []);

  useEffect(() => {
    // Pre-select the first child subject if available
    if (childSubjects.length > 0 && !activeSubject) {
      setActiveSubject(childSubjects[0]);
    }
  }, [childSubjects]);

  const isTutorVerified = (tutor: any) => {
    const verificationStatus = String(tutor.verificationStatus || '').toLowerCase();
    if (verificationStatus === 'verified') return true;
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
          hourlyRate: 20000,
          availability: tutor.availability,
          bio: tutor.bio || tutor.about || tutor.profileBio || '',
          experienceYears: tutor.experienceYears || tutor.experience || undefined,
          qualifications: tutor.qualifications || tutor.qualification || '',
          location: tutor.location || tutor.city || '',
          teachingFormat: tutor.teachingFormat || '',
          dbsChecked: tutor.dbsChecked === true || tutor.dbs === true,
          hasInsurance: tutor.hasInsurance === true || tutor.insurance === true,
          languages: tutor.languages || [],
          methodologies: tutor.methodologies || [],
          ageGroups: tutor.ageGroups || [],
          rating: tutor.rating != null ? Number(tutor.rating) : tutor.averageRating != null ? Number(tutor.averageRating) : undefined,
        } as Tutor;
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
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const normalized = normalizeTutors(data.tutors || []);
        if (normalized.length > 0) {
          setTutors(normalized);
          return;
        }
      }

      const fallbackResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/search/tutors?minPrice=0&maxPrice=10000&minRating=0&dbsRequired=false`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!fallbackResponse.ok) throw new Error('Failed to fetch tutors');
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
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch availability');
      const data = await response.json();
      setAvailableSlots(data.slots || generateDefaultSlots());
    } catch {
      setAvailableSlots(generateDefaultSlots());
    } finally {
      setLoadingSlots(false);
    }
  };

  const generateDefaultSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: Math.random() > 0.3 });
      }
    }
    return slots;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const total = hours * 60 + minutes + duration;
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  };

  const calculatePrice = () => {
    const tutor = tutors.find(t => t.id === selectedTutor);
    if (!tutor) return '0.00';
    return (tutor.hourlyRate * (parseInt(sessionDuration) / 60)).toFixed(2);
  };

  // ── Filtered tutors ──────────────────────────────────────────────────────────
  const filteredTutors = tutors.filter(t => {
    if (activeSubject && !t.subjects.some(s => s.toLowerCase() === activeSubject.toLowerCase())) return false;
    if (maxRate !== 'all' && t.hourlyRate > Number(maxRate)) return false;
    if (dbsOnly && !t.dbsChecked) return false;
    return true;
  });

  // Collect all subjects taught by all tutors — for filter pills
  const allSubjectsFromTutors = Array.from(new Set(tutors.flatMap(t => t.subjects))).sort();
  // Show child subjects first, then the rest
  const subjectPills = [
    ...childSubjects.filter(s => allSubjectsFromTutors.some(ts => ts.toLowerCase() === s.toLowerCase())),
    ...allSubjectsFromTutors.filter(s => !childSubjects.some(cs => cs.toLowerCase() === s.toLowerCase())),
  ];

  const selectedTutorData = tutors.find(t => t.id === selectedTutor);

  // ── Tutor card ───────────────────────────────────────────────────────────────
  const TutorCard = ({ tutor }: { tutor: Tutor }) => {
    const isSelected = selectedTutor === tutor.id;
    const isExpanded = expandedTutorId === tutor.id;
    const bioText = tutor.bio || tutor.about || '';
    const shortBio = bioText.length > 120 ? bioText.slice(0, 120).trimEnd() + '…' : bioText;
    const hasBio = bioText.length > 0;
    const hasMore = bioText.length > 120;

    return (
      <div
        className={`rounded-xl border-2 transition-all ${
          isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300 bg-white'
        }`}
      >
        {/* Clickable header row */}
        <button
          onClick={() => {
            setSelectedTutor(tutor.id);
            setSelectedSlot('');
          }}
          className="w-full p-4 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: '#625d9c' }}
            >
              {tutor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 text-sm">{tutor.name}</h4>
                {tutor.dbsChecked && (
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50 py-0">
                    <ShieldCheck className="w-3 h-3 mr-1" />DBS
                  </Badge>
                )}
              </div>

              {/* Key stats row */}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                <span className="font-medium text-green-700">{formatNaira(tutor.hourlyRate)}/hr</span>
                {tutor.experienceYears !== undefined && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />{tutor.experienceYears}yr{tutor.experienceYears !== 1 ? 's' : ''}
                  </span>
                )}
                {tutor.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{tutor.location}
                  </span>
                )}
                {tutor.rating !== undefined && !isNaN(Number(tutor.rating)) && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />{Number(tutor.rating).toFixed(1)}
                  </span>
                )}
              </div>

              {/* Subject badges */}
              <div className="flex flex-wrap gap-1 mt-2">
                {tutor.subjects.slice(0, 4).map(s => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className={`text-xs py-0 ${
                      childSubjects.some(cs => cs.toLowerCase() === s.toLowerCase())
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s}
                  </Badge>
                ))}
                {tutor.subjects.length > 4 && (
                  <Badge variant="secondary" className="text-xs py-0 bg-gray-100 text-gray-500">
                    +{tutor.subjects.length - 4} more
                  </Badge>
                )}
              </div>
            </div>

            {isSelected && <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />}
          </div>
        </button>

        {/* Bio section */}
        {hasBio && (
          <div className="px-4 pb-4 -mt-1">
            <p className="text-xs text-gray-600 leading-relaxed">
              {isExpanded ? bioText : shortBio}
            </p>
            {hasMore && (
              <button
                onClick={() => setExpandedTutorId(isExpanded ? '' : tutor.id)}
                className="mt-1 text-xs font-medium flex items-center gap-1"
                style={{ color: '#625d9c' }}
              >
                {isExpanded ? (
                  <><ChevronUp className="w-3 h-3" />Show less</>
                ) : (
                  <><ChevronDown className="w-3 h-3" />Read more</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Expanded extra info */}
        {isExpanded && (tutor.qualifications || tutor.teachingFormat || (tutor.languages && tutor.languages.length > 0)) && (
          <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
            {tutor.qualifications && (
              <div className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Qualifications: </span>{tutor.qualifications}
              </div>
            )}
            {tutor.teachingFormat && (
              <div className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Format: </span>{tutor.teachingFormat}
              </div>
            )}
            {tutor.languages && tutor.languages.length > 0 && (
              <div className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Languages: </span>{tutor.languages.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
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

      {/* Child info banner */}
      {childName && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {childName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-xs text-gray-500">Booking session for</p>
                <p className="font-semibold text-gray-900">{childName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Subject filter row ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Filter by Subject</span>
            {childSubjects.length > 0 && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                {childSubjects.length} enrolled
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            <Filter className="w-3 h-3" />
            More filters
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Subject pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubject('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeSubject === ''
                ? 'text-white border-transparent'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            style={activeSubject === '' ? { backgroundColor: '#625d9c', borderColor: '#625d9c' } : {}}
          >
            All tutors
          </button>
          {subjectPills.map(subject => {
            const isChildSubject = childSubjects.some(cs => cs.toLowerCase() === subject.toLowerCase());
            const isActive = activeSubject.toLowerCase() === subject.toLowerCase();
            return (
              <button
                key={subject}
                onClick={() => setActiveSubject(isActive ? '' : subject)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  isActive
                    ? 'text-white border-transparent'
                    : isChildSubject
                    ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={isActive ? { backgroundColor: '#625d9c', borderColor: '#625d9c' } : {}}
              >
                {isChildSubject && !isActive && <span className="mr-1">★</span>}
                {subject}
              </button>
            );
          })}
        </div>

        {/* Extra filters panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 mt-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-600 whitespace-nowrap">Max rate:</Label>
              <Select value={maxRate} onValueChange={setMaxRate}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any price</SelectItem>
                  <SelectItem value="5000">Up to ₦5,000/hr</SelectItem>
                  <SelectItem value="10000">Up to ₦10,000/hr</SelectItem>
                  <SelectItem value="20000">Up to ₦20,000/hr</SelectItem>
                  <SelectItem value="50000">Up to ₦50,000/hr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dbsOnly}
                onChange={e => setDbsOnly(e.target.checked)}
                className="accent-purple-600"
              />
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-600" />DBS checked only
              </span>
            </label>

            {(maxRate !== 'all' || dbsOnly || activeSubject) && (
              <button
                onClick={() => { setMaxRate('all'); setDbsOnly(false); setActiveSubject(''); }}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main two-column layout ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* LEFT — Tutor list */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" style={{ color: '#625d9c' }} />
                Select Tutor
                {!loadingTutors && (
                  <Badge variant="secondary" className="ml-auto text-xs font-normal">
                    {filteredTutors.length} available
                  </Badge>
                )}
              </CardTitle>
              {activeSubject && (
                <CardDescription className="text-xs">
                  Showing tutors for <strong>{activeSubject}</strong>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loadingTutors ? (
                <div className="text-center py-10 text-gray-400">
                  <Search className="w-8 h-8 animate-pulse mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Loading tutors…</p>
                </div>
              ) : filteredTutors.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <User className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm mb-1">No tutors match your filters</p>
                  <button
                    onClick={() => { setActiveSubject(''); setMaxRate('all'); setDbsOnly(false); }}
                    className="text-xs underline"
                    style={{ color: '#625d9c' }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {filteredTutors.map(tutor => (
                    <TutorCard key={tutor.id} tutor={tutor} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Calendar + duration + time slots */}
        <div className="space-y-5">

          {/* Calendar — top of right column */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="w-4 h-4" style={{ color: '#625d9c' }} />
                Select Date
              </CardTitle>
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

          {/* Session Duration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" style={{ color: '#625d9c' }} />
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" style={{ color: '#625d9c' }} />
                Available Time Slots
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedDate
                  ? `Slots for ${selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}`
                  : 'Select a date to view slots'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTutor ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Select a tutor first</p>
                </div>
              ) : !selectedDate ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Select a date</p>
                </div>
              ) : loadingSlots ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-7 h-7 animate-spin mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Loading slots…</p>
                </div>
              ) : availableSlots.filter(s => s.available).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No slots available — try another date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {availableSlots
                    .filter(slot => slot.available)
                    .map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot.time)}
                        disabled={slot.blocked}
                        className={`p-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                          selectedSlot === slot.time
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : slot.blocked
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Summary */}
          {selectedSlot && selectedTutor && (
            <Card className="border-2" style={{ borderColor: '#625d9c' }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4" style={{ color: '#625d9c' }} />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tutor</span>
                    <span className="font-medium">{selectedTutorData?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">
                      {selectedDate?.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium">
                      {formatTime(selectedSlot)} – {formatTime(calculateEndTime(selectedSlot, parseInt(sessionDuration)))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{parseInt(sessionDuration)} min</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-500 font-medium">Total</span>
                    <span className="font-semibold text-base" style={{ color: '#5d9827' }}>
                      {formatNaira(Number(calculatePrice()))}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPaymentPlans(true)}
                  className="w-full text-white h-11"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Book Session
                </Button>

                <p className="text-xs text-center text-gray-400">
                  Choose a plan and pay securely with Flutterwave
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment plan flow */}
      {showPaymentPlans && selectedTutor && selectedDate && selectedSlot && (
        <BookSessionWithPayment
          session={session}
          tutorId={selectedTutor}
          tutorName={selectedTutorData?.name ?? ''}
          studentId={activeChildId}
          studentName={childName ?? ''}
          subject={activeSubject || undefined}
          startDate={selectedDate.toISOString().split('T')[0]}
          startTime={selectedSlot}
          onSuccess={(sessionsCreated) => {
            setShowPaymentPlans(false);
            setSuccess(
              `Payment successful! ${sessionsCreated} session${sessionsCreated > 1 ? 's' : ''} booked and added to your calendar.`
            );
            setSelectedSlot('');
            fetchAvailableSlots();
            onBookingSuccess?.();
          }}
          onCancel={() => setShowPaymentPlans(false)}
        />
      )}
    </div>
  );
}
