import { AuthBackground } from './AuthBackground';
import TutorNestLogo from './TutorNestLogo';
import { FeedbackForms } from './FeedbackForms';

export function FeedbackPage() {
  return (
    <AuthBackground className="flex items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <TutorNestLogo />
          </a>
          <a
            href="/"
            className="text-sm text-white/80 hover:text-white transition-colors underline underline-offset-2"
          >
            ← Back to home
          </a>
        </div>
        <FeedbackForms />
      </div>
    </AuthBackground>
  );
}
