import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { Gift, Mail, Copy, Check, UserPlus, Clock, CheckCircle } from 'lucide-react';

interface ReferralCredit {
  id: string;
  inviterEmail: string;
  inviteeEmail: string;
  status: 'pending' | 'completed' | 'expired';
  creditAmount: number;
  appliedAt?: string;
  expiryDate: string;
  createdAt: string;
}

interface ReferralSystemProps {
  userId: string;
  userEmail: string;
}

export function ReferralSystem({ userId, userEmail }: ReferralSystemProps) {
  const [referrals, setReferrals] = useState<ReferralCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = `https://app.knowledgefonsacademy.com/signup?ref=${userId}`;

  useEffect(() => {
    fetchReferrals();
  }, [userId]);

  const fetchReferrals = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/referrals/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setReferrals(data.referrals);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteeEmail || !inviteeEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/referrals/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            inviterId: userId,
            inviterEmail: userEmail,
            inviteeEmail: inviteeEmail.toLowerCase().trim(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`Referral invitation sent to ${inviteeEmail}!`);
        setInviteeEmail('');
        fetchReferrals();
      } else {
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const totalEarned = completedReferrals * 25; // £25 per completed referral

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">£{totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {completedReferrals} completed referral{completedReferrals !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{pendingReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting signup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{completedReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Successfully referred
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Refer Friends & Earn £25
          </CardTitle>
          <CardDescription>
            Share Knowledge Fons Academy with friends and you'll both receive £25 credit when they subscribe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4>How it works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Share your unique referral link or send an invitation via email</li>
              <li>Your friend signs up and subscribes to any Knowledge Fons Academy plan</li>
              <li>You both receive £25 credit automatically applied to your accounts</li>
            </ol>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label>Your Referral Link</Label>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleCopyLink}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Send Invitation */}
          <div className="space-y-2">
            <Label htmlFor="inviteeEmail">Send Email Invitation</Label>
            <form onSubmit={handleSendInvite} className="flex gap-2">
              <Input
                id="inviteeEmail"
                type="email"
                placeholder="friend@example.com"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                disabled={sending}
              />
              <Button type="submit" disabled={sending}>
                <Mail className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>
            Track the status of your referral invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading referrals...</p>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                You haven't sent any referrals yet. Start earning credits by inviting friends!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{referral.inviteeEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Sent {new Date(referral.createdAt).toLocaleDateString()}
                      {referral.status === 'pending' && (
                        <> • Expires {new Date(referral.expiryDate).toLocaleDateString()}</>
                      )}
                      {referral.status === 'completed' && referral.appliedAt && (
                        <> • Completed {new Date(referral.appliedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">£{referral.creditAmount.toFixed(2)}</span>
                    {referral.status === 'pending' && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {referral.status === 'completed' && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    {referral.status === 'expired' && (
                      <Badge variant="outline">Expired</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
