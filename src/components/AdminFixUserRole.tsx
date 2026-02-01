import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function AdminFixUserRole() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFix = async () => {
    if (!email || !role) {
      setError('Please provide both email and role');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/fix-user-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userEmail: email,
            correctRole: role,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'User role fixed successfully!');
        setEmail('');
        setRole('');
      } else {
        setError(data.error || 'Failed to fix user role');
      }
    } catch (err: any) {
      console.error('Error fixing user role:', err);
      setError(err.message || 'Failed to fix user role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Fix User Role</CardTitle>
        <CardDescription>
          Correct user role assignment for accounts with incorrect roles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">User Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Correct Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="tutor">Tutor</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleFix}
          disabled={loading}
          className="w-full"
          style={{ backgroundColor: '#625d9c', color: 'white' }}
        >
          {loading ? 'Fixing...' : 'Fix User Role'}
        </Button>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Note:</strong> This will update the user's role and delete their old role-specific profile.
            The user may need to sign out and sign in again to see the changes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
