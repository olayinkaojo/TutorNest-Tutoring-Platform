import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { UserPlus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface PendingLinkRequest {
  id: string;
  studentName: string;
  studentEmail: string;
  linkToken: string;
  createdAt: string;
  expiresAt: string;
}

interface PendingLinkRequestsProps {
  accessToken: string;
  onAccept: () => void;
}

export function PendingLinkRequests({ accessToken, onAccept }: PendingLinkRequestsProps) {
  const [requests, setRequests] = useState<PendingLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPendingRequests();
  }, [accessToken]);

  const loadPendingRequests = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/pending-links`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load pending requests');
      }

      setRequests(data.requests || []);
    } catch (err: any) {
      console.error('Error loading pending requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (linkToken: string) => {
    setProcessing(linkToken);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/accept-link`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ linkToken })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept link request');
      }

      // Reload requests and notify parent component
      await loadPendingRequests();
      onAccept();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const daysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (requests.length === 0) {
    return null; // Don't show if no requests
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle className="text-lg">Pending Student Link Requests</CardTitle>
            <CardDescription>
              Students who want to link their account to yours for payment
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {requests.map((request) => {
            const days = daysUntilExpiry(request.expiresAt);
            const isExpiringSoon = days <= 2;
            
            return (
              <Card key={request.id} className={`${isExpiringSoon ? 'border-amber-300 bg-amber-50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
                          {request.studentName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-medium">{request.studentName}</h3>
                          <p className="text-sm text-gray-600">{request.studentEmail}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Requested {formatDate(request.createdAt)}
                        </span>
                        <Badge variant={isExpiringSoon ? 'destructive' : 'secondary'} className="text-xs">
                          {days > 0 ? `Expires in ${days} day${days > 1 ? 's' : ''}` : 'Expired'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAccept(request.linkToken)}
                        disabled={processing === request.linkToken || days <= 0}
                        className="text-white"
                        style={{ backgroundColor: '#5d9827' }}
                      >
                        {processing === request.linkToken ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpiringSoon && days > 0 && (
                    <Alert className="mt-3 bg-amber-100 border-amber-300">
                      <AlertDescription className="text-xs text-amber-800">
                        ⚠️ This request will expire soon! Accept it before it becomes invalid.
                      </AlertDescription>
                    </Alert>
                  )}

                  {days <= 0 && (
                    <Alert className="mt-3" variant="destructive">
                      <AlertDescription className="text-xs">
                        This request has expired. The student needs to sign up again.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Alert className="mt-4">
          <UserPlus className="size-4" />
          <AlertDescription className="text-xs">
            <strong>What happens when you accept?</strong><br />
            The student will be added to your account as a child profile, and you'll manage their billing. 
            They'll keep their own login and dashboard access.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
