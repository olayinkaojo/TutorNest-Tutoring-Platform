import { WorksheetsHub } from './WorksheetsHub';
import { AuthBackground } from './AuthBackground';
import KFALogo from './KFALogo';
import { Button } from './ui/button';

interface PublicWorksheetsPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onBackHome: () => void;
}

/** The public, no-signup-required entry point — same WorksheetsHub the
 * parent dashboard uses, just with an anonymous (null) access token and
 * sign-up/sign-in handed off to the app's normal auth routes. */
export function PublicWorksheetsPage({ onSignIn, onSignUp, onBackHome }: PublicWorksheetsPageProps) {
  return (
    <AuthBackground className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-6 sm:flex-row sm:justify-between">
          <button onClick={onBackHome} className="focus:outline-none">
            <KFALogo />
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSignIn}>Sign In</Button>
            <Button size="sm" className="text-white" style={{ backgroundColor: '#5d9827' }} onClick={onSignUp}>
              Sign Up
            </Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl p-4 sm:p-8">
          <WorksheetsHub accessToken={null} onSignUp={onSignUp} onSignIn={onSignIn} />
        </div>
      </div>
    </AuthBackground>
  );
}
