import { Button } from './ui/button';
import { AuthBackground } from './AuthBackground';
import TutorNestLogo from './TutorNestLogo';
import { MessageSquare } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onBecomeTutor: () => void;
}

export function LandingPage({ onSignIn, onSignUp, onBecomeTutor }: LandingPageProps) {
  return (
    <AuthBackground className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-4xl">
        <div className="rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm sm:p-10">
          <div className="mb-6 flex justify-center sm:mb-8">
            <TutorNestLogo />
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl text-gray-900 sm:text-5xl">Find the right tutor, faster</h1>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              TutorNest connects students, parents, and tutors with safe booking, progress tracking,
              and live learning tools in one place.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2">
            <Button className="h-12 text-white" style={{ backgroundColor: '#625d9c' }} onClick={onSignIn}>
              Sign In
            </Button>
            <Button className="h-12 text-white" style={{ backgroundColor: '#5d9827' }} onClick={onSignUp}>
              Sign Up
            </Button>
          </div>

          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-[#d9edd0] bg-[#f3faee] p-4 text-center">
            <p className="text-sm text-gray-700">Want to teach and earn on TutorNest?</p>
            <button
              className="mt-2 text-sm font-medium underline"
              style={{ color: '#5d9827' }}
              onClick={onBecomeTutor}
            >
              Become a Tutor
            </button>
          </div>

          <div className="mx-auto mt-4 max-w-xl text-center">
            <a
              href="/feedback"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Share feedback on the beta
            </a>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
