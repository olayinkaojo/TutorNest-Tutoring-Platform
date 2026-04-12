import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { RoleSelection } from '../components/RoleSelection';
import { TutorSignup } from '../components/TutorSignup';
import type { NavigateTo, SignupData, UserProfile } from './types';

interface RoleSetupRoutesProps {
  session: Session;
  profile: UserProfile | null;
  signupData: SignupData | null;
  navigateTo: NavigateTo;
  onProfileComplete: () => void;
  onSignupSuccess: () => Promise<void>;
}

export function RoleSetupRoutes({
  session,
  profile,
  signupData,
  navigateTo,
  onProfileComplete,
  onSignupSuccess,
}: RoleSetupRoutesProps) {
  return (
    <Routes>
      <Route
        path="/select-role"
        element={
          <ErrorBoundary>
            <RoleSelection
              session={session}
              currentProfile={profile}
              onComplete={onProfileComplete}
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
              onSignupComplete={onSignupSuccess}
            />
          </ErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/select-role" replace />} />
    </Routes>
  );
}
