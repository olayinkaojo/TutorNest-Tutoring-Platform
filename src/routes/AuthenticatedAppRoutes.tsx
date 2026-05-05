import { lazy, Suspense } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { Button } from '../components/ui/button';
import { TutorSignup } from '../components/TutorSignup';
import { GoogleCalendarSetup } from '../components/GoogleCalendarSetup';
import type { NavigateTo, SignupData, UserProfile } from './types';

const AdminDashboard = lazy(() => import('../components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ParentDashboard = lazy(() => import('../components/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const StudentDashboard = lazy(() => import('../components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const TutorDashboard = lazy(() => import('../components/TutorDashboard').then(m => ({ default: m.TutorDashboard })));

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
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }} />
            <p className="text-gray-500 text-sm">Loading dashboard…</p>
          </div>
        </div>
      }>
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
      </Suspense>
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
                  setTimeout(() => {
                    navigateTo(`/dashboard/${profile.role}/profile`, { replace: true });
                  }, 1500);
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

  // Preserves Google OAuth code+state in the URL when redirecting so
  // GoogleCalendarSetup can detect and exchange the code.
  function WildcardRedirect({ role, buildDashboardPath }: { role: string; buildDashboardPath: (r: string, t?: string) => string }) {
    const loc = useLocation();
    const params = new URLSearchParams(loc.search);
    if (params.has('code') && params.has('state') && role === 'tutor') {
      return <Navigate to={`/dashboard/tutor/profile${loc.search}`} replace />;
    }
    return <Navigate to={buildDashboardPath(role)} replace />;
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
              onSignupComplete={async () => {
                await onSignupSuccess();
                navigateTo(buildDashboardPath('tutor'), { replace: true });
              }}
            />
          </ErrorBoundary>
        }
      />
      <Route path="/dashboard/:role" element={<DashboardRouteRenderer />} />
      <Route path="/dashboard/:role/:tab" element={<DashboardRouteRenderer />} />
      <Route path="*" element={<WildcardRedirect role={profile.role} buildDashboardPath={buildDashboardPath} />} />
    </Routes>
  );
}
