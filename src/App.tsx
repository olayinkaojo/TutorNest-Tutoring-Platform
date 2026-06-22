import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthBackground } from './components/AuthBackground';
import { getSupabaseClient } from './utils/supabase/client';
import { edgeFunctionHeaders, edgeFunctionUrl } from './utils/supabase-edge-fetch';
import { logger } from './utils/logger';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { PublicAuthRoutes } from './routes/PublicAuthRoutes';
import { RoleSetupRoutes } from './routes/RoleSetupRoutes';
import { AuthenticatedAppRoutes } from './routes/AuthenticatedAppRoutes';
import type { SignupData, UserProfile } from './routes/types';

const supabase = getSupabaseClient();

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [staffMode, setStaffMode] = useState(false);

  const navigateTo = (path: string, options?: { replace?: boolean }) => {
    const { replace = false } = options || {};
    const current = `${location.pathname}${location.search}`;
    if (current === path) return;
    navigate(path, { replace });
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

    // Secret staff access via ?staff in the URL — strip it immediately so it's not bookmarkable.
    if (urlParams.has('staff')) {
      setStaffMode(true);
      urlParams.delete('staff');
      const newSearch = urlParams.toString();
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate, session]);

  useEffect(() => {
    // Check for existing session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.access_token);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes.
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
      if (location.pathname !== '/select-role' && location.pathname !== '/become-tutor') {
        navigateTo('/select-role', { replace: true });
      }
      return;
    }

    const rolePath = `/dashboard/${profile.role}`;
    if (
      location.pathname !== '/become-tutor' &&
      !location.pathname.startsWith(`${rolePath}/`) &&
      location.pathname !== rolePath
    ) {
      navigateTo(rolePath, { replace: true });
    }
  }, [session, profile, location.pathname]);

  const fetchProfile = async (accessToken: string) => {
    try {
      const response = await fetch(edgeFunctionUrl('profile'), {
        headers: edgeFunctionHeaders(accessToken),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('Profile loaded', { role: data.profile?.role });
        setProfile(data.profile);

        // Fetch available roles for this user.
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

      await useFallbackProfile(accessToken);
    } finally {
      setLoading(false);
    }
  };

  const useFallbackProfile = async (accessToken: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser(accessToken);
      if (user && user.user_metadata) {
        logger.info('Using fallback profile from auth metadata');
        const fallbackProfile = {
          id: user.id,
          userId: user.id,
          email: user.email || '',
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
      const response = await fetch(edgeFunctionUrl(`role-management/user-roles/${userId}`), {
        headers: edgeFunctionHeaders(accessToken),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      } else if (response.status === 401) {
        const {
          data: { session: freshSession },
        } = await supabase.auth.getSession();
        if (freshSession && freshSession.access_token !== accessToken) {
          fetchAvailableRoles(freshSession.access_token, userId);
        } else {
          logger.warn('Token expired and refresh failed - user must re-authenticate');
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
      const response = await fetch(edgeFunctionUrl('role-management/switch-role'), {
        method: 'POST',
        headers: {
          ...edgeFunctionHeaders(session.access_token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.id || profile.userId,
          targetRole: newRole,
        }),
      });

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
    setLoading(true);

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

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

  const handleSignOut = async (reason?: 'inactivity') => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign out regardless of API errors
    }
    // Clear all local auth state immediately — don't rely solely on onAuthStateChange
    setSession(null);
    setProfile(null);
    setAvailableRoles([]);
    localStorage.removeItem('kfa_last_active');

    if (reason === 'inactivity') {
      toast.info('You were signed out after 8 hours of inactivity.', { duration: 6000 });
    }

    // Hard redirect — clears all React component state and subscriptions
    window.location.replace('/auth');
  };

  useInactivityTimeout(() => handleSignOut('inactivity'), !!session);

  const handleProfileComplete = () => {
    if (session) {
      fetchProfile(session.access_token);
    }
  };

  const handleRoleAdded = () => {
    if (session) {
      fetchProfile(session.access_token);
    }
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
      <PublicAuthRoutes
        staffMode={staffMode}
        navigateTo={navigateTo}
        signupData={signupData}
        setSignupData={setSignupData}
        session={session}
        profile={profile}
        onSignupSuccess={handleSignupSuccess}
      />
    );
  }

  if (!profile || !profile.role) {
    return (
      <RoleSetupRoutes
        session={session}
        profile={profile}
        signupData={signupData}
        navigateTo={navigateTo}
        onProfileComplete={handleProfileComplete}
        onSignupSuccess={handleSignupSuccess}
      />
    );
  }

  return (
    <AuthenticatedAppRoutes
      session={session}
      profile={profile}
      availableRoles={availableRoles}
      signupData={signupData}
      navigateTo={navigateTo}
      onSignOut={handleSignOut}
      onRoleSwitch={handleRoleSwitch}
      onRoleAdded={handleRoleAdded}
      onSignupSuccess={handleSignupSuccess}
    />
  );
}
