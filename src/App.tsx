import { useState, useEffect } from 'react';
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
import { AdminFixUserRole } from './components/AdminFixUserRole';
import { getSupabaseClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import wallpaperBg from 'figma:asset/c2a495c4aec3903270b747684d5b5dd5d609b3da.png';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  availableRoles?: string[];
  [key: string]: any;
}

const supabase = getSupabaseClient();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorSignup, setShowTutorSignup] = useState(false);
  const [showStudentSignup, setShowStudentSignup] = useState(false);
  const [showParentSignup, setShowParentSignup] = useState(false);
  const [showRoleChooser, setShowRoleChooser] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [signupData, setSignupData] = useState<{ email: string; password: string; name: string; phone?: string } | null>(null);

  useEffect(() => {
    // Check URL params for special pages
    const urlParams = new URLSearchParams(window.location.search);
    
    // Admin fix tool
    if (urlParams.get('admin') === 'fix-role') {
      // Show fix tool (will be rendered below)
      setLoading(false);
      return;
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
      console.log('Auth state changed:', _event, !!session);
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
        console.log('Profile data:', data.profile);
        setProfile(data.profile);
        
        // Fetch available roles for this user
        if (data.profile?.id || data.profile?.userId) {
          fetchAvailableRoles(accessToken, data.profile.id || data.profile.userId);
        }
      } else {
        console.warn('Failed to fetch profile from server:', response.status, response.statusText);
        
        // If backend profile doesn't exist, try to get user data from Supabase Auth
        await useFallbackProfile(accessToken);
      }
    } catch (error: any) {
      // Check if it's a timeout or network error
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        console.log('Profile fetch timed out, using fallback authentication...');
      } else if (error.message === 'Failed to fetch') {
        console.log('Network issue, using fallback authentication...');
      } else {
        console.error('Error fetching profile:', error);
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
        console.log('Using fallback profile from auth user metadata:', user.user_metadata);
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
    } catch (fallbackError) {
      console.error('Error fetching fallback profile:', fallbackError);
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
        console.log('Available roles fetched:', data.roles);
        setAvailableRoles(data.roles || []);
      } else if (response.status === 401) {
        console.log('Token expired, attempting to refresh session...');
        // Try to get a fresh session
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession && freshSession.access_token !== accessToken) {
          console.log('Got fresh token, retrying...');
          fetchAvailableRoles(freshSession.access_token, userId);
        } else {
          console.error('Failed to refresh token, user may need to sign in again');
        }
      } else {
        console.error('Failed to fetch available roles:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching available roles:', error);
    }
  };

  const handleRoleSwitch = async (newRole: string) => {
    if (!session || !profile) return;
    
    console.log('Switching role to:', newRole);
    
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
        console.log('Role switched successfully to:', newRole);
        // Refresh the profile to get updated role
        await fetchProfile(session.access_token);
      } else {
        const errorData = await response.json();
        console.error('Failed to switch role:', errorData);
      }
    } catch (error) {
      console.error('Error switching role:', error);
    }
  };

  const handleSignupSuccess = async () => {
    console.log('Signup successful, refreshing session...');
    setLoading(true);
    
    try {
      // Get the current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        console.log('Session found, fetching profile...');
        setSession(currentSession);
        await fetchProfile(currentSession.access_token);
        
        // Reset all signup flags to ensure we show the dashboard
        setShowTutorSignup(false);
        setShowStudentSignup(false);
        setShowParentSignup(false);
        setShowRoleChooser(false);
        setSignupData(null);
      } else {
        console.log('No session found after signup, reloading...');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing session after signup:', error);
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

  // Check for admin fix tool
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === 'fix-role') {
    return (
      <div 
        className="min-h-screen py-12 px-4"
        style={{
          backgroundImage: `url(${wallpaperBg})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 400px',
        }}
      >
        <AdminFixUserRole />
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${wallpaperBg})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 400px',
        }}
      >
        <div className="text-center bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <div 
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }}
          ></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
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