import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback } from './ui/avatar';
import { TutorProfileModal } from './TutorProfileModal';
import { 
  Search, 
  Filter, 
  Star, 
  Shield, 
  Clock, 
  DollarSign, 
  Sparkles,
  UserPlus,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Eye,
  ArrowUpDown
} from 'lucide-react';

interface TutorSearchProps {
  session: any;
  studentProfile?: any;
  onInviteTutor?: (tutorId: string) => void;
  activeChildId?: string | null;
  onStartConversation?: (tutorId: string, tutorName: string) => void;
}

export function TutorSearch({ session, studentProfile, onInviteTutor, activeChildId, onStartConversation }: TutorSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [filters, setFilters] = useState({
    subject: '',
    level: '',
    availability: '',
    minPrice: 0,
    maxPrice: 100,
    minRating: 0,
    dbsRequired: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [tutors, setTutors] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [invitedTutors, setInvitedTutors] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const subjects = [
    'All Subjects',
    'Mathematics',
    'English',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Computer Science',
    'Languages',
  ];

  const levels = [
    'All Levels',
    'Primary (Year 1-6)',
    'KS3 (Year 7-9)',
    'GCSE (Year 10-11)',
    'A-Level (Year 12-13)',
    'University Level',
  ];

  const availabilities = [
    'Any Time',
    'weekdays-daytime',
    'weekdays-evenings',
    'weekends',
    'flexible',
  ];

  useEffect(() => {
    // Load AI recommendations if student profile is available
    if (studentProfile) {
      loadRecommendations();
    }
  }, [studentProfile]);

  const loadRecommendations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/search/recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ studentProfile }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setSearchPerformed(true);

    try {
      const queryParams = new URLSearchParams();
      if (keyword) queryParams.append('keyword', keyword);
      if (filters.subject && filters.subject !== 'All Subjects') 
        queryParams.append('subject', filters.subject);
      if (filters.level && filters.level !== 'All Levels') 
        queryParams.append('level', filters.level);
      if (filters.availability && filters.availability !== 'Any Time') 
        queryParams.append('availability', filters.availability);
      queryParams.append('minPrice', filters.minPrice.toString());
      queryParams.append('maxPrice', filters.maxPrice.toString());
      queryParams.append('minRating', filters.minRating.toString());
      queryParams.append('dbsRequired', filters.dbsRequired.toString());

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/search/tutors?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search tutors');
      }

      const data = await response.json();
      setTutors(data.tutors || []);
    } catch (err: any) {
      console.error('Error searching tutors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteTutor = async (tutorId: string) => {
    try {
      setError('');
      
      // Log for debugging
      console.log('Inviting tutor with ID:', tutorId);
      
      // Validate tutorId
      if (!tutorId) {
        throw new Error('Tutor ID is missing. Please try again.');
      }
      
      // Determine which ID to send (prioritize activeChildId from Parent Dashboard)
      const invitationBody: any = { tutorId };
      
      if (activeChildId) {
        // Parent Dashboard flow: use childId
        invitationBody.childId = activeChildId;
        console.log('Using activeChildId:', activeChildId);
      } else if (studentProfile?.userId) {
        // Student Dashboard flow: use studentId
        invitationBody.studentId = studentProfile.userId;
        console.log('Using studentProfile.userId:', studentProfile.userId);
      } else {
        // No valid ID
        throw new Error('Please select a child before sending an invitation');
      }
      
      console.log('Sending invitation body:', invitationBody);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invitations/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(invitationBody),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInvitedTutors(prev => new Set(prev).add(tutorId));
      setSuccess('Invitation sent! The tutor will be notified.');
      
      if (onInviteTutor) {
        onInviteTutor(tutorId);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error inviting tutor:', err);
      setError(err.message);
    }
  };

  const TutorCard = ({ tutor, isRecommendation = false }: any) => {
    // Handle both userId and id fields for backward compatibility
    const tutorUserId = tutor.userId || tutor.id;
    const isInvited = invitedTutors.has(tutorUserId);
    
    return (
      <Card className={isRecommendation ? 'border-purple-200 bg-purple-50' : 'hover:shadow-lg transition-shadow'}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 flex-shrink-0">
              <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                {tutor.firstName?.[0]}{tutor.lastName?.[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">
                    {tutor.firstName} {tutor.lastName}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {tutor.rating || '5.0'}
                    </Badge>
                    {tutor.dbsStatus === 'verified' && (
                      <Badge style={{ backgroundColor: '#5d9827' }}>
                        <Shield className="w-3 h-3 mr-1" />
                        DBS
                      </Badge>
                    )}
                    {tutor.isTopRated && (
                      <Badge style={{ backgroundColor: '#ea580c' }} className="text-white">
                        Top Rated
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {tutor.bio || 'Experienced tutor'}
              </p>

              <div className="flex flex-wrap gap-1 mb-3">
                {tutor.subjects?.slice(0, 3).map((subject: string) => (
                  <Badge key={subject} variant="outline" className="text-xs">
                    {subject}
                  </Badge>
                ))}
                {tutor.subjects?.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{tutor.subjects.length - 3}</Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-600 mb-4">
                <span className="flex items-center flex-shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {tutor.availability || 'Flexible'}
                </span>
                <span>•</span>
                <span className="flex-shrink-0">₦{tutor.hourlyRate || '0'}/hr</span>
                <span>•</span>
                <span className="flex-shrink-0">{tutor.totalLessons || 0} lessons</span>
              </div>

              {isRecommendation && tutor.matchReasons && (
                <Alert className="mb-3 bg-white border-purple-200 py-2">
                  <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <AlertDescription className="text-xs ml-2">
                    <strong>Match:</strong> {tutor.matchReasons}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedTutor(tutor);
                    setShowProfileModal(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Profile
                </Button>
                <Button
                  onClick={() => {
                    if (onStartConversation) {
                      onStartConversation(tutorUserId, `${tutor.firstName} ${tutor.lastName}`);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Message
                </Button>
                <Button
                  onClick={() => handleInviteTutor(tutorUserId)}
                  disabled={isInvited}
                  size="sm"
                  className="flex-1 text-xs h-8 text-white"
                  style={{ backgroundColor: isInvited ? '#9ca3af' : '#625d9c' }}
                >
                  {isInvited ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Invited
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
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

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: '#625d9c' }} />
            <h2 className="font-bold text-lg" style={{ color: '#625d9c' }}>Recommended for You</h2>
          </div>
          <div className="grid gap-4 mb-6">
            {recommendations.map((tutor) => (
              <TutorCard key={tutor.userId || tutor.id} tutor={tutor} isRecommendation />
            ))}
          </div>
        </div>
      )}

      {/* Search Bar & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, subject, or bio..."
                className="pl-10 h-12"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select
                    value={filters.subject}
                    onValueChange={(value) => setFilters({ ...filters, subject: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Subjects</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Geography">Geography</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Languages">Languages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Level</Label>
                  <Select
                    value={filters.level}
                    onValueChange={(value) => setFilters({ ...filters, level: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Levels</SelectItem>
                      <SelectItem value="Primary (Year 1-6)">Primary (Year 1-6)</SelectItem>
                      <SelectItem value="KS3 (Year 7-9)">KS3 (Year 7-9)</SelectItem>
                      <SelectItem value="GCSE (Year 10-11)">GCSE (Year 10-11)</SelectItem>
                      <SelectItem value="A-Level (Year 12-13)">A-Level (Year 12-13)</SelectItem>
                      <SelectItem value="University Level">University Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Availability</Label>
                  <Select
                    value={filters.availability}
                    onValueChange={(value) => setFilters({ ...filters, availability: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Time</SelectItem>
                      <SelectItem value="weekdays-daytime">Weekdays (Daytime)</SelectItem>
                      <SelectItem value="weekdays-evenings">Weekdays (Evenings)</SelectItem>
                      <SelectItem value="weekends">Weekends</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Minimum Rating</Label>
                  <Select
                    value={filters.minRating.toString()}
                    onValueChange={(value) => setFilters({ ...filters, minRating: parseFloat(value) })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="3">3+ stars</SelectItem>
                      <SelectItem value="4">4+ stars</SelectItem>
                      <SelectItem value="4.5">4.5+ stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max Price per Hour</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[filters.maxPrice]}
                      onValueChange={(val) => setFilters({ ...filters, maxPrice: val[0] })}
                      min={10}
                      max={200}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-fit">₦{filters.maxPrice}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dbsRequired"
                  checked={filters.dbsRequired}
                  onChange={(e) => setFilters({ ...filters, dbsRequired: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="dbsRequired" className="text-sm cursor-pointer">
                  DBS Verified tutors only
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results with Sorting */}
      {searchPerformed && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">
              {tutors.length === 0 ? 'No Results Found' : `${tutors.length} Tutor${tutors.length !== 1 ? 's' : ''} Found`}
            </h2>
            {tutors.length > 0 && (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="lessons">Most Experienced</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {tutors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-4 font-medium">
                  No tutors match your criteria
                </p>
                <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                <Button
                  onClick={() => {
                    setFilters({
                      subject: '',
                      level: '',
                      availability: '',
                      minPrice: 0,
                      maxPrice: 100,
                      minRating: 0,
                      dbsRequired: false,
                    });
                    setKeyword('');
                    setSearchPerformed(false);
                  }}
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tutors.map((tutor) => (
                <TutorCard key={tutor.userId || tutor.id} tutor={tutor} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tutor Profile Modal */}
      {selectedTutor && (
        <TutorProfileModal
          tutor={selectedTutor}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedTutor(null);
          }}
          session={session}
          activeChildId={activeChildId}
          onInvite={async (tutorId) => {
            await handleInviteTutor(tutorId);
          }}
          onMessage={(tutorId, tutorName) => {
            if (onStartConversation) {
              onStartConversation(tutorId, tutorName);
              setShowProfileModal(false);
            }
          }}
        />
      )}
    </div>
  );
}