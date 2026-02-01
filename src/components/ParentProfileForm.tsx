import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

interface ParentProfileFormProps {
  session: any;
  onComplete: () => void;
}

export function ParentProfileForm({ session, onComplete }: ParentProfileFormProps) {
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    preferredContact: 'email' as 'email' | 'phone' | 'both',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      onComplete();
    } catch (err: any) {
      console.error('Error saving parent profile:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <h1 className="mb-2">Complete Your Parent Profile</h1>
          <p className="text-gray-600 mb-6 sm:mb-8">
            Help us personalize your experience and stay connected with your child's learning
          </p>

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="phone">Phone Number (with country code)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +1 555-123-4567, +44 20 7123 4567, +91 98765 43210"
                className="mt-2 h-12"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Include your country code (e.g., +1, +44, +91, +86, +49)</p>
            </div>

            <div>
              <Label htmlFor="address">Location / Address</Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., New York, USA or Mumbai, India"
                className="mt-2 h-12"
              />
              <p className="text-xs text-gray-500 mt-1">City and country where you're based</p>
            </div>

            <div>
              <Label htmlFor="preferredContact">Preferred Contact Method</Label>
              <Select
                value={formData.preferredContact}
                onValueChange={(value: 'email' | 'phone' | 'both') =>
                  setFormData({ ...formData, preferredContact: value })
                }
              >
                <SelectTrigger className="mt-2 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}