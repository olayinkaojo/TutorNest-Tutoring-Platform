import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface Strike {
  id: string;
  userId: string;
  reason: string;
  severity: string;
  timestamp: string;
  expiresAt: string;
  active: boolean;
}

interface UserStrikesProps {
  session: any;
  userId: string;
}

export function UserStrikes({ session, userId }: UserStrikesProps) {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrikes();
  }, [userId]);

  const fetchStrikes = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/moderation/strikes/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch strikes');

      const data = await response.json();
      setStrikes(data.strikes || []);
    } catch (err) {
      console.error('Error fetching strikes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeStrikes = strikes.filter(s => s.active);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (strikes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Account Standing: Good
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            No strikes on record. Keep up the good work!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Account Strikes
          {activeStrikes.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {activeStrikes.length} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeStrikes.length > 0 && (
          <div className="mb-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-900 mb-1">
                Active Strikes: {activeStrikes.length}
              </p>
              <p className="text-sm text-amber-700">
                {activeStrikes.length >= 3
                  ? 'Your account is under review. Further violations may result in suspension.'
                  : 'Please review our policies to avoid further strikes.'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {strikes.map((strike) => (
            <div
              key={strike.id}
              className={`p-4 rounded-lg border ${
                strike.active ? getSeverityColor(strike.severity) : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="font-medium text-sm">{strike.reason}</p>
                </div>
                {strike.active ? (
                  <Badge variant="destructive" className="text-xs">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Expired</Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Issued {new Date(strike.timestamp).toLocaleDateString()}</span>
                {strike.active && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Expires in {getDaysUntilExpiry(strike.expiresAt)} days</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-xs text-gray-500">
          <p>
            ℹ️ Strikes expire after 90 days of good behavior. View our{' '}
            <a href="#" className="text-blue-600 hover:underline">
              No-Show Policy
            </a>{' '}
            for more details.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
