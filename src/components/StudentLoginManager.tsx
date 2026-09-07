import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { UserPlus, Key, Copy, Check, AlertCircle, LogIn, UserX, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Domain history: tutornest.org (earliest) -> tutornest.com ->
// knowledgefonsacademy.com. A login's email is generated once, at
// creation, and never revisited — so a child set up before the current
// domain still shows one of these. Surfaced here so a parent doesn't have
// to notice by accident; "Regenerate Login" fixes it in one click.
const OUTDATED_EMAIL_DOMAINS = ['tutornest.org', 'tutornest.com'];

interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  studentLoginEnabled?: boolean;
  studentEmail?: string;
  studentUserId?: string;
}

interface StudentLoginManagerProps {
  child: ChildProfile;
  accessToken: string;
  onUpdate: () => void;
}

export function StudentLoginManager({ child, accessToken, onUpdate }: StudentLoginManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [generateEmail, setGenerateEmail] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [regenerated, setRegenerated] = useState<{ email: string; password: string } | null>(null);

  const isOutdatedEmail = !!child.studentEmail && OUTDATED_EMAIL_DOMAINS.some((d) => child.studentEmail!.includes(d));

  const handleEnableLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedPassword('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/enable-login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            childId: child.id,
            studentEmail: generateEmail ? null : studentEmail,
            generatePassword: true
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable student login');
      }

      setSuccess('Student login enabled successfully!');
      setGeneratedPassword(data.temporaryPassword);
      onUpdate(); // update parent state without closing — let user copy the password
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableLogin = async () => {
    if (!confirm(`Are you sure you want to disable student login for ${child.firstName}? They will no longer be able to access their student dashboard.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/disable-login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            childId: child.id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable student login');
      }

      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setResetPassword('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              childId: child.id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      const temporaryPassword = data.temporaryPassword || data.password || data.generatedPassword;

      if (!temporaryPassword) {
        throw new Error('Password reset completed, but no temporary password was returned. Please try again.');
      }

      setSuccess('Temporary password generated successfully. Share it securely with your child.');
      setResetPassword(temporaryPassword);
      setShowResetPanel(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateLogin = async () => {
    if (!confirm(
      `This creates a brand new login for ${child.firstName} with a fresh email and password — ` +
      `the current login (${child.studentEmail || 'existing account'}) will stop working immediately. Continue?`
    )) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setRegenerated(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/regenerate-login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ childId: child.id })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate student login');
      }

      setRegenerated({ email: data.studentEmail, password: data.temporaryPassword });
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      {child.studentLoginEnabled ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="flex items-center gap-1">
              <LogIn className="size-3" />
              Student Login Active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              disabled={loading}
            >
              <Key className="size-4 mr-1" />
              Generate New Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateLogin}
              disabled={loading}
            >
              <RefreshCw className="size-4 mr-1" />
              Regenerate Login
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableLogin}
              disabled={loading}
            >
              <UserX className="size-4 mr-1" />
              Disable Login
            </Button>
            {child.studentEmail && (
              <div className="text-sm text-muted-foreground">
                Email: <span className="font-mono">{child.studentEmail}</span>
              </div>
            )}
          </div>

          {isOutdatedEmail && !regenerated && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertCircle className="size-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                This login was created before a domain update and won't match our current address —
                click <strong>Regenerate Login</strong> above to issue {child.firstName} a fresh one.
              </AlertDescription>
            </Alert>
          )}

          {regenerated && (
            <Alert className="border-green-300 bg-green-50">
              <Check className="size-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-green-800">Login regenerated</p>
                  <p className="text-sm">Email: <span className="font-mono">{regenerated.email}</span></p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">Password: <span className="font-mono font-bold">{regenerated.password}</span></p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${regenerated.email} / ${regenerated.password}`)}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-green-700">
                    The previous login no longer works — share these new credentials with {child.firstName}.
                  </p>
                  <Button size="sm" variant="outline" className="mt-1 h-6 text-xs" onClick={() => setRegenerated(null)}>
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="size-4 mr-1" />
              Enable Student Login
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable Student Login for {child.firstName}</DialogTitle>
              <DialogDescription>
                Create a student account so {child.firstName} can access their own dashboard
                to view lessons, track progress, and earn achievements.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && generatedPassword && (
              <>
                <Alert>
                  <Check className="size-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{success}</p>
                      <div className="space-y-1">
                        <p className="text-sm">Email: <span className="font-mono">{studentEmail || 'Auto-generated'}</span></p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm">Password: <span className="font-mono font-bold">{generatedPassword}</span></p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(generatedPassword)}
                          >
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ⚠️ Save these credentials! Share them with {child.firstName} to access their student dashboard.
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <Button onClick={() => { setDialogOpen(false); }}>
                    Done — copied the password
                  </Button>
                </DialogFooter>
              </>
            )}

            {!success && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-option">Student Email</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="auto-email"
                          checked={generateEmail}
                          onChange={() => setGenerateEmail(true)}
                        />
                        <Label htmlFor="auto-email" className="cursor-pointer">
                          Auto-generate email address
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="custom-email"
                          checked={!generateEmail}
                          onChange={() => setGenerateEmail(false)}
                        />
                        <Label htmlFor="custom-email" className="cursor-pointer">
                          Use custom email
                        </Label>
                      </div>
                    </div>
                  </div>

                  {!generateEmail && (
                    <div className="space-y-2">
                      <Label htmlFor="student-email">Email Address</Label>
                      <Input
                        id="student-email"
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder={`${child.firstName.toLowerCase()}@example.com`}
                      />
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertDescription className="text-xs">
                      A temporary password will be generated. You can share it with {child.firstName} and they can change it later.
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEnableLogin}
                    disabled={loading || (!generateEmail && !studentEmail)}
                  >
                    {loading ? 'Creating...' : 'Enable Student Login'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Reset password result panel — stays visible until dismissed */}
      {showResetPanel && resetPassword && (
        <Alert className="mt-2 border-green-300 bg-green-50">
          <Check className="size-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium text-green-800">New temporary password generated</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-green-900">{resetPassword}</span>
                <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => copyToClipboard(resetPassword)}>
                  {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                </Button>
              </div>
              <p className="text-xs text-green-700">Share this with {child.firstName}. This message will disappear when you dismiss it.</p>
              <Button size="sm" variant="outline" className="mt-1 h-6 text-xs" onClick={() => { setShowResetPanel(false); setResetPassword(''); setSuccess(''); }}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {error && !dialogOpen && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && resetPassword && (
        <Alert className="mt-2">
          <Check className="size-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">{success}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">Temporary Password:</span>
                <span className="font-mono font-bold text-sm">{resetPassword}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(resetPassword)}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
