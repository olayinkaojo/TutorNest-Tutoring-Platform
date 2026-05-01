import { Users, Calendar, BookOpen, LogOut, Plus, TrendingUp, Search, Pencil, Trash2, CreditCard, ShoppingBag, GraduationCap, ArrowRight, CheckCircle, Library, FileText, MessageSquare } from 'lucide-react';
import { ParentStatsSection } from './parent/ParentStatsSection';
import { ParentQuickActions } from './parent/ParentQuickActions';
import { ParentOverviewTab } from './parent/ParentOverviewTab';
import ErrorBoundary from './ErrorBoundary';
import TutorNestLogo from './TutorNestLogo';
import { TutorSearch } from './TutorSearch';
import { NairaIcon } from './icons/NairaIcon';
import { formatNaira } from '../utils/currency';
import { MultiSelectFilter, SelectedFilterBadges } from './MultiSelectFilter';
import { SessionReportsViewer } from './SessionReportsViewer';
import { NotificationCenter } from './NotificationCenter';
import { ProgressDashboard } from './ProgressDashboard';
import { MobileNavigation } from './MobileNavigation';
import { UpcomingLessonsCard } from './UpcomingLessonsCard';
import { CurriculumPDFViewer } from './CurriculumPDFViewer';
import { ParentContentLibrary } from './ParentContentLibrary';
import { AddChildDialog } from './AddChildDialog';
import { EditChildDialog } from './EditChildDialog';
import { ChildProfileSwitcher } from './parent/ChildProfileSwitcher';
import { SessionBookingCalendar } from './SessionBookingCalendar';
import { BookingManager } from './BookingManager';
import { Chatroom } from './Chatroom';
import { DocumentManager } from './DocumentManager';
import { ResourcesHub } from './ResourcesHub';
import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { ParentReviewsTab } from './ParentReviewsTab';
import { StudentLoginManager } from './StudentLoginManager';
import { PendingLinkRequests } from './PendingLinkRequests';
import { RoleSwitcher } from './RoleSwitcher';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Bookshop } from './Bookshop';
import { ContentLibrary } from './ContentLibrary';
import { SubscriptionsPage } from './SubscriptionsPage';
import { PaymentMethodManager } from './PaymentMethodManager';
import { ParentPaymentsDashboard } from './ParentPaymentsDashboard';
import { ParentAnalyticsDashboard } from './ParentAnalyticsDashboard';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  [key: string]: any;
}

interface ParentDashboardProps {
  profile: UserProfile;
  onSignOut: () => void;
  availableRoles?: string[];
  onRoleSwitch?: (role: string) => void;
  onBecomeTutor?: () => void; // Add callback for becoming a tutor
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

export function ParentDashboard({
  profile,
  onSignOut,
  availableRoles = [],
  onRoleSwitch,
  onBecomeTutor,
  initialTab,
  onTabChange,
}: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [bookingsSubTab, setBookingsSubTab] = useState('book-session');
  const hasMountedTabSync = useRef(false);
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [showAddChildDialog, setShowAddChildDialog] = useState(false);
  const [showEditChildDialog, setShowEditChildDialog] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  // Live session counts per child — stored separately so calculateStats doesn't mutate `children`
  // and cause an infinite re-render loop
  const [childSessionCounts, setChildSessionCounts] = useState<Record<string, { upcoming: number; completed: number }>>({});
  // Initialize from localStorage to persist across page refreshes
  const [activeChildId, setActiveChildId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`tutornest_active_child_${profile.id || profile.userId}`);
  });
  const [subscriptionTier, setSubscriptionTier] = useState('basic');
  const [isAddingTutorRole, setIsAddingTutorRole] = useState(false);
  const [tutorRoleError, setTutorRoleError] = useState<string | null>(null);
  const [tutorRoleSuccess, setTutorRoleSuccess] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
  const [showRoleCongrats, setShowRoleCongrats] = useState(false);

  const validTabs = new Set([
    'overview',
    'find-tutors',
    'bookings',
    'progress',
    'session-reports',
    'curriculum',
    'messages',
    'documents',
    'bookshop',
    'resources',
    'payments',
    'analytics',
    'reviews',
  ]);

  useEffect(() => {
    if (initialTab && validTabs.has(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    // Skip first run so URL-derived tab state is not overwritten by default "overview".
    if (!hasMountedTabSync.current) {
      hasMountedTabSync.current = true;
      return;
    }
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);
  const [stats, setStats] = useState({
    totalChildren: 0,
    lessonsScheduled: 0,
    completedLessons: 0,
    totalSpent: 0
  });

  // Track tutor to message with
  const [initialMessageTutor, setInitialMessageTutor] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Check if user can become a tutor (doesn't already have tutor role)
  const canBecomeTutor = !availableRoles.includes('tutor');

  // Check if this is the first time seeing multi-role congratulations
  useEffect(() => {
    // Use user-specific key to track if they've seen the congratulations message
    const userId = profile.id || profile.userId;
    if (!userId) return;

    const userCongratsKey = `tutornest_role_congrats_parent_to_tutor_${userId}`;
    const hasSeenCongrats = localStorage.getItem(userCongratsKey);
    
    // Show congratulations if:
    // 1. User hasn't seen it before for this account
    // 2. User has multiple roles (not just parent)
    // 3. User can't become a tutor (meaning they already are one)
    if (!hasSeenCongrats && !canBecomeTutor && availableRoles.length > 1) {
      setShowRoleCongrats(true);
      // Mark as shown immediately so this appears only once across future sign-ins.
      localStorage.setItem(userCongratsKey, 'true');
    }
  }, [availableRoles, canBecomeTutor, profile.id, profile.userId]);

  // Handler to dismiss the congratulations message
  const handleDismissCongrats = () => {
    setShowRoleCongrats(false);
  };

  // Debug log for available roles
  useEffect(() => {
    console.log('ParentDashboard - availableRoles:', availableRoles);
    console.log('ParentDashboard - Should show RoleSwitcher?', availableRoles.length > 1);
  }, [availableRoles]);

  // Get session for TutorSearch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, [supabase]);

  // Load children when session is available
  useEffect(() => {
    if (session?.access_token) {
      loadChildren();
      loadSubscription();
    }
  }, [session]);

  // Sync active child when children list loads or changes.
  // Uses functional setState so activeChildId is NOT in the dep array —
  // this prevents a re-run (and potential reset) every time the user
  // switches the active child.
  useEffect(() => {
    if (children.length === 0) return;
    const userId = profile.id || profile.userId;
    setActiveChildId((prev: string | null) => {
      const stillExists = prev != null && children.some((c: { id: string }) => c.id === prev);
      if (stillExists) return prev; // keep the selection intact
      // Default to first child on initial load or after deletion
      const firstId = children[0].id;
      if (userId) localStorage.setItem(`tutornest_active_child_${userId}`, firstId);
      return firstId;
    });
  }, [children, profile.id, profile.userId]);

  // Calculate stats when children data, filter, or active child changes
  useEffect(() => {
    if (session?.access_token) {
      calculateStats();
    }
  }, [children, selectedYears, selectedMonths, session, activeChildId]);

  const calculateStats = async () => {
    if (!session?.access_token || children.length === 0) return;

    try {
      // Fetch bookings for every child so we can also populate upcoming counts on each card
      const bookingsPromises = children.map(child =>
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings?studentId=${child.id}`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        ).then(res => res.ok ? res.json() : { bookings: [] })
      );

      const allBookingsData = await Promise.all(bookingsPromises);

      // Populate live session counts into a separate state so we don't mutate `children`
      // (mutating children would re-trigger this effect and cause an infinite loop)
      const counts: Record<string, { upcoming: number; completed: number }> = {};
      children.forEach((child, i) => {
        const childBookings: any[] = allBookingsData[i]?.bookings || [];
        counts[child.id] = {
          upcoming: childBookings.filter((b: any) =>
            (b.status === 'confirmed' || b.status === 'pending') &&
            new Date(b.date) >= new Date()
          ).length,
          completed: childBookings.filter((b: any) => b.status === 'completed').length,
        };
      });
      setChildSessionCounts(counts);

      // Stats scope: if a specific child is active, show only their numbers
      const relevantBookings = activeChildId
        ? (allBookingsData[children.findIndex(c => c.id === activeChildId)]?.bookings || [])
        : allBookingsData.flatMap((d: any) => d.bookings || []);

      // Filter by selected years and months
      const filteredBookings = relevantBookings.filter((b: any) => {
        const bookingDate = new Date(b.date);
        return selectedYears.includes(bookingDate.getFullYear()) &&
               selectedMonths.includes(bookingDate.getMonth() + 1);
      });

      const lessonsScheduled = filteredBookings.filter((b: any) =>
        b.status === 'confirmed' || b.status === 'pending'
      ).length;

      const completedLessons = filteredBookings.filter((b: any) =>
        b.status === 'completed'
      ).length;

      // Include confirmed (paid, upcoming) and completed (paid, done)
      const totalSpent = filteredBookings
        .filter((b: any) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum: number, b: any) => sum + (parseFloat(b.price) || 0), 0);

      setStats({
        totalChildren: children.length,
        lessonsScheduled,
        completedLessons,
        totalSpent,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const loadChildren = async () => {
    if (!session?.access_token) return;
    
    setLoadingChildren(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/parent/children/${profile.id || profile.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setChildren(data.children || []);
      } else {
        console.error('Error loading children:', data.error);
      }
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const loadSubscription = async () => {
    if (!session?.access_token) return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/${profile.id || profile.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          setSubscriptionTier(data.subscription.tierName || 'basic');
        } else {
          // No active subscription, set defaults
          setSubscriptionTier('basic');
        }
      } else {
        // Error response, set defaults
        console.error('Error loading subscription:', response.status, response.statusText);
        setSubscriptionTier('basic');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Set defaults if error
      setSubscriptionTier('basic');
    }
  };

  const handleChildAdded = () => {
    loadChildren();
  };

  const handleSwitchChild = (childId: string) => {
    setActiveChildId(childId);
    // Persist to localStorage
    localStorage.setItem(`tutornest_active_child_${profile.id || profile.userId}`, childId);
    setBookingsSubTab('book-session'); // reset to booking view when switching child
  };

  const handleAddChild = () => {
    setShowAddChildDialog(true);
  };

  const handleEditChild = (childId: string) => {
    setActiveChildId(childId);
    setShowEditChildDialog(true);
  };

  // Transform children data for ChildProfileSwitcher component
  const childProfilesForSwitcher = children.map(child => {
    const counts = childSessionCounts[child.id];
    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      age: child.age || calculateAge(child.dateOfBirth),
      yearGroup: formatGradeLevel(child.gradeLevel || ''),
      upcomingSessions: counts?.upcoming ?? 0,
      completedSessions: counts?.completed ?? 0,
      currentProgress: child.progress || 0,
    };
  });

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper function to format grade level to UK + Nigerian system
  const formatGradeLevel = (gradeLevel: string): string => {
    if (!gradeLevel) return '';
    
    // Map grade level codes to UK + Nigerian names
    const gradeMap: Record<string, string> = {
      'nursery_1': 'Nursery 1 (Pre-Primary)',
      'nursery_2': 'Nursery 2 (Pre-Primary)',
      'nursery_3': 'Nursery 3 / Reception',
      'primary_1': 'Primary 1 (P1) – Year 1',
      'primary_2': 'Primary 2 (P2) – Year 2',
      'primary_3': 'Primary 3 (P3) – Year 3',
      'primary_4': 'Primary 4 (P4) – Year 4',
      'primary_5': 'Primary 5 (P5) – Year 5',
      'primary_6': 'Primary 6 (P6) – Year 6',
      'secondary_7': 'JSS 1 (Junior Secondary 1) – Year 7',
      'secondary_8': 'JSS 2 – Year 8',
      'secondary_9': 'JSS 3 – Year 9',
      'secondary_10': 'SS 1 (Senior Secondary 1) – Year 10',
      'secondary_11': 'SS 2 – Year 11',
      'sixth_form_12': 'SS 3 – Year 12 / College',
      'sixth_form_13': 'Post-Secondary',
    };
    
    return gradeMap[gradeLevel] || gradeLevel.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const activeChild = children.find(c => c.id === activeChildId);

  // Map activeTab to parent navigation items
  const mapTabToNav = (tab: string): string => {
    const mapping: Record<string, string> = {
      'overview': 'home',
      'find-tutors': 'tutors',
      'bookings': 'bookings',
      'progress': 'reports',
      'subscription': 'subscription',
      'bookshop': 'bookshop',
      'payments': 'payments',
      'reviews': 'reviews',
    };
    return mapping[tab] || 'home';
  };

  const handleNavChange = (navId: string) => {
    const reverseMapping: Record<string, string> = {
      'home': 'overview',
      'tutors': 'find-tutors',
      'bookings': 'bookings',
      'reports': 'progress',
      'subscription': 'subscription',
      'bookshop': 'bookshop',
      'payments': 'payments',
      'reviews': 'reviews',
    };
    const tabValue = reverseMapping[navId] || 'overview';
    setActiveTab(tabValue);
  };

  // Handle adding tutor role
  const handleBecomeTutor = async () => {
    if (!session?.access_token) return;
    
    setIsAddingTutorRole(true);
    setTutorRoleError(null);
    setTutorRoleSuccess(false);

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
            newRole: 'tutor',
            roleData: {
              name: '',
              createdVia: 'add_role_feature',
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTutorRoleSuccess(true);
        // Mark that congratulations should show on tutor dashboard first load
        const userId = profile.id || profile.userId;
        localStorage.setItem(`tutornest_show_tutor_congrats_${userId}`, 'true');
        
        setTimeout(() => {
          // Instead of redirecting to signup, switch to the tutor role
          // This will show the TutorDashboard where they can complete their profile
          if (onRoleSwitch) {
            onRoleSwitch('tutor');
          } else {
            // Fallback: refresh the page to update the user's role
            window.location.reload();
          }
        }, 1500);
      } else {
        setTutorRoleError(data.error || 'Failed to add tutor role');
      }
    } catch (err) {
      console.error('Error adding tutor role:', err);
      setTutorRoleError('An error occurred while adding the tutor role');
    } finally {
      setIsAddingTutorRole(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('ParentDashboard - Become Tutor Check:');
    console.log('  availableRoles:', availableRoles);
    console.log('  canBecomeTutor:', canBecomeTutor);
    console.log('  session exists:', !!session);
    console.log('  Show button?', session && canBecomeTutor);
  }, [availableRoles, canBecomeTutor, session]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <MobileNavigation 
        userType="parent"
        activeTab={mapTabToNav(activeTab)}
        onTabChange={handleNavChange}
        notificationCount={0}
        messageCount={0}
      />

      {/* Header - Hidden on mobile */}
      <header className="hidden lg:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <TutorNestLogo />
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
              onClick={() => setActiveTab('resources')}
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
                userName={profile.full_name || profile.name || 'User'}
              />
            )}
            <span className="text-sm text-gray-600">
              Welcome, {(profile.full_name || profile.name || 'Parent').split(' ')[0]}
            </span>
            
            {/* Account Type Badge */}
            <Badge className="text-white" style={{ backgroundColor: '#625d9c' }}>
              Parent Account
            </Badge>
            
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 pb-20 lg:pb-8">
        <div className="mb-4 lg:mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-2xl lg:text-3xl">Parent Dashboard</h1>
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
                onClick={() => setActiveTab('resources')}
                className="text-white h-10 px-4 shadow-md"
                style={{ backgroundColor: '#5d9827' }}
              >
                <Library className="w-4 h-4 mr-2" />
                Resources
              </Button>
            </div>
          </div>
          <p className="text-gray-600 text-sm lg:text-base">
            Manage your children's learning journey and track their progress
          </p>
        </div>

        {/* Stats with Date Filter - shown first so the filter context is clear */}
        <ParentStatsSection
          stats={stats}
          selectedMonths={selectedMonths}
          selectedYears={selectedYears}
          setSelectedMonths={setSelectedMonths}
          setSelectedYears={setSelectedYears}
          setActiveTab={setActiveTab}
        />

        {/* Child Profile Grid - click a card to switch the active child; stats above update to reflect selection */}
        {!loadingChildren && children.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">
              Stats above reflect the <strong>selected child</strong>. Click a card to switch.
            </p>
            <ChildProfileSwitcher
              children={childProfilesForSwitcher}
              activeChildId={activeChildId}
              onSwitchChild={handleSwitchChild}
              onAddChild={handleAddChild}
              subscriptionTier={subscriptionTier}
            />
          </div>
        )}

        {/* Become a Tutor Card - Prominent at top */}
        {session && canBecomeTutor && (
          <Card className="mb-6 border-green-200 border-2 bg-green-50 shadow-lg">
            <CardContent className="pt-6">
              {tutorRoleSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Role added successfully!</strong> Redirecting you to complete your profile...
                  </AlertDescription>
                </Alert>
              )}

              {tutorRoleError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{tutorRoleError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div 
                  className="p-4 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: '#5d982720' }}
                >
                  <GraduationCap className="w-10 h-10 md:w-12 md:h-12" style={{ color: '#5d9827' }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl mb-2" style={{ color: '#5d9827' }}>
                    Become a Tutor on TutorNest
                  </h2>
                  <p className="text-sm md:text-base text-gray-700 mb-4">
                    Share your knowledge and earn by teaching students globally
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 mb-4">
                    {[
                      'Set your own schedule and rates',
                      'Connect with students globally',
                      'Track your earnings and performance',
                      'Access teaching resources and tools',
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#5d9827' }} />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={onBecomeTutor || handleBecomeTutor}
                  disabled={isAddingTutorRole || tutorRoleSuccess}
                  className="w-full md:w-auto text-white h-12 px-8 text-base flex-shrink-0"
                  style={{ backgroundColor: '#5d9827' }}
                >
                  {isAddingTutorRole ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Role...
                    </>
                  ) : tutorRoleSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Tutor Role Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Become a Tutor
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Switcher Info Card - Show when user has multiple roles */}
        {session && !canBecomeTutor && availableRoles.length > 1 && showRoleCongrats && (
          <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg mb-1" style={{ color: '#5d9827' }}>
                    🎉 Congratulations! You now have both Parent and Tutor roles!
                  </h3>
                  <p className="text-sm text-gray-700">
                    Switch between your Parent and Tutor dashboards anytime using the <strong>Role Switcher</strong> in the top-right corner of your screen.
                  </p>
                </div>
                <Button
                  onClick={handleDismissCongrats}
                  variant="ghost"
                  size="sm"
                  className="self-start md:self-center"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <ParentQuickActions setActiveTab={setActiveTab} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 hidden lg:inline-flex overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="find-tutors">Find Tutors</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="session-reports">Session Reports</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <ErrorBoundary tabName="Overview">
              <ParentOverviewTab
                children={children}
                loadingChildren={loadingChildren}
                session={session}
                activeChildId={activeChildId}
                setShowAddChildDialog={setShowAddChildDialog}
                handleEditChild={handleEditChild}
                loadChildren={loadChildren}
                onViewBookings={() => setActiveTab('bookings')}
              />
            </ErrorBoundary>
          </TabsContent>

          {/* Tutors Tab */}
          <TabsContent value="find-tutors">
            <ErrorBoundary tabName="Find Tutors">
              {!loadingChildren && children.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">Add a child profile before searching for tutors</p>
                    <Button 
                      className="text-white"
                      style={{ backgroundColor: '#625d9c' }}
                      onClick={() => {
                        setActiveTab('overview');
                        setShowAddChildDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Child
                    </Button>
                  </CardContent>
                </Card>
              ) : session && activeChildId ? (
                <div className="space-y-4">
                  {activeChild && (
                    <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white">
                            {activeChild.firstName?.[0]}{activeChild.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Searching tutors for:</p>
                            <p className="font-medium">{activeChild.firstName} {activeChild.lastName}</p>
                            <p className="text-xs text-gray-500">
                              {formatGradeLevel(activeChild.gradeLevel)} • 
                              {activeChild.subjects?.length > 0 ? ` ${activeChild.subjects.join(', ')}` : ' No subjects yet'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <TutorSearch 
                    session={session} 
                    activeChildId={activeChildId}
                    onStartConversation={(tutorId, tutorName) => {
                      // Set the initial tutor to message with
                      setInitialMessageTutor({ id: tutorId, name: tutorName });
                      // Switch to messages tab (which will auto-start the conversation)
                      setActiveTab('messages');
                    }}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Loading...</p>
                  </CardContent>
                </Card>
              )}
            </ErrorBoundary>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <ErrorBoundary tabName="Bookings">
            {!loadingChildren && children.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">Add a child profile before booking sessions</p>
                  <Button 
                    className="text-white"
                    style={{ backgroundColor: '#625d9c' }}
                    onClick={() => {
                      setActiveTab('overview');
                      setShowAddChildDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Child
                  </Button>
                </CardContent>
              </Card>
            ) : session && activeChildId ? (
              <Tabs value={bookingsSubTab} onValueChange={setBookingsSubTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="book-session">Book New Session</TabsTrigger>
                  <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
                </TabsList>

                <TabsContent value="book-session">
                  <SessionBookingCalendar
                    session={session}
                    activeChildId={activeChildId}
                    childName={activeChild ? `${activeChild.firstName} ${activeChild.lastName}` : undefined}
                    childSubjects={activeChild?.subjects ?? []}
                    onBookingSuccess={() => setBookingsSubTab('my-bookings')}
                  />
                </TabsContent>

                <TabsContent value="my-bookings">
                  <BookingManager
                    session={session}
                    userRole="parent"
                    userId={profile.id || profile.userId}
                    studentId={activeChildId ?? undefined}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
            </ErrorBoundary>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <ErrorBoundary tabName="Progress">
              {session && children.length > 0 && activeChild ? (
                <ProgressDashboard 
                  session={session} 
                  studentId={activeChild.id}
                  studentName={`${activeChild.firstName} ${activeChild.lastName}`}
                />
              ) : session && children.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">Add a child profile to view progress</p>
                    <Button 
                      className="text-white"
                      style={{ backgroundColor: '#625d9c' }}
                      onClick={() => {
                        setActiveTab('overview');
                        setShowAddChildDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Child
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Loading...</p>
                  </CardContent>
                </Card>
              )}
            </ErrorBoundary>
          </TabsContent>

          {/* Session Reports Tab */}
          <TabsContent value="session-reports">
            <ErrorBoundary tabName="Session Reports">
              {session && children.length > 0 ? (
                <SessionReportsViewer 
                  userId={profile.id || profile.userId}
                  accessToken={session.access_token}
                  viewType="parent"
                  studentId={activeChildId || undefined}
                  children={children}
                />
              ) : session && children.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">Add a child profile to view session reports</p>
                    <Button 
                      className="text-white"
                      style={{ backgroundColor: '#625d9c' }}
                      onClick={() => {
                        setActiveTab('overview');
                        setShowAddChildDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Child
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Loading...</p>
                  </CardContent>
                </Card>
              )}
            </ErrorBoundary>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <ErrorBoundary tabName="Curriculum">
              {session && children.length > 0 && activeChild ? (
                <CurriculumPDFViewer 
                  gradeLevel={activeChild.gradeLevel}
                  accessToken={session.access_token}
                  studentName={`${activeChild.firstName} ${activeChild.lastName}`}
                />
              ) : session && children.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">Add a child profile to view curriculum</p>
                    <Button 
                      className="text-white"
                      style={{ backgroundColor: '#625d9c' }}
                      onClick={() => {
                        setActiveTab('overview');
                        setShowAddChildDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Child
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-gray-500">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Loading...</p>
                      </CardContent>
                    </Card>
                  )}
            </ErrorBoundary>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            {session ? (
              <Chatroom 
                session={session}
                userId={profile.id || profile.userId}
                userName={profile.full_name || profile.name || 'Parent'}
                userRole="parent"
                initialContactId={initialMessageTutor?.id}
                initialContactName={initialMessageTutor?.name}
                initialContactRole="tutor"
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            {session ? (
              <DocumentManager
                session={session}
                userId={profile.id || profile.userId}
                userRole="parent"
                children={children}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Bookshop Tab */}
          <TabsContent value="bookshop">
            {session && (
              <Bookshop session={session} subscriptionTier={subscriptionTier} />
            )}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            {session ? (
              <ResourcesHub
                session={session}
                userId={profile.id || profile.userId}
                userRole="parent"
                gradeLevel={activeChild?.gradeLevel}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Library className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            {session && (
              <ParentPaymentsDashboard accessToken={session.access_token} />
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {session && (
              <ParentAnalyticsDashboard accessToken={session.access_token} childProfiles={children} />
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {session && (
              <ParentReviewsTab 
                accessToken={session.access_token} 
                parentId={profile.id || profile.userId}
              />
            )}
          </TabsContent>

        </Tabs>
      </main>

      {/* Add Child Dialog */}
      <AddChildDialog
        open={showAddChildDialog}
        onOpenChange={setShowAddChildDialog}
        parentId={profile.id || profile.userId}
        accessToken={session?.access_token || ''}
        onChildAdded={handleChildAdded}
      />

      {/* Edit Child Dialog */}
      <EditChildDialog
        open={showEditChildDialog}
        onOpenChange={setShowEditChildDialog}
        child={activeChild}
        accessToken={session?.access_token || ''}
        onChildUpdated={handleChildAdded}
      />
    </div>
  );
}