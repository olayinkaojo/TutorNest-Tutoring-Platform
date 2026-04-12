import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { Button } from './components/ui/button';
import { AuthPage } from './components/AuthPage';
import { RoleSelection } from './components/RoleSelection';
import { SignupRoleChooser } from './components/SignupRoleChooser';
import { ParentDashboard } from './components/ParentDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { TutorDashboard } from './components/TutorDashboard';
import { TutorSignup } from './components/TutorSignup';
import { StudentSignup } from './components/StudentSignup';
import { ParentSignup } from './components/ParentSignup';
import { AuthBackground } from './components/AuthBackground';
import { LandingPage } from './components/LandingPage';
import { getSupabaseClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { logger } from './utils/logger';
import { GoogleCalendarSetup } from './components/GoogleCalendarSetup';

interface UserProfile {
  id: string;
  userId?: string;
  email: string;
  role: string;
  full_name?: string;
  availableRoles?: string[];
}

const supabase = getSupabaseClient();

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [signupData, setSignupData] = useState<{ email: string; password: string; name: string; phone?: string } | null>(null);
  const [staffMode, setStaffMode] = useState(false);

  const navigateTo = (path: string, options?: { replace?: boolean }) => {
    const { replace = false } = options || {};
    const current = `${location.pathname}${location.search}`;
    if (current === path) return;
    navigate(path, { replace });
  };

  const getDashboardTabFromPath = (role: string) => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[0] === 'dashboard' && segments[1] === role) {
      return decodeURIComponent(segments[2]);
    }
    return undefined;
  };

  const buildDashboardPath = (role: string, tab?: string) => {
    if (!tab) return `/dashboard/${role}`;
    return `/dashboard/${role}/${encodeURIComponent(tab)}`;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);

    // Preserve legacy deep links.
    if (!session) {
      if (urlParams.get('signup') === 'tutor' && location.pathname !== '/signup/tutor') {
        navigate('/signup/tutor', { replace: true });
        return;
      }
      if (urlParams.get('signup') === 'student' && location.pathname !== '/signup/student') {
        navigate('/signup/student', { replace: true });
        return;
      }
    }

    // Secret staff access via ?staff in the URL — strip it immediately so it's not bookmarkable
    if (urlParams.has('staff')) {
      setStaffMode(true);
      urlParams.delete('staff');
      const newSearch = urlParams.toString();
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate, session]);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.access_token);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.debug('Auth state changed', { event: _event, hasSession: !!session });
      setSession(session);
      if (session) {
        fetchProfile(session.access_token);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      if (location.pathname.startsWith('/dashboard') || location.pathname === '/select-role') {
        navigateTo('/auth', { replace: true });
      }
      return;
    }

    if (!profile || !profile.role) {
      if (location.pathname !== '/select-role') {
        navigateTo('/select-role', { replace: true });
      }
      return;
    }

    const rolePath = `/dashboard/${profile.role}`;
    if (!location.pathname.startsWith(`${rolePath}/`) && location.pathname !== rolePath) {
      navigateTo(rolePath, { replace: true });
    }
  }, [session, profile, location.pathname]);

  const fetchProfile = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(30000), // Increased to 30 seconds to allow for cold starts
        }
      );

      if (response.ok) {
        const data = await response.json();
        logger.debug('Profile loaded', { role: data.profile?.role });
        setProfile(data.profile);
        
        // Fetch available roles for this user
        if (data.profile?.id || data.profile?.userId) {
          fetchAvailableRoles(accessToken, data.profile.id || data.profile.userId);
        }
      } else {
        logger.warn('Profile fetch failed, using fallback', { status: response.status });
        await useFallbackProfile(accessToken);
      }
    } catch (error: unknown) {
      const e = error as Error;
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        logger.warn('Profile fetch timed out, using fallback');
      } else if (e.message === 'Failed to fetch') {
        logger.warn('Network error fetching profile, using fallback');
      } else {
        logger.error('Unexpected error fetching profile', { message: e.message });
      }
      
      // Try fallback to auth user metadata
      await useFallbackProfile(accessToken);
    } finally {
      setLoading(false);
    }
  };

  const useFallbackProfile = async (accessToken: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
      if (user && user.user_metadata) {
        logger.info('Using fallback profile from auth metadata');
        // Create a basic profile from user metadata
        const fallbackProfile = {
          id: user.id,
          userId: user.id,
          email: user.email,
          role: user.user_metadata.role || null,
          full_name: user.user_metadata.name || user.user_metadata.full_name || null,
        };
        setProfile(fallbackProfile);
        
        if (fallbackProfile.id) {
          fetchAvailableRoles(accessToken, fallbackProfile.id);
        }
      }
    } catch (fallbackError: unknown) {
      logger.error('Fallback profile fetch failed', { message: (fallbackError as Error).message });
    }
  };

  const fetchAvailableRoles = async (accessToken: string, userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/role-management/user-roles/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      } else if (response.status === 401) {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession && freshSession.access_token !== accessToken) {
          fetchAvailableRoles(freshSession.access_token, userId);
        } else {
          logger.warn('Token expired and refresh failed — user must re-authenticate');
        }
      } else {
        logger.warn('Failed to fetch available roles', { status: response.status });
      }
    } catch (error: unknown) {
      logger.error('Error fetching available roles', { message: (error as Error).message });
    }
  };

  const handleRoleSwitch = async (newRole: string) => {
    if (!session || !profile) return;
    
    logger.info('Switching role', { newRole });
    
    try {
      // Update currentRole in backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/role-management/switch-role`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: profile.id || profile.userId,
            targetRole: newRole 
          }),
        }
      );

      if (response.ok) {
        await fetchProfile(session.access_token);
      } else {
        const errorData = await response.json();
        logger.error('Failed to switch role', { error: errorData });
      }
    } catch (error: unknown) {
      logger.error('Error switching role', { message: (error as Error).message });
    }
  };

  const handleSignupSuccess = async () => {
    console.log('Signup successful, refreshing session...');
    setLoading(true);
    
    try {
      // Get the current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        setSession(currentSession);
        await fetchProfile(currentSession.access_token);
        setSignupData(null);
      } else {
        window.location.reload();
      }
    } catch (error: unknown) {
      logger.error('Error refreshing session after signup', { message: (error as Error).message });
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigateTo('/auth', { replace: true });
  };

  const handleProfileComplete = () => {
    if (session) {
      fetchProfile(session.access_token);
    }
  };

  const handleRoleAdded = () => {
    // Re-fetch profile and available roles when a new role is added
    if (session) {
      fetchProfile(session.access_token);
    }
  };

  const isGoogleOAuthCallback =
    new URLSearchParams(location.search).has('code') &&
    new URLSearchParams(location.search).has('state');

  const DashboardRouteRenderer = () => {
    const { role, tab } = useParams();

    if (!profile || !profile.role) return null;

    if (!role || role !== profile.role) {
      return <Navigate to={buildDashboardPath(profile.role, tab)} replace />;
    }

    const decodedTab = tab ? decodeURIComponent(tab) : undefined;

    return (
      <ErrorBoundary>
        {profile.role === 'admin' && (
          <AdminDashboard
            profile={profile}
            onSignOut={handleSignOut}
            availableRoles={availableRoles}
            onRoleSwitch={handleRoleSwitch}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('admin', nextTab))}
          />
        )}
        {profile.role === 'parent' && (
          <ParentDashboard
            profile={profile}
            onSignOut={handleSignOut}
            availableRoles={availableRoles}
            onRoleSwitch={handleRoleSwitch}
            onBecomeTutor={() => navigateTo('/become-tutor')}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('parent', nextTab))}
          />
        )}
        {profile.role === 'student' && (
          <StudentDashboard
            initialProfile={profile}
            onSignOut={handleSignOut}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('student', nextTab))}
          />
        )}
        {profile.role === 'tutor' && (
          <TutorDashboard
            profile={profile}
            onSignOut={handleSignOut}
            availableRoles={availableRoles}
            onRoleSwitch={handleRoleSwitch}
            onRoleAdded={handleRoleAdded}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('tutor', nextTab))}
          />
        )}
        {!['admin', 'parent', 'student', 'tutor'].includes(profile.role) && (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="mb-4">Unknown Role: {profile.role}</h2>
              <p className="text-gray-600 mb-4">Please contact support.</p>
              <Button onClick={handleSignOut}>Sign Out</Button>
            </div>
          </div>
        )}
      </ErrorBoundary>
    );
  };


  if (loading) {
    return (
      <AuthBackground className="flex items-center justify-center">
        <div className="text-center bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <div 
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }}
          ></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </AuthBackground>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <LandingPage
                onSignIn={() => navigateTo('/auth')}
                onSignUp={() => navigateTo('/signup')}
                onBecomeTutor={() => navigateTo('/signup/tutor')}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/auth"
          element={
            <ErrorBoundary>
              <AuthPage
                staffMode={staffMode}
                onBecomeTutor={() => navigateTo('/signup/tutor')}
                onBecomeStudent={() => navigateTo('/signup/student')}
                onSignupClicked={() => navigateTo('/signup')}
                onTutorSignupWithData={(data) => {
                  setSignupData(data);
                  navigateTo('/signup/tutor');
                }}
                onStudentSignupWithData={(data) => {
                  setSignupData(data);
                  navigateTo('/signup/student');
                }}
                onParentSignupWithData={(data) => {
                  setSignupData(data);
                  navigateTo('/signup/parent');
                }}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/signup"
          element={
            <ErrorBoundary>
              <SignupRoleChooser
                onParentSelected={() => navigateTo('/signup/parent')}
                onStudentSelected={() => navigateTo('/signup/student')}
                onTutorSelected={() => navigateTo('/signup/tutor')}
                onBackToSignIn={() => navigateTo('/auth')}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/signup/tutor"
          element={
            <ErrorBoundary>
              <TutorSignup
                onBackToSignIn={() => {
                  setSignupData(null);
                  navigateTo('/auth');
                }}
                initialData={signupData}
                session={session}
                existingProfile={profile}
                onSignupComplete={handleSignupSuccess}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/signup/student"
          element={
            <ErrorBoundary>
              <StudentSignup
                onBackToSignIn={() => {
                  setSignupData(null);
                  navigateTo('/auth');
                }}
                initialData={signupData}
                onSignupSuccess={handleSignupSuccess}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/signup/parent"
          element={
            <ErrorBoundary>
              <ParentSignup
                onBackToSignIn={() => {
                  setSignupData(null);
                  navigateTo('/auth');
                }}
                initialData={signupData}
                onSignupSuccess={handleSignupSuccess}
              />
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  if (!profile || !profile.role) {
    return (
      <Routes>
        <Route
          path="/select-role"
          element={
            <ErrorBoundary>
              <RoleSelection
                session={session}
                currentProfile={profile}
                onComplete={handleProfileComplete}
                onTutorSelected={() => navigateTo('/become-tutor')}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/become-tutor"
          element={
            <ErrorBoundary>
              <TutorSignup
                onBackToSignIn={() => navigateTo('/select-role')}
                initialData={signupData}
                session={session}
                existingProfile={profile}
                onSignupComplete={handleSignupSuccess}
              />
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/select-role" replace />} />
      </Routes>
    );
  }

  if (isGoogleOAuthCallback && session) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full px-4">
            <GoogleCalendarSetup
              session={session}
              onConnectionChange={(connected) => {
                if (connected) {
                  navigateTo(`/dashboard/${profile.role}`, { replace: true });
                }
              }}
            />
            <div className="mt-4 text-center">
              <button
                className="text-sm text-gray-500 underline"
                onClick={() => {
                  navigateTo(`/dashboard/${profile.role}`, { replace: true });
                }}
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <Routes>
      <Route
        path="/become-tutor"
        element={
          <ErrorBoundary>
            <TutorSignup
              onBackToSignIn={() => navigateTo(buildDashboardPath(profile.role), { replace: true })}
              initialData={signupData}
              session={session}
              existingProfile={profile}
              onSignupComplete={() => navigateTo(buildDashboardPath(profile.role), { replace: true })}
            />
          </ErrorBoundary>
        }
      />
      <Route path="/dashboard/:role" element={<DashboardRouteRenderer />} />
      <Route path="/dashboard/:role/:tab" element={<DashboardRouteRenderer />} />
      <Route path="*" element={<Navigate to={buildDashboardPath(profile.role)} replace />} />
    </Routes>
  );
}