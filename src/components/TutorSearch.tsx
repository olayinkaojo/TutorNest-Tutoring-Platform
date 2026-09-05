import { useState, useEffect, useCallback } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { TutorProfileModal } from './TutorProfileModal';
import {
  Search,
  Filter,
  Star,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Eye,
  Calendar,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

interface TutorSearchProps {
  session: any;
  studentProfile?: any;
  activeChildId?: string | null;
  onStartConversation?: (tutorId: string, tutorName: string) => void;
  onBookSession?: (tutor: any) => void;
}

const SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Physics', 'Chemistry',
  'Biology', 'History', 'Geography', 'Computer Science', 'Languages',
];

const LEVELS = [
  { value: 'all-levels', label: 'All Levels' },
  { value: 'Primary (Year 1-6)', label: 'Primary (Yr 1–6)' },
  { value: 'KS3 (Year 7-9)', label: 'KS3 (Yr 7–9)' },
  { value: 'GCSE (Year 10-11)', label: 'GCSE (Yr 10–11)' },
  { value: 'A-Level (Year 12-13)', label: 'A-Level (Yr 12–13)' },
  { value: 'University Level', label: 'University' },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'lessons', label: 'Most Experienced' },
  { value: 'price-low', label: 'Price: Low → High' },
  { value: 'price-high', label: 'Price: High → Low' },
];

function sortTutors(tutors: any[], sortBy: string) {
  return [...tutors].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'lessons') return (b.totalLessons || 0) - (a.totalLessons || 0);
    if (sortBy === 'price-low') return (a.hourlyRate || 0) - (b.hourlyRate || 0);
    if (sortBy === 'price-high') return (b.hourlyRate || 0) - (a.hourlyRate || 0);
    return 0;
  });
}

export function TutorSearch({
  session,
  studentProfile,
  activeChildId,
  onStartConversation,
  onBookSession,
}: TutorSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    level: 'all-levels',
    availability: 'any-time',
    minRating: 'any-rating',
    dbsOnly: false,
  });
  const [allTutors, setAllTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedTutors, setInvitedTutors] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load all tutors on mount
  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/search/tutors`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error('Failed to load tutors');
      const data = await res.json();
      setAllTutors(data.tutors || []);
    } catch (err: any) {
      setError('Could not load tutors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteTutor = async (tutorId: string) => {
    setError('');
    if (!tutorId) { setError('Tutor ID missing.'); return; }
    const body: any = { tutorId };
    if (activeChildId) body.childId = activeChildId;
    else if (studentProfile?.userId) body.studentId = studentProfile.userId;
    else { setError('Please select a child before sending an invitation.'); return; }

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invitations/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to send invitation');
      }
      setInvitedTutors(prev => new Set(prev).add(tutorId));
      setSuccess('Invitation sent! The tutor will be notified.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Client-side filtering + search
  const filteredTutors = useCallback(() => {
    let list = allTutors;

    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      list = list.filter(t =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
        t.bio?.toLowerCase().includes(q) ||
        t.subjects?.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    if (selectedSubject) {
      list = list.filter(t => t.subjects?.some((s: string) =>
        s.toLowerCase().includes(selectedSubject.toLowerCase())
      ));
    }

    if (filters.level !== 'all-levels') {
      list = list.filter(t =>
        t.levels?.some((l: string) => l.includes(filters.level)) ||
        t.gradeLevel?.includes(filters.level) ||
        t.classes?.some((c: string) => c.includes(filters.level))
      );
    }

    if (filters.availability !== 'any-time') {
      list = list.filter(t => {
        const avail = (t.availability || '').toLowerCase();
        return avail.includes(filters.availability) || avail.includes('flexible');
      });
    }

    if (filters.minRating !== 'any-rating') {
      const min = parseFloat(filters.minRating);
      list = list.filter(t => (t.rating || 0) >= min);
    }

    if (filters.dbsOnly) {
      list = list.filter(t => t.dbsStatus === 'verified' || t.dbsChecked);
    }

    return sortTutors(list, sortBy);
  }, [allTutors, keyword, selectedSubject, filters, sortBy]);

  const results = filteredTutors();

  const TutorCard = ({ tutor }: { tutor: any }) => {
    const tutorId = tutor.userId || tutor.id;
    const isInvited = invitedTutors.has(tutorId);
    const initials = `${tutor.firstName?.[0] || ''}${tutor.lastName?.[0] || ''}`;
    // tutor.rating is null (not 0) when a tutor genuinely has no reviews yet
    // — showing a fabricated "5.0★" for an unrated tutor misrepresents them
    // as verified-excellent when they're simply new.
    const hasRating = tutor.rating !== null && tutor.rating !== undefined;
    const rating = hasRating ? parseFloat(tutor.rating).toFixed(1) : null;
    const canBook = !!onBookSession;

    return (
      <Card className="overflow-hidden transition-all hover:shadow-md border-gray-100">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <Avatar className="w-14 h-14 flex-shrink-0">
              {/* Uploads are written under photoUrl/photo_url (see
                  profile-avatar-routes.tsx) — this read a field
                  ("profilePhoto") that was never set, so every tutor with a
                  real uploaded photo still showed initials here. */}
              {(tutor.photoUrl || tutor.photo_url) && (
                <AvatarImage src={tutor.photoUrl || tutor.photo_url} />
              )}
              <AvatarFallback className="text-white text-sm font-bold" style={{ backgroundColor: '#625d9c' }}>
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 truncate">
                    {tutor.firstName} {tutor.lastName}
                  </h3>
                  {tutor.headline && (
                    <p className="text-xs text-gray-500 truncate">{tutor.headline}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#625d9c' }}>
                    ₦{(tutor.hourlyRate || 0).toLocaleString()}<span className="text-xs font-normal text-gray-400">/hr</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {hasRating ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {rating}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">New tutor</span>
                )}
                {tutor.totalLessons > 0 && (
                  <span className="text-xs text-gray-400">{tutor.totalLessons} lessons</span>
                )}
                {(tutor.dbsStatus === 'verified' || tutor.dbsChecked) && (
                  <Badge className="text-[10px] px-1.5 py-0 h-5" style={{ backgroundColor: '#5d982715', color: '#5d9827', border: 'none' }}>
                    <Shield className="w-2.5 h-2.5 mr-0.5" />
                    DBS
                  </Badge>
                )}
                {(tutor.verificationStatus === 'verified' || tutor.isVerified) && (
                  <Badge className="text-[10px] px-1.5 py-0 h-5" style={{ backgroundColor: '#3b82f615', color: '#3b82f6', border: 'none' }}>
                    <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {tutor.bio && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{tutor.bio}</p>
          )}

          {/* Subjects */}
          {tutor.subjects?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tutor.subjects.slice(0, 4).map((s: string) => (
                <Badge key={s} variant="outline" className="text-[11px] px-2 py-0 h-5 border-gray-200">
                  {s}
                </Badge>
              ))}
              {tutor.subjects.length > 4 && (
                <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 border-gray-200">
                  +{tutor.subjects.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Availability / experience row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            {tutor.availability && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {tutor.availability}
              </span>
            )}
            {tutor.experienceYears && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {tutor.experienceYears}yr exp
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-gray-200"
              onClick={() => { setSelectedTutor(tutor); setShowProfileModal(true); }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-gray-200"
              onClick={() => onStartConversation?.(tutorId, `${tutor.firstName} ${tutor.lastName}`)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Message
            </Button>
            {canBook ? (
              <Button
                size="sm"
                className="text-xs h-8 text-white col-span-1"
                style={{ backgroundColor: '#625d9c' }}
                onClick={() => onBookSession!(tutor)}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Book
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs h-8 text-white"
                style={{ backgroundColor: isInvited ? '#9ca3af' : '#625d9c' }}
                disabled={isInvited}
                onClick={() => handleInviteTutor(tutorId)}
              >
                {isInvited ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
                {isInvited ? 'Invited' : 'Invite'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      {/* Feedback messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Search by name, subject, or keyword…"
            className="pl-9 h-11 border-gray-200"
          />
          {keyword && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setKeyword('')}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(f => !f)}
          className={`h-11 gap-2 ${showFilters ? 'border-purple-300 text-purple-700 bg-purple-50' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-11 w-44 hidden sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject quick-filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSubject('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !selectedSubject
              ? 'text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={!selectedSubject ? { backgroundColor: '#625d9c' } : {}}
        >
          All Subjects
        </button>
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setSelectedSubject(selectedSubject === s ? '' : s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedSubject === s
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={selectedSubject === s ? { backgroundColor: '#625d9c' } : {}}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <Card className="border-gray-100">
          <CardContent className="pt-4 pb-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">Level</Label>
                <Select value={filters.level} onValueChange={v => setFilters(f => ({ ...f, level: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">Availability</Label>
                <Select value={filters.availability} onValueChange={v => setFilters(f => ({ ...f, availability: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-time">Any Time</SelectItem>
                    <SelectItem value="weekdays-daytime">Weekdays (Daytime)</SelectItem>
                    <SelectItem value="weekdays-evenings">Weekdays (Evenings)</SelectItem>
                    <SelectItem value="weekends">Weekends</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">Min Rating</Label>
                <Select value={filters.minRating} onValueChange={v => setFilters(f => ({ ...f, minRating: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-rating">Any Rating</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.dbsOnly}
                  onChange={e => setFilters(f => ({ ...f, dbsOnly: e.target.checked }))}
                  className="w-4 h-4 rounded accent-purple-600"
                />
                <span className="text-sm text-gray-700">DBS verified tutors only</span>
              </label>
              <button
                className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
                onClick={() => setFilters({ level: 'all-levels', availability: 'any-time', minRating: 'any-rating', dbsOnly: false })}
              >
                Reset filters
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading ? 'Loading tutors…' : `${results.length} tutor${results.length !== 1 ? 's' : ''} found`}
        </p>
        {!loading && results.length > 0 && onBookSession && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Click <strong>Book</strong> to schedule a session
          </p>
        )}
      </div>

      {/* Tutor grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-56 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="py-14 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gray-100">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No tutors match your filters</h3>
            <p className="text-sm text-gray-500 mb-4">Try adjusting the filters or clearing the subject selection.</p>
            <Button variant="outline" size="sm" onClick={() => {
              setKeyword('');
              setSelectedSubject('');
              setFilters({ level: 'all-levels', availability: 'any-time', minRating: 'any-rating', dbsOnly: false });
            }}>
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(tutor => (
            <TutorCard key={tutor.userId || tutor.id} tutor={tutor} />
          ))}
        </div>
      )}

      {/* Tutor Profile Modal */}
      {selectedTutor && (
        <TutorProfileModal
          tutor={selectedTutor}
          isOpen={showProfileModal}
          onClose={() => { setShowProfileModal(false); setSelectedTutor(null); }}
          session={session}
          activeChildId={activeChildId}
          onInvite={async (tutorId) => { await handleInviteTutor(tutorId); }}
          onMessage={(tutorId, tutorName) => {
            onStartConversation?.(tutorId, tutorName);
            setShowProfileModal(false);
          }}
          onBook={onBookSession ? (tutor) => {
            onBookSession(tutor);
            setShowProfileModal(false);
          } : undefined}
        />
      )}
    </div>
  );
}
