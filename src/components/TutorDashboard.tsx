import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { UpcomingLessonsCard } from './UpcomingLessonsCard';
import { MultiSelectFilter, SelectedFilterBadges } from './MultiSelectFilter';
import { StudentAssessmentForm } from './StudentAssessmentForm';
import { getSupabaseClient } from '../utils/supabase/client';
import { RoleSwitcher } from './RoleSwitcher';
import { AddRoleCard } from './AddRoleCard';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Star, 
  Calendar, 
  BookOpen, 
  Filter, 
  History,
  Clock, 
  CheckCircle, 
  LogOut,
  MessageSquare,
  Shield,
  FileText,
  TrendingUp,
  ShoppingBag,
  Library,
  GraduationCap,
  Plus,
  ArrowRight,
  User,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { NairaIcon } from './icons/NairaIcon';
import { formatNaira } from '../utils/currency';
import KFALogo from './KFALogo';
import { MobileNavigation } from './MobileNavigation';
import { NotificationCenter } from './NotificationCenter';
import { TutorStatsSection } from './tutor/TutorStatsSection';
import { TutorOverviewTab } from './tutor/TutorOverviewTab';
import { StudentProgressWidget } from './StudentProgressWidget';
import { DocumentManager } from './DocumentManager';

// Lazy-loaded: each of these is only needed once its own tab is opened, but
// was previously bundled eagerly into every tutor's first page load
// regardless of which tab they actually used — ~886KB unminified pulled in
// for e.g. a tutor who only ever visits Overview/Bookings. See each tab's
// TabsContent below for the matching <Suspense> boundary.
const TutorProfileEditor = lazy(() => import('./TutorProfileEditor').then(m => ({ default: m.TutorProfileEditor })));
const GoogleCalendarSetup = lazy(() => import('./GoogleCalendarSetup').then(m => ({ default: m.GoogleCalendarSetup })));
const TutorAvailabilityManager = lazy(() => import('./TutorAvailabilityManager').then(m => ({ default: m.TutorAvailabilityManager })));
const BookingManager = lazy(() => import('./BookingManager').then(m => ({ default: m.BookingManager })));
const TutorPerformanceDashboard = lazy(() => import('./TutorPerformanceDashboard').then(m => ({ default: m.TutorPerformanceDashboard })));
const TutorPayoutDashboard = lazy(() => import('./TutorPayoutDashboard').then(m => ({ default: m.TutorPayoutDashboard })));
const ResourcesHub = lazy(() => import('./ResourcesHub').then(m => ({ default: m.ResourcesHub })));
const TutorCurriculumViewer = lazy(() => import('./TutorCurriculumViewer').then(m => ({ default: m.TutorCurriculumViewer })));
const AdvancedReporting = lazy(() => import('./AdvancedReporting').then(m => ({ default: m.AdvancedReporting })));
const TutorReviewsTab = lazy(() => import('./TutorReviewsTab').then(m => ({ default: m.TutorReviewsTab })));
const TutorSessionReports = lazy(() => import('./TutorSessionReports').then(m => ({ default: m.TutorSessionReports })));
const Chatroom = lazy(() => import('./Chatroom').then(m => ({ default: m.Chatroom })));
import tutorAPI from '../utils/tutor-api-client';
import { parseWAT, bookingDateLabel, formatRawTimeWAT, WAT_TIMEZONE } from '../utils/timezone';
import { AvatarUpload } from './AvatarUpload';
import { TutorVerificationGate } from './TutorVerificationGate';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  verificationStatus?: string;
  [key: string]: any;
}

interface TutorDashboardProps {
  profile: UserProfile;
  onSignOut: () => void;
  availableRoles?: string[];
  onRoleSwitch?: (role: string) => void;
  onRoleAdded?: () => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

// Shared Suspense fallback for the lazy-loaded tabs above.
function TabFallback() {
  return <Skeleton className="h-64 w-full rounded-lg" />;
}

export function TutorDashboard({
  profile,
  onSignOut,
  availableRoles,
  onRoleSwitch,
  onRoleAdded,
  initialTab,
  onTabChange,
}: TutorDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const hasMountedTabSync = useRef(false);
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pastStudents, setPastStudents] = useState<any[]>([]);
  const [lessonHistory, setLessonHistory] = useState<any[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
  const [stats, setStats] = useState({
    activeStudents: 0,
    lessonsThisWeek: 0,
    totalLessons: 0,
    earnings: 0
  });
  const [loading, setLoading] = useState(true);
  // Reflects a just-uploaded avatar across the dashboard immediately, before the
  // app-level profile refetch catches up.
  const [livePhotoUrl, setLivePhotoUrl] = useState<string | undefined>(undefined);
  // Whether the tutor has cleared the registration gate (photo + a document).
  const [gateComplete, setGateComplete] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState('basic');
  const [isAddingParentRole, setIsAddingParentRole] = useState(false);
  const [parentRoleError, setParentRoleError] = useState<string | null>(null);
  const [parentRoleSuccess, setParentRoleSuccess] = useState(false);
  const [showRoleCongrats, setShowRoleCongrats] = useState(false);
  const [showVerificationCongrats, setShowVerificationCongrats] = useState(false);
  const [availabilitySet, setAvailabilitySet] = useState(false);

  const [unreportedCount, setUnreportedCount] = useState(0);

  // Assessment form state
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentBooking, setAssessmentBooking] = useState<any>(null);

  const validTabs = new Set([
    'overview',
    'profile',
    'messages',

    'availability',
    'bookings',
    'history',
    'performance',
    'payouts',
    'resources',
    'curriculum',
    'reporting',
    'reviews',
    'bookshop',
    'content',
    'documents',
  ]);

  useEffect(() => {
    if (initialTab && validTabs.has(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    // Skip first run so URL-derived tab isn't overwritten by default.
    if (!hasMountedTabSync.current) {
      hasMountedTabSync.current = true;
      return;
    }
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  // Debug log for available roles
  useEffect(() => {
    console.log('TutorDashboard - availableRoles:', availableRoles);
    console.log('TutorDashboard - Should show RoleSwitcher?', availableRoles && availableRoles.length > 1);
  }, [availableRoles]);

  // Check if should show congratulations for newly added tutor role
  useEffect(() => {
    if (!profile.id && !profile.userId) return;

    const userId = profile.id || profile.userId;
    const congratsKey = `kfa_show_tutor_congrats_${userId}`;
    const shouldShow = localStorage.getItem(congratsKey);

    if (shouldShow) {
      setShowRoleCongrats(true);
      // Clear the flag so it doesn't show again
      localStorage.removeItem(congratsKey);
    }
  }, [profile.id, profile.userId]);

  // Check if tutor was just verified and show congratulations
  useEffect(() => {
    if (!profile.id && !profile.userId) return;

    const userId = profile.id || profile.userId;
    const verificationCongratsKey = `kfa_verification_congrats_${userId}`;
    const hasSeenVerificationCongrats = localStorage.getItem(verificationCongratsKey);

    // Check if profile shows verification is complete
    if (!hasSeenVerificationCongrats && (profile.verificationStatus === 'verified' || profile.verificationStatus === 'approved')) {
      setShowVerificationCongrats(true);
      localStorage.setItem(verificationCongratsKey, 'true');
    }
  }, [profile.id, profile.userId, profile.verificationStatus]);

  // Get session for TutorInvitations
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDashboardData(session.access_token);
        fetchNotifications(session.access_token);
        fetchSubscriptionTier(session.access_token);
      }
    });
  }, []);

  // Refetch data when year or month filter changes
  useEffect(() => {
    if (session?.access_token) {
      fetchDashboardData(session.access_token);
    }
  }, [selectedYears, selectedMonths]);

  const fetchNotifications = async (accessToken: string) => {
    try {
      const userId = profile.id || profile.userId;
      if (!userId) {
        console.warn('No userId available for notifications');
        return;
      }
      
      if (!accessToken) {
        console.warn('No access token available for notifications');
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/notifications/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const unreadCount = data.notifications?.filter((n: any) => !n.read).length || 0;
        setNotificationCount(unreadCount);
      } else if (response.status === 404) {
        console.warn('Notifications endpoint not found - using 0 count');
        setNotificationCount(0);
      } else if (response.status === 401) {
        // Authentication issue - token might be expired, try to refresh
        console.warn('Authentication issue - token might be expired, attempting to refresh session');
        const { data: { session: newSession } } = await supabase.auth.refreshSession();
        if (newSession?.access_token) {
          // Retry with new token
          const retryResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/notifications/${userId}`,
            {
              headers: {
                'Authorization': `Bearer ${newSession.access_token}`,
              },
              signal: AbortSignal.timeout(10000),
            }
          );
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            const unreadCount = data.notifications?.filter((n: any) => !n.read).length || 0;
            setNotificationCount(unreadCount);
            // Update session
            setSession(newSession);
          } else {
            console.warn('Failed to fetch notifications after token refresh');
            setNotificationCount(0);
          }
        } else {
          console.warn('Unable to refresh session - user may need to re-login');
          setNotificationCount(0);
        }
      } else {
        console.error('Failed to fetch notifications:', response.status);
        setNotificationCount(0);
      }
    } catch (error: any) {
      // Check if it's a timeout or network error
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        // Silent - server may be starting up
      } else if (error.message === 'Failed to fetch') {
        // Silent - Edge Function may not be deployed yet or network issue
      } else {
        console.error('Error fetching notifications:', error);
      }
      setNotificationCount(0);
    }
  };

  const fetchDashboardData = async (accessToken: string) => {
    try {
      setLoading(true);
      const tutorId = profile.id || profile.userId;

      // Fetch bookings
      const bookingsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings?tutorId=${tutorId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        let bookings = bookingsData.bookings || [];

        // Apply year/month filter to bookings
        bookings = bookings.filter((b: any) => {
          const bookingDate = new Date(b.date);
          return selectedYears.includes(bookingDate.getFullYear()) && 
                 selectedMonths.includes(bookingDate.getMonth() + 1);
        });

        // Calculate stats
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        // Count lessons this week
        const lessonsThisWeek = bookings.filter((b: any) => {
          const bookingDate = new Date(b.date);
          return bookingDate >= startOfWeek && bookingDate < endOfWeek && b.status === 'confirmed';
        }).length;

        // Count total completed lessons (in selected period)
        const totalLessons = bookings.filter((b: any) => b.status === 'completed').length;

        // Set lesson history (completed bookings with details)
        const completedBookings = bookings.filter((b: any) => b.status === 'completed')
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLessonHistory(completedBookings);

        const unreported = bookings.filter((b: any) => b.status === 'completed' && !b.reportSubmitted && !b.report).length;
        setUnreportedCount(unreported);

        // Get unique students from confirmed or completed bookings
        const relevantBookings = bookings.filter((b: any) => 
          b.status === 'confirmed' || b.status === 'completed'
        );
        const uniqueStudentIds = new Set(relevantBookings.map((b: any) => b.studentId));
        
        const allStudentIds = Array.from(uniqueStudentIds);

        // Calculate tutor's net earnings (80%) from completed lessons
        const earnings = bookings
          .filter((b: any) => b.status === 'completed')
          .reduce((sum: number, b: any) => sum + (parseFloat(b.price) || 0) * 0.8, 0);

        setStats({
          activeStudents: allStudentIds.length,
          lessonsThisWeek,
          totalLessons,
          earnings
        });

        // Fetch student details for all students with confirmed/completed bookings
        const studentDetails = await Promise.all(
          allStudentIds.map(async (studentId) => {
            try {
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profiles/${studentId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                  signal: AbortSignal.timeout(10000),
                }
              );
              if (response.ok) {
                const data = await response.json();
                const studentBookings = bookings.filter((b: any) => b.studentId === studentId);
                return {
                  ...data.profile,
                  id: studentId,
                  totalLessons: studentBookings.filter((b: any) => b.status === 'completed').length,
                  upcomingLessons: studentBookings.filter((b: any) =>
                    b.status === 'confirmed' && parseWAT(b.date, b.startTime) > new Date()
                  ).length
                };
              }
            } catch (error) {
              console.error(`Error fetching student ${studentId}:`, error);
            }
            return null;
          })
        );

        setStudents(studentDetails.filter(Boolean));

        // Fetch past students (students with completed sessions but no upcoming sessions)
        const pastStudentIds = allStudentIds.filter(studentId => {
          const studentBookings = bookings.filter((b: any) => b.studentId === studentId);
          const hasCompleted = studentBookings.some((b: any) => b.status === 'completed');
          const hasUpcoming = studentBookings.some((b: any) =>
            b.status === 'confirmed' && parseWAT(b.date, b.startTime) > new Date()
          );
          return hasCompleted && !hasUpcoming;
        });

        const pastStudentDetails = await Promise.all(
          pastStudentIds.map(async (studentId) => {
            try {
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profiles/${studentId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                  signal: AbortSignal.timeout(10000),
                }
              );
              if (response.ok) {
                const data = await response.json();
                const studentBookings = bookings.filter((b: any) => b.studentId === studentId);
                const completedCount = studentBookings.filter((b: any) => b.status === 'completed').length;
                const lastSession = studentBookings
                  .filter((b: any) => b.status === 'completed')
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                
                return {
                  ...data.profile,
                  id: studentId,
                  totalLessons: completedCount,
                  lastSessionDate: lastSession?.date
                };
              }
            } catch (error) {
              console.error(`Error fetching past student ${studentId}:`, error);
            }
            return null;
          })
        );

        setPastStudents(pastStudentDetails.filter(Boolean));
      }

      // Check if tutor has set any availability slots. GET /availability/:id
      // always responds with { schedule: { Monday: {...}, ... }, timezone }
      // — even the "nothing configured yet" default — never a top-level
      // `availability` or `slots` field, so the old
      // `availData.availability || availData.slots || availData` chain
      // always fell through to the whole (always-truthy) response object.
      // That made availabilitySet true for every tutor immediately,
      // including ones who'd never touched the Availability tab — the
      // "please set your availability" prompt could never actually show.
      try {
        const tutorId = profile.id || profile.userId;
        const availRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/availability/${tutorId}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (availRes.ok) {
          const availData = await availRes.json();
          const days = Object.values(availData?.schedule || {}) as { enabled?: boolean; slots?: unknown[] }[];
          const hasRealAvailability = days.some((day) => day?.enabled && (day.slots?.length ?? 0) > 0);
          setAvailabilitySet(hasRealAvailability);
        }
      } catch {
        // non-critical — leave as false
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Could not load your sessions. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionTier = async (accessToken: string) => {
    try {
      const tutorId = profile.id || profile.userId;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/${tutorId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubscriptionTier(data.tier || 'basic');
      } else {
        console.error('Failed to fetch subscription tier:', response.status, response.statusText);
        toast.error('Something went wrong. Please try again.');
        setSubscriptionTier('basic'); // Set default on error
      }
    } catch (error) {
      console.error('Error fetching subscription tier:', error);
      toast.error('Something went wrong. Please try again.');
      setSubscriptionTier('basic'); // Set default on error
    }
  };

  const getVerificationStatusInfo = () => {
    const status = profile.verificationStatus;
    
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badge: 'Pending Verification',
          badgeVariant: 'secondary' as const,
          title: 'Verification In Progress',
          message: 'Your profile is being reviewed by our team. This typically takes 2-3 business days.',
        };
      case 'verified':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badge: 'Verified',
          badgeVariant: 'default' as const,
          title: 'Profile Verified!',
          message: 'You can now accept bookings and connect with students.',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badge: 'Rejected',
          badgeVariant: 'destructive' as const,
          title: 'Verification Rejected',
          message: profile.rejectionReason || 'Your application needs additional review.',
        };
      case 'under_appeal':
        return {
          icon: AlertTriangle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badge: 'Under Appeal',
          badgeVariant: 'secondary' as const,
          title: 'Appeal Under Review',
          message: 'Your appeal is being reviewed by our team.',
        };
      default:
        return null;
    }
  };

  const verificationInfo = getVerificationStatusInfo();
  const isVerified = profile.verificationStatus === 'verified';

  // Map activeTab to tutor navigation items
  const mapTabToNav = (tab: string): string => {
    const mapping: Record<string, string> = {
      'overview': 'home',
      'profile': 'home',

      'availability': 'schedule',
      'bookings': 'sessions',
      'content': 'resources',
      'bookshop': 'resources',
      'performance': 'students',
      'payouts': 'earnings',
      'resources': 'home',
      'reporting': 'students',
      'reviews': 'home',
    };
    return mapping[tab] || 'home';
  };

  const handleNavChange = (navId: string) => {
    const reverseMapping: Record<string, string> = {
      'home': 'overview',
      'schedule': 'availability',
      'sessions': 'bookings',
      'resources': 'content',
      'students': 'performance',
      'earnings': 'payouts',
    };
    const tabValue = reverseMapping[navId] || 'overview';
    setActiveTab(tabValue);
  };

  // Handle adding parent role
  const handleBecomeParent = async () => {
    if (!session?.access_token) return;
    
    setIsAddingParentRole(true);
    setParentRoleError(null);
    setParentRoleSuccess(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/role-management/add-role`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id || profile.userId,
            newRole: 'parent',
            roleData: {
              name: '',
              createdVia: 'add_role_feature',
            },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setParentRoleSuccess(true);

        // Wait briefly for role propagation, then switch to Parent dashboard.
        setTimeout(() => {
          if (onRoleSwitch) {
            onRoleSwitch('parent');
            return;
          }

          if (onRoleAdded) {
            onRoleAdded();
            return;
          }

          window.location.href = window.location.pathname + window.location.search;
        }, 1500);
      } else {
        setParentRoleError(data.error || 'Failed to add parent role');
      }
    } catch (err) {
      console.error('Error adding parent role:', err);
      toast.error('Something went wrong. Please try again.');
      setParentRoleError('An error occurred while adding the parent role');
    } finally {
      setIsAddingParentRole(false);
    }
  };

  // Check if user can become a parent (doesn't already have parent role)
  const canBecomeParent = !availableRoles?.includes('parent');

  useEffect(() => {
    const userId = profile.id || profile.userId;
    if (!userId) return;

    const congratsKey = `kfa_role_congrats_tutor_to_parent_${userId}`;
    const alreadyShown = localStorage.getItem(congratsKey) === 'true';

    if (!canBecomeParent && availableRoles && availableRoles.length > 1 && !alreadyShown) {
      setShowRoleCongrats(true);
      // Mark as shown immediately so it is one-time across sign-ins.
      localStorage.setItem(congratsKey, 'true');
    }
  }, [availableRoles, canBecomeParent, profile.id, profile.userId]);

  const handleDismissCongrats = (type: 'role' | 'verification' = 'role') => {
    if (type === 'role') {
      setShowRoleCongrats(false);
    } else {
      setShowVerificationCongrats(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('TutorDashboard - Become Parent Check:');
    console.log('  availableRoles:', availableRoles);
    console.log('  canBecomeParent:', canBecomeParent);
    console.log('  session exists:', !!session);
    console.log('  Show button?', session && canBecomeParent);
  }, [availableRoles, canBecomeParent, session]);

  // Registration gate: every tutor must have a profile photo and at least one
  // document before they can use the dashboard. The gate checks on mount and
  // lets already-complete tutors straight through.
  if (session && !gateComplete) {
    return (
      <TutorVerificationGate
        session={session}
        profile={profile}
        onComplete={() => setGateComplete(true)}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <MobileNavigation
        userType="tutor"
        activeTab={mapTabToNav(activeTab)}
        onTabChange={handleNavChange}
        notificationCount={notificationCount}
        messageCount={0}
      />

      {/* Header - Hidden on mobile */}
      <header className="hidden lg:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <KFALogo />
          <div className="flex items-center gap-4">
            {/* Bookshop Button - Prominent */}
            <Button
              onClick={() => setActiveTab('bookshop')}
              className="text-white h-10 px-6 shadow-md hover:shadow-lg transition-shadow"
              style={{ backgroundColor: '#5d9827' }}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Bookshop
            </Button>
            {/* Resources Button - Prominent */}
            <Button
              onClick={() => setActiveTab('content')}
              className="text-white h-10 px-6 shadow-md hover:shadow-lg transition-shadow"
              style={{ backgroundColor: '#5d9827' }}
            >
              <Library className="w-4 h-4 mr-2" />
              Resources
            </Button>
            {session && (
              <NotificationCenter session={session} userId={profile.id || profile.userId} />
            )}
            {availableRoles && availableRoles.length > 1 && onRoleSwitch && (
              <RoleSwitcher
                currentRole={profile.role}
                availableRoles={availableRoles}
                onRoleSwitch={onRoleSwitch}
                userName={profile.full_name || profile.firstName || profile.name || 'User'}
              />
            )}
            <AvatarUpload
              session={session}
              photoUrl={livePhotoUrl ?? profile.photoUrl}
              name={profile.full_name || profile.firstName || profile.name || 'Tutor'}
              onUploaded={setLivePhotoUrl}
            />
            <span className="text-sm text-gray-600">Welcome, {(profile.full_name || profile.firstName || profile.name || 'Tutor').split(' ')[0]}</span>
            {verificationInfo && (
              <Badge variant={verificationInfo.badgeVariant}>
                {verificationInfo.badge}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 lg:py-8 pb-20 lg:pb-8">
        {/* Verification Status Alert - hidden once verified (congrats card handles that) */}
        {verificationInfo && !isVerified && (
          <Alert className={`mb-4 lg:mb-6 ${verificationInfo.bgColor} ${verificationInfo.borderColor}`}>
            <verificationInfo.icon className={`h-4 w-4 ${verificationInfo.color}`} />
            <AlertDescription className="text-gray-800">
              <strong>{verificationInfo.title}</strong>
              <p className="mt-1">{verificationInfo.message}</p>
              {profile.verificationStatus === 'pending' && (
                <p className="mt-2 text-sm">
                  You'll receive an email notification once your profile is reviewed.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-4 lg:mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              {/* Avatar — only visible on mobile (desktop uses the header) */}
              <div className="lg:hidden">
                <AvatarUpload
                  session={session}
                  photoUrl={livePhotoUrl ?? profile.photoUrl}
                  name={profile.full_name || profile.firstName || profile.name || 'Tutor'}
                  onUploaded={setLivePhotoUrl}
                />
              </div>
              <h1 className="text-2xl lg:text-3xl">Tutor Dashboard</h1>
            </div>
            {/* Bookshop and Resources Buttons - Mobile/Tablet */}
            <div className="lg:hidden flex gap-2">
              <Button
                onClick={() => setActiveTab('bookshop')}
                className="text-white h-10 px-4 shadow-md"
                style={{ backgroundColor: '#5d9827' }}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Bookshop
              </Button>
              <Button
                onClick={() => setActiveTab('content')}
                className="text-white h-10 px-4 shadow-md"
                style={{ backgroundColor: '#5d9827' }}
              >
                <Library className="w-4 h-4 mr-2" />
                Resources
              </Button>
            </div>
          </div>
          <p className="text-gray-600 text-sm lg:text-base">
            Manage your students, schedule lessons, and track teaching outcomes
          </p>
        </div>



        {/* Become a Parent Card - Prominent at top */}
        {session && canBecomeParent && (
          <Card className="mb-6 border-purple-200 border-2 bg-purple-50 shadow-lg">
            <CardContent className="pt-6">
              {parentRoleSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Role added successfully!</strong> Refreshing your dashboard...
                  </AlertDescription>
                </Alert>
              )}

              {parentRoleError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{parentRoleError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div 
                  className="p-4 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: '#625d9c20' }}
                >
                  <User className="w-10 h-10 md:w-12 md:h-12" style={{ color: '#625d9c' }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl mb-2" style={{ color: '#625d9c' }}>
                    Become a Parent on Knowledge Fons Academy
                  </h2>
                  <p className="text-sm md:text-base text-gray-700 mb-4">
                    Manage your children's learning and book tutoring sessions
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 mb-4">
                    {[
                      'Add and manage child profiles',
                      'Book tutoring sessions easily',
                      'Track your children\'s progress',
                      'Access learning resources',
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#625d9c' }} />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleBecomeParent}
                  disabled={isAddingParentRole || parentRoleSuccess}
                  className="w-full md:w-auto text-white h-12 px-8 text-base flex-shrink-0"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  {isAddingParentRole ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Role...
                    </>
                  ) : parentRoleSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Parent Role Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Become a Parent
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Switcher Info Card - Show when user has multiple roles */}
        {session && !canBecomeParent && availableRoles && availableRoles.length > 1 && showRoleCongrats && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: '#3b82f620' }}
                >
                  <User className="w-8 h-8" style={{ color: '#3b82f6' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg mb-1" style={{ color: '#3b82f6' }}>
                    You have both Tutor and Parent roles! 🎉
                  </h3>
                  <p className="text-sm text-gray-700">
                    Switch between your Tutor and Parent dashboards anytime using the <strong>Role Switcher</strong> in the top-right corner of your screen.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  {onRoleSwitch && (
                    <Button
                      onClick={() => onRoleSwitch('parent')}
                      className="w-full md:w-auto text-white h-10 px-6"
                      style={{ backgroundColor: '#625d9c' }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Switch to Parent Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissCongrats('role')}
                    className="md:w-auto"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Congratulations Card - Show once when tutor is verified */}
        {session && (profile.verificationStatus === 'verified' || profile.verificationStatus === 'approved') && showVerificationCongrats && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: '#10b98120' }}
                >
                  <CheckCircle className="w-8 h-8" style={{ color: '#10b981' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg mb-1" style={{ color: '#10b981' }}>
                    Congratulations! You're verified! 🎊
                  </h3>
                  <p className="text-sm text-gray-700">
                    Your tutor profile has been verified and approved. You can now start accepting bookings and building your student base.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismissCongrats('verification')}
                  className="md:w-auto"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unreported sessions banner */}
        {unreportedCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📝</span>
              <p className="text-sm text-amber-800">
                You have <strong>{unreportedCount}</strong> completed session{unreportedCount > 1 ? 's' : ''} awaiting a report.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 text-xs hover:bg-amber-50"
              onClick={() => typeof onTabChange === 'function' && onTabChange('reports')}>
              Write Reports
            </Button>
          </div>
        )}

        {/* Stats with Date Filter */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* Date Filter - Multi-Select */}
            <div className="pb-3 mb-4 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Filter by:</span>
                </div>
                
                <MultiSelectFilter
                  options={[
                    { value: 1, label: 'January' },
                    { value: 2, label: 'February' },
                    { value: 3, label: 'March' },
                    { value: 4, label: 'April' },
                    { value: 5, label: 'May' },
                    { value: 6, label: 'June' },
                    { value: 7, label: 'July' },
                    { value: 8, label: 'August' },
                    { value: 9, label: 'September' },
                    { value: 10, label: 'October' },
                    { value: 11, label: 'November' },
                    { value: 12, label: 'December' }
                  ]}
                  selectedValues={selectedMonths}
                  onChange={setSelectedMonths}
                  placeholder="Select Months"
                  allLabel="All Months"
                />
                
                <MultiSelectFilter
                  options={[2023, 2024, 2025, 2026, 2027].map(year => ({ value: year, label: year.toString() }))}
                  selectedValues={selectedYears}
                  onChange={setSelectedYears}
                  placeholder="Select Years"
                  allLabel="All Years"
                />
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-sm px-3"
                  onClick={() => {
                    const now = new Date();
                    setSelectedYears([now.getFullYear()]);
                    setSelectedMonths([now.getMonth() + 1]);
                  }}
                >
                  Reset to Current
                </Button>
              </div>
              
              {/* Selected filters badges */}
              <div className="flex flex-wrap items-center gap-2">
                <SelectedFilterBadges
                  options={[
                    { value: 1, label: 'Jan' },
                    { value: 2, label: 'Feb' },
                    { value: 3, label: 'Mar' },
                    { value: 4, label: 'Apr' },
                    { value: 5, label: 'May' },
                    { value: 6, label: 'Jun' },
                    { value: 7, label: 'Jul' },
                    { value: 8, label: 'Aug' },
                    { value: 9, label: 'Sep' },
                    { value: 10, label: 'Oct' },
                    { value: 11, label: 'Nov' },
                    { value: 12, label: 'Dec' }
                  ]}
                  selectedValues={selectedMonths}
                  onRemove={(month) => setSelectedMonths(selectedMonths.filter(m => m !== month))}
                  onClearAll={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                />
                <SelectedFilterBadges
                  options={[2023, 2024, 2025, 2026, 2027].map(year => ({ value: year, label: year.toString() }))}
                  selectedValues={selectedYears}
                  onRemove={(year) => setSelectedYears(selectedYears.filter(y => y !== year))}
                  onClearAll={() => setSelectedYears([2023, 2024, 2025, 2026, 2027])}
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 border">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <TutorStatsSection stats={stats} setActiveTab={setActiveTab} />
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 hidden lg:inline-flex overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>

            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TutorOverviewTab
              session={session}
              students={students}
              loading={loading}
              stats={stats}
              profile={{ ...profile, availabilitySet }}
              onViewBookings={() => setActiveTab('bookings')}
              onViewAvailability={() => setActiveTab('availability')}
              onViewPayouts={() => setActiveTab('payouts')}
              onViewPerformance={() => setActiveTab('performance')}
              onViewMessages={() => setActiveTab('messages')}
              onViewProfile={() => setActiveTab('profile')}
            />
          </TabsContent>

          <TabsContent value="profile">
            {session && (
              <div className="space-y-6">
                {/* Profile photo — always visible, click to change */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <AvatarUpload
                        session={session}
                        photoUrl={livePhotoUrl ?? profile.photoUrl}
                        name={profile.full_name || profile.firstName || profile.name || 'Tutor'}
                        size="lg"
                        onUploaded={setLivePhotoUrl}
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{profile.full_name || profile.firstName || profile.name || 'Tutor'}</p>
                        <p className="text-sm text-gray-500 mt-0.5">Click your avatar to upload a new profile photo</p>
                        <p className="text-xs text-gray-400 mt-0.5">Max 2MB · JPG, PNG, WebP</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Suspense fallback={<TabFallback />}>
                  <TutorProfileEditor
                    session={session}
                    tutorId={profile.id || profile.userId}
                    currentProfile={profile}
                    onProfileUpdated={fetchDashboardData}
                  />
                  <GoogleCalendarSetup session={session} />
                </Suspense>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages">
            {session && (
              <Card>
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>Communicate with parents and students</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<TabFallback />}>
                    <Chatroom
                      session={session}
                      userId={profile.id || profile.userId || ''}
                      userName={profile.full_name || profile.email || 'Tutor'}
                      userRole="tutor"
                    />
                  </Suspense>
                </CardContent>
              </Card>
            )}
            {!session && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Loading messaging...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>


          <TabsContent value="availability">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <TutorAvailabilityManager session={session} tutorId={profile.id || profile.userId} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <BookingManager session={session} userRole="tutor" userId={profile.id || profile.userId} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-6">
              {/* Lesson History */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    <CardTitle>Lesson History</CardTitle>
                  </div>
                  <CardDescription>
                    Completed lessons for {new Date(selectedYears[0], selectedMonths[0] - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : lessonHistory.length > 0 ? (
                    <div className="space-y-3">
                      {lessonHistory.map((lesson: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <BookOpen className="w-4 h-4 text-green-600" />
                                <span className="text-sm">{lesson.subject || 'Lesson'}</span>
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Completed
                                </Badge>
                                {lesson.assessed && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    Assessed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                Student: {lesson.studentName || `ID: ${lesson.studentId || 'N/A'}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Date: {new Date(`${lesson.date}T12:00:00+01:00`).toLocaleDateString('en-GB', { timeZone: WAT_TIMEZONE, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                {lesson.startTime && ` at ${formatRawTimeWAT(lesson.startTime)}`}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-sm">{formatNaira(lesson.price || '0')}</p>
                              {lesson.status === 'completed' && !lesson.reportSubmitted && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                                  onClick={() => {
                                    if (typeof onTabChange === 'function') {
                                      onTabChange('reports');
                                    }
                                  }}
                                >
                                  Write Report
                                </Button>
                              )}
                              {!lesson.assessed && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setAssessmentBooking(lesson);
                                    setShowAssessmentForm(true);
                                  }}
                                  className="text-white text-xs"
                                  style={{ backgroundColor: '#625d9c' }}
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  Assess Student
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No lesson history for the selected period</p>
                      <p className="text-sm mt-2">Try selecting a different month or year</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Students */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <CardTitle>Past Students</CardTitle>
                  </div>
                  <CardDescription>
                    Students with completed lessons but no upcoming sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : pastStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pastStudents.map((student: any) => (
                        <div key={student.id} className="bg-white p-4 rounded-lg border hover:border-purple-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{student.full_name || 'Unknown Student'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {student.totalLessons} lesson{student.totalLessons !== 1 ? 's' : ''} completed
                              </p>
                              {student.lastSessionDate && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Last session: {new Date(student.lastSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No past students for the selected period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <TutorPerformanceDashboard session={session} tutorId={profile.id || profile.userId} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="payouts">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <TutorPayoutDashboard session={session} tutorId={profile.id || profile.userId} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="resources">
            <Suspense fallback={<TabFallback />}>
              <ResourcesHub session={session} userId={profile.id || profile.userId || ''} userRole="tutor" />
            </Suspense>
          </TabsContent>

          <TabsContent value="curriculum">
            <Suspense fallback={<TabFallback />}>
              <TutorCurriculumViewer session={session} />
            </Suspense>
          </TabsContent>

          <TabsContent value="reporting">
            <Tabs defaultValue="session-reports" className="space-y-6">
              <TabsList>
                <TabsTrigger value="session-reports">Session Reports</TabsTrigger>
                <TabsTrigger value="analytics">Analytics & Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="session-reports">
                {session && (
                  <Suspense fallback={<TabFallback />}>
                    <TutorSessionReports
                      tutorId={profile.id || profile.userId}
                      accessToken={session.access_token}
                    />
                  </Suspense>
                )}
              </TabsContent>

              <TabsContent value="analytics">
                {session && (
                  <Suspense fallback={<TabFallback />}>
                    <AdvancedReporting
                      userId={profile.id || profile.userId}
                      userType="tutor"
                      accessToken={session.access_token}
                    />
                  </Suspense>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="reviews">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <TutorReviewsTab
                  accessToken={session.access_token}
                  tutorId={profile.id || profile.userId}
                />
              </Suspense>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            {session && (
              <DocumentManager
                session={session}
                userId={profile.id || profile.userId}
                userRole="tutor"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Assessment Modal */}
        {showAssessmentForm && assessmentBooking && session && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <StudentAssessmentForm
                  bookingId={assessmentBooking.id}
                  studentId={assessmentBooking.studentId}
                  studentName={assessmentBooking.studentName || 'Student'}
                  subject={assessmentBooking.subject || 'Lesson'}
                  sessionDate={assessmentBooking.date}
                  tutorId={profile.id || profile.userId}
                  accessToken={session.access_token}
                  onComplete={() => {
                    setShowAssessmentForm(false);
                    setAssessmentBooking(null);
                    // Refresh dashboard data
                    if (session?.access_token) {
                      fetchDashboardData(session.access_token);
                    }
                  }}
                  onCancel={() => {
                    setShowAssessmentForm(false);
                    setAssessmentBooking(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}