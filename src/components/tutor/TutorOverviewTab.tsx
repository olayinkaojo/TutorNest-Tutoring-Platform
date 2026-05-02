import { Users, Calendar, BookOpen, TrendingUp, ArrowRight, Star, MessageSquare, Clock, CheckCircle, Zap, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UpcomingLessonsCard } from '../UpcomingLessonsCard';
import { StudentProgressWidget } from '../StudentProgressWidget';
import { formatNaira } from '../../utils/currency';

interface Student {
  id: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  totalLessons: number;
  upcomingLessons: number;
}

interface Stats {
  activeStudents: number;
  lessonsThisWeek: number;
  totalLessons: number;
  earnings: number;
}

interface Profile {
  id?: string;
  userId?: string;
  full_name?: string;
  firstName?: string;
  name?: string;
  verificationStatus?: string;
  subjects?: string[];
  hourlyRate?: number;
  bio?: string;
  profilePhoto?: string;
}

interface Session {
  access_token: string;
  user?: { id: string };
}

interface TutorOverviewTabProps {
  session: Session | null;
  students: Student[];
  loading: boolean;
  stats: Stats;
  profile: Profile;
  onViewBookings: () => void;
  onViewAvailability: () => void;
  onViewPayouts: () => void;
  onViewPerformance: () => void;
  onViewMessages: () => void;
  onViewProfile: () => void;
}

const QUICK_ACTIONS = [
  {
    label: 'Manage Bookings',
    description: 'View & confirm sessions',
    icon: Calendar,
    color: '#625d9c',
    bg: '#625d9c15',
    key: 'bookings' as const,
  },
  {
    label: 'Set Availability',
    description: 'Update your schedule',
    icon: Clock,
    color: '#5d9827',
    bg: '#5d982715',
    key: 'availability' as const,
  },
  {
    label: 'View Earnings',
    description: 'Track your payouts',
    icon: TrendingUp,
    color: '#e67e22',
    bg: '#e67e2215',
    key: 'payouts' as const,
  },
  {
    label: 'Messages',
    description: 'Chat with parents',
    icon: MessageSquare,
    color: '#3b82f6',
    bg: '#3b82f615',
    key: 'messages' as const,
  },
];

export function TutorOverviewTab({
  session,
  students,
  loading,
  stats,
  profile,
  onViewBookings,
  onViewAvailability,
  onViewPayouts,
  onViewPerformance,
  onViewMessages,
  onViewProfile,
}: TutorOverviewTabProps) {
  const tutorName = profile.full_name || profile.firstName || profile.name || 'Tutor';
  const firstName = tutorName.split(' ')[0];
  const isVerified = profile.verificationStatus === 'verified' || profile.verificationStatus === 'approved';
  const isPending = profile.verificationStatus === 'pending';

  const handleAction = (key: string) => {
    if (key === 'bookings') onViewBookings();
    else if (key === 'availability') onViewAvailability();
    else if (key === 'payouts') onViewPayouts();
    else if (key === 'messages') onViewMessages();
  };

  // Profile completeness check
  const profileChecks = [
    { label: 'Profile verified', done: isVerified, onClick: undefined },
    { label: 'Subjects set', done: (profile.subjects?.length ?? 0) > 0, onClick: onViewProfile },
    { label: 'Hourly rate set', done: !!profile.hourlyRate, onClick: onViewProfile },
    { label: 'Bio written', done: !!(profile.bio && profile.bio.length > 20), onClick: onViewProfile },
  ];
  const profileScore = profileChecks.filter(c => c.done).length;
  const profileComplete = profileScore === profileChecks.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #625d9c 0%, #4a4580 100%)' }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-purple-200 text-sm mb-1">Good day,</p>
            <h2 className="text-2xl font-bold text-white mb-1">{firstName} 👋</h2>
            <p className="text-purple-200 text-sm">
              {isVerified
                ? `You have ${stats.lessonsThisWeek} lesson${stats.lessonsThisWeek !== 1 ? 's' : ''} this week`
                : isPending
                ? 'Your profile is under review — we\'ll notify you soon'
                : 'Complete your profile to start receiving bookings'}
            </p>
          </div>
          <div className="flex gap-3">
            {isVerified ? (
              <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Verified Tutor
              </Badge>
            ) : isPending ? (
              <Badge className="bg-amber-400/20 text-amber-200 border-amber-300/30 text-sm px-3 py-1">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Pending Review
              </Badge>
            ) : null}
          </div>
        </div>
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -right-4 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onViewPerformance}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#625d9c15' }}>
                <Users className="w-5 h-5" style={{ color: '#625d9c' }} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.activeStudents}</div>
            <div className="text-xs text-gray-500 mt-0.5">Active Students</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onViewBookings}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5d982715' }}>
                <Calendar className="w-5 h-5" style={{ color: '#5d9827' }} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.lessonsThisWeek}</div>
            <div className="text-xs text-gray-500 mt-0.5">Lessons This Week</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onViewPayouts}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e67e2215' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#e67e22' }} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : formatNaira(stats.earnings)}</div>
            <div className="text-xs text-gray-500 mt-0.5">Earnings (Period)</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onViewPerformance}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                <BookOpen className="w-5 h-5" style={{ color: '#3b82f6' }} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.totalLessons}</div>
            <div className="text-xs text-gray-500 mt-0.5">Sessions Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action.key)}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all text-left group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: action.bg }}
            >
              <action.icon className="w-5 h-5" style={{ color: action.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{action.label}</div>
              <div className="text-xs text-gray-500 truncate">{action.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Main grid: Upcoming Sessions + Students */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Lessons — takes 2/3 */}
        <div className="lg:col-span-2">
          {session && (
            <UpcomingLessonsCard
              session={session}
              activeChildId={null}
              userRole="tutor"
              onViewBookings={onViewBookings}
            />
          )}
        </div>

        {/* Right column: profile completeness + students */}
        <div className="space-y-4">
          {/* Profile Completeness */}
          {!profileComplete && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-base">Profile Strength</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {profileScore}/4 steps complete
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full mb-4">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(profileScore / 4) * 100}%`,
                      backgroundColor: profileScore < 2 ? '#e67e22' : profileScore < 4 ? '#5d9827' : '#625d9c',
                    }}
                  />
                </div>
                <div className="space-y-2.5">
                  {profileChecks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-2.5 text-sm ${check.done ? 'text-gray-400' : 'text-gray-700 cursor-pointer group'}`}
                      onClick={!check.done && check.onClick ? check.onClick : undefined}
                    >
                      {check.done ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 group-hover:border-purple-400 transition-colors" />
                      )}
                      <span className={check.done ? 'line-through' : 'group-hover:text-purple-700 transition-colors'}>
                        {check.label}
                      </span>
                      {!check.done && check.onClick && (
                        <ArrowRight className="w-3 h-3 ml-auto text-gray-300 group-hover:text-purple-400 transition-colors" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievement / tip card */}
          {profileComplete && (
            <Card className="border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #5d982710, #5d982705)' }}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5d982720' }}>
                    <Award className="w-5 h-5" style={{ color: '#5d9827' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Profile Complete</div>
                    <div className="text-xs text-gray-500">You're all set to teach!</div>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Tutors with complete profiles get <strong>3× more bookings</strong>. Keep your availability up-to-date to appear in search results.
                </p>
                <button
                  onClick={onViewAvailability}
                  className="mt-3 text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all"
                  style={{ color: '#5d9827' }}
                >
                  Update availability <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* My Students */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>My Students</CardTitle>
            <CardDescription>Students with active or completed sessions</CardDescription>
          </div>
          {students.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewPerformance}
              className="flex items-center gap-1.5 text-sm"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.slice(0, 6).map((student) => (
                <div key={student.id}>
                  {session?.user?.id ? (
                    <StudentProgressWidget
                      tutorId={session.user.id}
                      studentId={student.id}
                      accessToken={session.access_token}
                      studentName={student.full_name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'}
                    />
                  ) : (
                    <Card className="p-4 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{student.full_name || 'Student'}</p>
                          <p className="text-xs text-gray-500">{student.totalLessons} lesson{student.totalLessons !== 1 ? 's' : ''} completed</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#625d9c10' }}>
                <Users className="w-8 h-8" style={{ color: '#625d9c' }} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No students yet</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
                Students will appear here once they book a session with you. Make sure your availability is up-to-date.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={onViewAvailability}
                  className="text-white text-sm"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Set Availability
                </Button>
                <Button variant="outline" onClick={onViewProfile} className="text-sm">
                  Complete Profile
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
