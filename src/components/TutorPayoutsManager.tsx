import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Wallet, ArrowDownToLine, TrendingUp, Clock } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Balance {
  tutorId: string;
  pendingBalance: number;
  availableBalance: number;
  totalEarnings: number;
  totalPayouts: number;
  lastUpdated: string;
}

interface Earning {
  id: string;
  tutorId: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  platformFee: number;
  status: string;
  createdAt: string;
}

interface Payout {
  id: string;
  tutorId: string;
  amount: number;
  bankDetails: any;
  status: string;
  requestedAt: string;
  processedAt?: string;
  reference?: string;
}

export function TutorPayoutsManager() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    accountNumber: '',
    bankCode: '',
    accountName: '',
  });

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/balance`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setBalance(data.balance);
        setEarnings(data.earnings || []);
        setPayouts(data.payouts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch balance');
      }
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      toast.error(error.message || 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    if (!payoutForm.amount || !payoutForm.accountNumber || !payoutForm.bankCode) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(payoutForm.amount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (balance && amount > balance.availableBalance) {
      toast.error('Insufficient available balance');
      return;
    }

    setRequesting(true);

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/payouts/request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            bankDetails: {
              accountNumber: payoutForm.accountNumber,
              bankCode: payoutForm.bankCode,
              accountName: payoutForm.accountName,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Payout requested successfully');
        setShowPayoutDialog(false);
        setPayoutForm({
          amount: '',
          accountNumber: '',
          bankCode: '',
          accountName: '',
        });
        fetchBalance(); // Refresh balance
      } else {
        throw new Error(data.error || 'Failed to request payout');
      }
    } catch (error: any) {
      console.error('Error requesting payout:', error);
      toast.error(error.message || 'Failed to request payout');
    } finally {
      setRequesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₦{balance?.availableBalance.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₦{balance?.pendingBalance.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting session completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₦{balance?.totalEarnings.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Payouts</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₦{balance?.totalPayouts.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total withdrawn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Payout Button */}
      <Card>
        <CardHeader>
          <CardTitle>Withdraw Funds</CardTitle>
          <CardDescription>
            Request a payout to your bank account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
            <DialogTrigger asChild>
              <Button disabled={!balance || balance.availableBalance <= 0}>
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Enter your bank details to receive your funds
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    max={balance?.availableBalance || 0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: ₦{balance?.availableBalance.toLocaleString() || '0'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Your name as on bank account"
                    value={payoutForm.accountName}
                    onChange={(e) => setPayoutForm({ ...payoutForm, accountName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="0000000000"
                    value={payoutForm.accountNumber}
                    onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankCode">Bank Code</Label>
                  <Input
                    id="bankCode"
                    placeholder="e.g., 058 for GTBank"
                    value={payoutForm.bankCode}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankCode: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    <a 
                      href="https://developer.flutterwave.com/reference/supported-banks" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Find your bank code
                    </a>
                  </p>
                </div>

                <Button 
                  onClick={requestPayout} 
                  disabled={requesting}
                  className="w-full"
                >
                  {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Tabs for Earnings and Payouts */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
              <CardDescription>
                All your earnings from completed sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No earnings yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell>
                            {new Date(earning.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>₦{earning.amount.toLocaleString()}</TableCell>
                          <TableCell>₦{earning.platformFee.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(earning.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
              <CardDescription>
                Track your withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowDownToLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payout requests yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requested Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            {new Date(payout.requestedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>₦{payout.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            {payout.bankDetails?.accountNumber && 
                              `****${payout.bankDetails.accountNumber.slice(-4)}`}
                          </TableCell>
                          <TableCell>{getStatusBadge(payout.status)}</TableCell>
                          <TableCell>
                            {payout.processedAt 
                              ? new Date(payout.processedAt).toLocaleDateString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
