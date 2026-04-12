import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthPage } from '../components/AuthPage';
import { LandingPage } from '../components/LandingPage';
import { SignupRoleChooser } from '../components/SignupRoleChooser';
import { TutorSignup } from '../components/TutorSignup';
import { StudentSignup } from '../components/StudentSignup';
import { ParentSignup } from '../components/ParentSignup';
import type { NavigateTo, SignupData, UserProfile } from './types';

interface PublicAuthRoutesProps {
  staffMode: boolean;
  navigateTo: NavigateTo;
  signupData: SignupData | null;
  setSignupData: (data: SignupData | null) => void;
  session: Session | null;
  profile: UserProfile | null;
  onSignupSuccess: () => Promise<void>;
}

export function PublicAuthRoutes({
  staffMode,
  navigateTo,
  signupData,
  setSignupData,
  session,
  profile,
  onSignupSuccess,
}: PublicAuthRoutesProps) {
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
              onSignupComplete={onSignupSuccess}
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
              onSignupSuccess={onSignupSuccess}
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
              onSignupSuccess={onSignupSuccess}
            />
          </ErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
