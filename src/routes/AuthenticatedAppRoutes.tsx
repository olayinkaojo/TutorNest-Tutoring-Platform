import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AdminDashboard } from '../components/AdminDashboard';
import ErrorBoundary from '../components/ErrorBoundary';
import { Button } from '../components/ui/button';
import { ParentDashboard } from '../components/ParentDashboard';
import { StudentDashboard } from '../components/StudentDashboard';
import { TutorDashboard } from '../components/TutorDashboard';
import { TutorSignup } from '../components/TutorSignup';
import { GoogleCalendarSetup } from '../components/GoogleCalendarSetup';
import type { NavigateTo, SignupData, UserProfile } from './types';

interface AuthenticatedAppRoutesProps {
  session: Session;
  profile: UserProfile;
  availableRoles: string[];
  signupData: SignupData | null;
  navigateTo: NavigateTo;
  onSignOut: () => Promise<void>;
  onRoleSwitch: (newRole: string) => Promise<void>;
  onRoleAdded: () => void;
  onSignupSuccess: () => Promise<void>;
  isGoogleOAuthCallback: boolean;
}

const KNOWN_ROLES = ['admin', 'parent', 'student', 'tutor'];

export function AuthenticatedAppRoutes({
  session,
  profile,
  availableRoles,
  signupData,
  navigateTo,
  onSignOut,
  onRoleSwitch,
  onRoleAdded,
  onSignupSuccess,
  isGoogleOAuthCallback,
}: AuthenticatedAppRoutesProps) {
  const buildDashboardPath = (role: string, tab?: string) => {
    if (!tab) return `/dashboard/${role}`;
    return `/dashboard/${role}/${encodeURIComponent(tab)}`;
  };

  const DashboardRouteRenderer = () => {
    const { role, tab } = useParams();

    if (!role || role !== profile.role) {
      return <Navigate to={buildDashboardPath(profile.role, tab)} replace />;
    }

    const decodedTab = tab ? decodeURIComponent(tab) : undefined;

    return (
      <ErrorBoundary>
        {profile.role === 'admin' && (
          <AdminDashboard
            profile={profile}
            onSignOut={onSignOut}
            availableRoles={availableRoles}
            onRoleSwitch={onRoleSwitch}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('admin', nextTab))}
          />
        )}
        {profile.role === 'parent' && (
          <ParentDashboard
            profile={profile}
            onSignOut={onSignOut}
            availableRoles={availableRoles}
            onRoleSwitch={onRoleSwitch}
            onBecomeTutor={() => navigateTo('/become-tutor')}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('parent', nextTab))}
          />
        )}
        {profile.role === 'student' && (
          <StudentDashboard
            initialProfile={profile}
            onSignOut={onSignOut}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('student', nextTab))}
          />
        )}
        {profile.role === 'tutor' && (
          <TutorDashboard
            profile={profile}
            onSignOut={onSignOut}
            availableRoles={availableRoles}
            onRoleSwitch={onRoleSwitch}
            onRoleAdded={onRoleAdded}
            initialTab={decodedTab}
            onTabChange={(nextTab) => navigateTo(buildDashboardPath('tutor', nextTab))}
          />
        )}
        {!KNOWN_ROLES.includes(profile.role) && (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="mb-4">Unknown Role: {profile.role}</h2>
              <p className="text-gray-600 mb-4">Please contact support.</p>
              <Button onClick={onSignOut}>Sign Out</Button>
            </div>
          </div>
        )}
      </ErrorBoundary>
    );
  };

  if (isGoogleOAuthCallback) {
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
              onSignupComplete={onSignupSuccess}
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
