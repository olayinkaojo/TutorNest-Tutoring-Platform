import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorSignup, setShowTutorSignup] = useState(false);
  const [showStudentSignup, setShowStudentSignup] = useState(false);
  const [showParentSignup, setShowParentSignup] = useState(false);
  const [showRoleChooser, setShowRoleChooser] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [signupData, setSignupData] = useState<{ email: string; password: string; name: string; phone?: string } | null>(null);
  // True when the URL contains Google OAuth callback params (?code=&state=)
  const [googleOAuthCallback, setGoogleOAuthCallback] = useState(false);
  const [staffMode, setStaffMode] = useState(false);

  useEffect(() => {
    // Check URL params for signup routing
    const urlParams = new URLSearchParams(window.location.search);

    // Detect Google OAuth callback (?code=xxx&state=xxx)
    if (urlParams.get('code') && urlParams.get('state')) {
      setGoogleOAuthCallback(true);
    }

    // Secret staff access via ?staff in the URL — strip it immediately so it's not bookmarkable
    if (urlParams.has('staff')) {
      setStaffMode(true);
      urlParams.delete('staff');
      const newSearch = urlParams.toString();
      window.history.replaceState({}, document.title, newSearch ? `?${newSearch}` : window.location.pathname);
    }

    // Check URL params for tutor signup
    if (urlParams.get('signup') === 'tutor') {
      setShowTutorSignup(true);
    } else if (urlParams.get('signup') === 'student') {
      setShowStudentSignup(true);
    }
    
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

    return () => subscription.unsubscribe();
  }, []);

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
        
        // Reset all signup flags to ensure we show the dashboard
        setShowTutorSignup(false);
        setShowStudentSignup(false);
        setShowParentSignup(false);
        setShowRoleChooser(false);
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

  // Not signed in
  if (!session) {
    // Show role chooser if requested
    if (showRoleChooser) {
      return (
        <ErrorBoundary>
          <SignupRoleChooser
            onParentSelected={() => {
              setShowRoleChooser(false);
              setShowParentSignup(true);
            }}
            onStudentSelected={() => {
              setShowRoleChooser(false);
              setShowStudentSignup(true);
            }}
            onTutorSelected={() => {
              setShowRoleChooser(false);
              setShowTutorSignup(true);
            }}
            onBackToSignIn={() => setShowRoleChooser(false)}
          />
        </ErrorBoundary>
      );
    }
    
    // Show tutor signup page if requested
    if (showTutorSignup) {
      return (
        <ErrorBoundary>
          <TutorSignup 
            onBackToSignIn={() => {
              setShowTutorSignup(false);
              setSignupData(null);
            }}
            initialData={signupData}
            session={session}
            existingProfile={profile}
            onSignupComplete={handleSignupSuccess}
          />
        </ErrorBoundary>
      );
    } else if (showStudentSignup) {
      return (
        <ErrorBoundary>
          <StudentSignup 
            onBackToSignIn={() => {
              setShowStudentSignup(false);
              setSignupData(null);
            }}
            initialData={signupData}
            onSignupSuccess={handleSignupSuccess}
          />
        </ErrorBoundary>
      );
    } else if (showParentSignup) {
      return (
        <ErrorBoundary>
          <ParentSignup 
            onBackToSignIn={() => {
              setShowParentSignup(false);
              setSignupData(null);
            }}
            initialData={signupData}
            onSignupSuccess={handleSignupSuccess}
          />
        </ErrorBoundary>
      );
    }
    
    return (
      <ErrorBoundary>
        <AuthPage
          staffMode={staffMode}
          onBecomeTutor={() => setShowTutorSignup(true)}
          onBecomeStudent={() => setShowStudentSignup(true)}
          onSignupClicked={() => setShowRoleChooser(true)}
          onTutorSignupWithData={(data) => {
            setSignupData(data);
            setShowTutorSignup(true);
          }}
          onStudentSignupWithData={(data) => {
            setSignupData(data);
            setShowStudentSignup(true);
          }}
          onParentSignupWithData={(data) => {
            setSignupData(data);
            setShowParentSignup(true);
          }}
        />
      </ErrorBoundary>
    );
  }

  // Signed in but no profile/role selected
  if (!profile || !profile.role) {
    return (
      <ErrorBoundary>
        <RoleSelection
          session={session}
          currentProfile={profile}
          onComplete={handleProfileComplete}
          onTutorSelected={() => {
            // Don't sign out - keep the user logged in and just show tutor signup
            setShowTutorSignup(true);
          }}
        />
      </ErrorBoundary>
    );
  }

  // Google OAuth callback — tutor returned from Google authorization
  // GoogleCalendarSetup handles the token exchange via its own useEffect
  if (googleOAuthCallback && session) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full px-4">
            <GoogleCalendarSetup
              session={session}
              onConnectionChange={(connected) => {
                if (connected) {
                  // Token exchanged — clear callback flag and go to dashboard
                  setGoogleOAuthCallback(false);
                }
              }}
            />
            <div className="mt-4 text-center">
              <button
                className="text-sm text-gray-500 underline"
                onClick={() => {
                  setGoogleOAuthCallback(false);
                  window.history.replaceState({}, document.title, window.location.pathname);
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

  // If user is logged in and wants to complete tutor signup
  if (showTutorSignup && session && profile) {
    return (
      <ErrorBoundary>
        <TutorSignup 
          onBackToSignIn={() => {
            setShowTutorSignup(false);
            setSignupData(null);
          }}
          initialData={signupData}
          session={session}
          existingProfile={profile}
          onSignupComplete={() => {
            setShowTutorSignup(false);
            // Reload the page to refresh with new tutor role
            window.location.reload();
          }}
        />
      </ErrorBoundary>
    );
  }

  // Show appropriate dashboard based on role
  return (
    <ErrorBoundary>
      {profile.role === 'admin' && (
        <AdminDashboard 
          profile={profile} 
          onSignOut={handleSignOut}
          availableRoles={availableRoles}
          onRoleSwitch={handleRoleSwitch}
        />
      )}
      {profile.role === 'parent' && (
        <ParentDashboard 
          profile={profile} 
          onSignOut={handleSignOut}
          availableRoles={availableRoles}
          onRoleSwitch={handleRoleSwitch}
          onBecomeTutor={() => setShowTutorSignup(true)}
        />
      )}
      {profile.role === 'student' && (
        <StudentDashboard 
          initialProfile={profile} 
          onSignOut={handleSignOut}
        />
      )}
      {profile.role === 'tutor' && (
        <TutorDashboard 
          profile={profile} 
          onSignOut={handleSignOut}
          availableRoles={availableRoles}
          onRoleSwitch={handleRoleSwitch}
          onRoleAdded={handleRoleAdded}
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
}