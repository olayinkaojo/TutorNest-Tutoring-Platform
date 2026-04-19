import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  DollarSign,
  CreditCard,
  FileText,
  Send,
} from 'lucide-react';
import { NairaIcon } from './icons/NairaIcon';
import { formatNaira } from '../utils/currency';
import tutorAPI from '../utils/tutor-api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface TutorPayoutDashboardProps {
  session: any;
  tutorId: string;
}

interface Earning {
  id: string;
  bookingId: string;
  date: string;
  studentName: string;
  subject: string;
  lessonDuration: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  status: 'pending' | 'paid' | 'processing';
  payoutDate?: string;
}

interface Payout {
  id: string;
  amount: string;
  status: 'pending_approval' | 'approved' | 'processing' | 'paid' | 'rejected';
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  failureReason?: string;
  reference?: string;
  tutorName?: string;
}

interface PayoutSettings {
  schedule: 'weekly' | 'biweekly' | 'monthly';
  minimumAmount: number;
  bankAccountLast4?: string;
}

export function TutorPayoutDashboard({ session, tutorId }: TutorPayoutDashboardProps) {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [settings, setSettings] = useState<PayoutSettings>({
    schedule: 'weekly',
    minimumAmount: 50,
  });
  const [stats, setStats] = useState({
    totalEarnings: '0.00',
    pendingPayout: '0.00',
    paidThisMonth: '0.00',
    nextPayoutDate: '',
    bankAccountLast4: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    bankCode: '',
  });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayoutData();
    const interval = setInterval(fetchPayoutData, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchPayoutData = async () => {
    try {
      const [dashboardData, bankData, requests] = await Promise.all([
        tutorAPI.getPayoutDashboard(session.access_token),
        tutorAPI.getBankAccount(session.access_token),
        tutorAPI.getPayoutRequests(session.access_token),
      ]);

      setEarnings(dashboardData.earnings);
      setPayouts(requests.length > 0 ? requests : dashboardData.payouts);
      setStats(dashboardData.stats);
      setSettings(dashboardData.settings);
      setBankAccount(bankData);
      setError('');
    } catch (err: any) {
      console.error('Error fetching payout data:', err);
      setError(err.message || 'Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankAccount = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder || !bankForm.bankCode) {
      setError('Please fill in all bank details');
      return;
    }

    setSubmitting(true);
    try {
      await tutorAPI.updateBankAccount(
        session.access_token,
        bankForm.bankName,
        bankForm.accountNumber,
        bankForm.accountHolder,
        bankForm.bankCode
      );
      setShowBankDialog(false);
      await fetchPayoutData();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!bankAccount) {
      setError('Please add a bank account first');
      return;
    }

    setSubmitting(true);
    try {
      await tutorAPI.requestPayout(session.access_token, payoutAmount);
      setShowPayoutDialog(false);
      setPayoutAmount('');
      await fetchPayoutData();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Paid</Badge>;
      case 'approved':
        return <Badge style={{ backgroundColor: '#3b82f6', color: 'white' }}>Approved</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'pending_approval':
        return <Badge variant="outline">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const pendingPayoutAmount = parseFloat(stats.pendingPayout);
  const canRequestPayout = pendingPayoutAmount >= settings.minimumAmount && bankAccount;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <NairaIcon className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading payout information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <h2 className="mt-1">{formatNaira(stats.totalEarnings)}</h2>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payout</p>
                <h2 className="mt-1">{formatNaira(stats.pendingPayout)}</h2>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid This Month</p>
                <h2 className="mt-1">{formatNaira(stats.paidThisMonth)}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Payout</p>
                <p className="mt-1 text-lg font-medium">
                  {stats.nextPayoutDate ? formatDate(stats.nextPayoutDate) : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!bankAccount ? (
        <Alert className="bg-amber-50 border-amber-200">
          <CreditCard className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Bank Account Required:</strong> Add your bank details to request payouts.
            <Button
              variant="link"
              className="h-auto p-0 ml-2 text-amber-600 underline"
              onClick={() => setShowBankDialog(true)}
            >
              Add Bank Account <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Bank Account Verified:</strong> Account ending in {bankAccount.accountLast4}
            <Button
              variant="link"
              className="h-auto p-0 ml-2 text-green-600 underline"
              onClick={() => setShowBankDialog(true)}
            >
              Update <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Payout Schedule:</strong> {settings.schedule.charAt(0).toUpperCase() + settings.schedule.slice(1)} payouts.
          Minimum payout amount: {formatNaira(settings.minimumAmount.toString())}
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button
          onClick={() => setShowPayoutDialog(true)}
          disabled={!canRequestPayout}
          className="gap-2"
        >
          <DollarSign className="w-4 h-4" />
          Request Payout
        </Button>
        <Button variant="outline" onClick={() => setShowBankDialog(true)} className="gap-2">
          <CreditCard className="w-4 h-4" />
          {bankAccount ? 'Update' : 'Add'} Bank Account
        </Button>
      </div>

      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Earnings ({earnings.length})</TabsTrigger>
          <TabsTrigger value="requests">Payout Requests ({payouts.length})</TabsTrigger>
          <TabsTrigger value="tax">Tax Report</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
              <CardDescription>Detailed breakdown of your lesson earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <NairaIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No earnings yet</p>
                  <p className="text-sm mt-2">Complete lessons to start earning</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {earnings.map((earning) => (
                    <Card key={earning.id} className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{earning.studentName}</p>
                            <p className="text-sm text-gray-600">
                              {earning.subject} • {formatDate(earning.date)} • {earning.lessonDuration}
                            </p>
                          </div>
                          {getStatusBadge(earning.status)}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Gross Amount</p>
                            <p className="font-medium">{formatNaira(earning.grossAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Platform Fee (20%)</p>
                            <p className="font-medium text-red-600">-{formatNaira(earning.platformFee)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Net Earnings</p>
                            <p className="font-medium text-green-600">{formatNaira(earning.netAmount)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
              <CardDescription>Track your payout requests and status</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No payout requests yet</p>
                  <p className="text-sm mt-2">Request a payout when you have earnings pending</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <Card key={payout.id} className={
                      payout.status === 'rejected' ? 'border-red-200 bg-red-50' : 'bg-gray-50'
                    }>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">Payout Request</p>
                            <p className="text-sm text-gray-600">
                              Requested on {formatDate(payout.requestedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(payout.status)}
                            <p className="text-lg font-medium mt-1">{formatNaira(payout.amount)}</p>
                          </div>
                        </div>

                        {payout.status === 'approved' && (
                          <p className="text-sm text-blue-600">
                            Approved on {payout.approvedAt ? formatDate(payout.approvedAt) : 'N/A'}
                          </p>
                        )}

                        {payout.status === 'rejected' && payout.failureReason && (
                          <Alert className="mt-3 bg-white border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800 text-sm">
                              <strong>Request Rejected:</strong> {payout.failureReason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Report</CardTitle>
              <CardDescription>Annual earnings summary for tax purposes</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Tax report feature coming soon</p>
              <p className="text-sm mt-2">Download your annual earnings summary</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
            <DialogDescription>Add or update your bank account for payouts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Bank Name</Label>
              <Input
                placeholder="e.g., Access Bank"
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              />
            </div>
            <div>
              <Label>Bank Code</Label>
              <Input
                placeholder="e.g., 044"
                value={bankForm.bankCode}
                onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                placeholder="Your 10-digit account number"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Account Holder Name</Label>
              <Input
                placeholder="Name on bank account"
                value={bankForm.accountHolder}
                onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBankAccount} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>Submit a payout request for admin approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Payout Amount</Label>
              <div className="flex gap-2">
                <span className="text-2xl font-bold">₦</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  min={settings.minimumAmount}
                  step="1000"
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Available: {formatNaira(stats.pendingPayout)} (Minimum: {formatNaira(settings.minimumAmount.toString())})
              </p>
            </div>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Your request will be reviewed and approved by our admin team within 24-48 hours.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestPayout} disabled={submitting || !payoutAmount}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Alert className="bg-gray-50 border-gray-200">
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-700 text-sm">
          <strong>Platform Fee:</strong> TutorNest charges a 20% platform fee on all lesson earnings.
          This covers payment processing, insurance, customer support, and platform maintenance.
        </AlertDescription>
      </Alert>
    </div>
  );
}
