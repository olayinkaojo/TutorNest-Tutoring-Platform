import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { UserPlus, Key, Copy, Check, AlertCircle, LogIn, UserX } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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
      
      setTimeout(() => {
        setDialogOpen(false);
        onUpdate();
      }, 3000);
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
