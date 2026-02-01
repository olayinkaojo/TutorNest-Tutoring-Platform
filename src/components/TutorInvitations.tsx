import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Clock, CheckCircle, XCircle, User, BookOpen, Calendar, AlertTriangle } from 'lucide-react';

interface TutorInvitationsProps {
  session: any;
}

export function TutorInvitations({ session }: TutorInvitationsProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invitations/tutor`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (invitationId: string, response: 'accept' | 'decline') => {
    try {
      setResponding(invitationId);
      setError('');

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invitations/${invitationId}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ response }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to respond to invitation');
      }

      setSuccess(
        response === 'accept' 
          ? 'Invitation accepted! The parent will be notified.' 
          : 'Invitation declined.'
      );

      // Refresh invitations
      await fetchInvitations();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error responding to invitation:', err);
      setError(err.message);
    } finally {
      setResponding(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursRemaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    if (hoursRemaining === 0) return 'Expires soon';
    if (hoursRemaining === 1) return '1 hour remaining';
    if (hoursRemaining < 24) return `${hoursRemaining} hours remaining`;
    
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading invitations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Invitations</CardTitle>
            <Badge variant="secondary">{invitations.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No pending invitations</p>
              <p className="text-sm mt-2">
                Parents will be able to invite you once your profile is verified
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => {
                const timeRemaining = getTimeRemaining(invitation.expiresAt);
                const isUrgent = new Date(invitation.expiresAt).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;

                return (
                  <Card key={invitation.id} className={isUrgent ? 'border-amber-200 bg-amber-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3>New Student Request</h3>
                            {isUrgent && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Received {new Date(invitation.sentAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {timeRemaining}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Student Name</p>
                            <p className="text-sm text-gray-600">{invitation.studentInfo?.name}</p>
                          </div>
                        </div>

                        {invitation.studentInfo?.yearGroup && (
                          <div className="flex items-start gap-3">
                            <BookOpen className="w-4 h-4 mt-0.5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">Year Group</p>
                              <p className="text-sm text-gray-600">{invitation.studentInfo.yearGroup}</p>
                            </div>
                          </div>
                        )}

                        {invitation.studentInfo?.subjects && invitation.studentInfo.subjects.length > 0 && (
                          <div className="flex items-start gap-3">
                            <BookOpen className="w-4 h-4 mt-0.5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">Subjects</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {invitation.studentInfo.subjects.map((subject: string) => (
                                  <Badge key={subject} variant="outline" className="text-xs">
                                    {subject}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {isUrgent && (
                        <Alert className="mb-4 bg-amber-100 border-amber-300">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800 text-sm">
                            This invitation will expire soon. Please respond as soon as possible to maintain your response rate.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleResponse(invitation.id, 'accept')}
                          disabled={responding === invitation.id}
                          className="text-white"
                          style={{ backgroundColor: '#5d9827' }}
                        >
                          {responding === invitation.id ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleResponse(invitation.id, 'decline')}
                          disabled={responding === invitation.id}
                          variant="outline"
                        >
                          {responding === invitation.id ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Response SLA:</strong> Please respond to invitations within 72 hours. 
          Your response rate affects your profile visibility and is shown to parents.
        </AlertDescription>
      </Alert>
    </div>
  );
}