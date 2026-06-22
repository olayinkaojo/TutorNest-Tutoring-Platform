/**
 * Enhanced Tutor Payout Dashboard
 * Displays real-time earnings with ISO 8601 timestamps and international financial standards
 */

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
  LineChart,
  TrendingDown,
} from 'lucide-react';
import { NairaIcon } from './icons/NairaIcon';
import { formatNaira } from '../utils/currency';
import tutorAPI from '../utils/tutor-api-client';

interface TutorPayoutDashboardProps {
  session: any;
  tutorId: string;
}

interface Earning {
  id: string;
  bookingId: string;
  date: string; // ISO 8601 format
  studentName: string;
  subject: string;
  lessonDuration: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  taxWithheld: string;
  status: 'pending' | 'paid' | 'processing';
  payoutDate?: string;
  referenceId: string;
}

interface Payout {
  id: string;
  amount: string;
  status: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';
  requestedAt: string; // ISO 8601
  approvedAt?: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  reference?: string;
  batchId?: string;
  idempotencyKey?: string;
  retryCount?: number;
}

interface PayoutStats {
  totalEarnings: string;
  pendingPayout: string;
  paidThisMonth: string;
  nextPayoutDate: string;
  nextPayoutAmount: string;
  bankAccountLast4: string | null;
  averageEarningsPerLesson: string;
  totalLessonsCompleted: number;
  taxWithheldThisMonth: string;
}

export function TutorPayoutDashboard({ session, tutorId }: TutorPayoutDashboardProps) {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats>({
    totalEarnings: '0.00',
    pendingPayout: '0.00',
    paidThisMonth: '0.00',
    nextPayoutDate: '',
    nextPayoutAmount: '0.00',
    bankAccountLast4: null,
    averageEarningsPerLesson: '0.00',
    totalLessonsCompleted: 0,
    taxWithheldThisMonth: '0.00',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankAccount, setBankAccount] = useState<any>(null);

  // Format ISO 8601 timestamp to readable date
  const formatISODate = (isoDate: string): string => {
    if (!isoDate) return 'N/A';
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Format ISO 8601 timestamp to readable datetime
  const formatISODateTime = (isoDate: string): string => {
    if (!isoDate) return 'N/A';
    try {
      const date = new Date(isoDate);
      return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Get next Friday (payout day)
  const getNextPayoutDate = (): string => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchPayoutData();
    const interval = setInterval(fetchPayoutData, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchPayoutData = async () => {
    try {
      // Fetch dashboard data (earnings, payouts, stats)
      const dashboardData = await tutorAPI.getPayoutSummary(session.access_token, tutorId);
      
      if (dashboardData) {
        setEarnings(dashboardData.earnings || []);
        setPayouts(dashboardData.payouts || []);
        
        // Calculate next payout date (Fridays)
        const nextPayoutDate = getNextPayoutDate();
        
        setStats({
          totalEarnings: dashboardData.summary?.totalEarnings || '0.00',
          pendingPayout: dashboardData.summary?.pendingPayout || '0.00',
          paidThisMonth: dashboardData.summary?.paidThisMonth || '0.00',
          nextPayoutDate,
          nextPayoutAmount: dashboardData.summary?.pendingPayout || '0.00',
          bankAccountLast4: dashboardData.bankAccount?.accountLast4 || null,
          averageEarningsPerLesson: dashboardData.summary?.averagePerLesson || '0.00',
          totalLessonsCompleted: dashboardData.summary?.totalLessons || 0,
          taxWithheldThisMonth: dashboardData.summary?.taxWithheld || '0.00',
        });

        setBankAccount(dashboardData.bankAccount);
      }
    } catch (error) {
      console.error('Error fetching payout data:', error);
      setError('Failed to load payout information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Badge style={{ backgroundColor: '#10b981', color: 'white' }}>Paid</Badge>;
      case 'approved':
        return <Badge style={{ backgroundColor: '#3b82f6', color: 'white' }}>Approved</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'pending_approval':
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const downloadEarningsReport = () => {
    const csv = [
      ['Date (ISO 8601)', 'Student', 'Subject', 'Duration', 'Gross Amount (₦)', 'Platform Fee', 'Tax Withheld', 'Net Earnings', 'Status', 'Reference ID'],
      ...earnings.map(e => [
        e.date,
        e.studentName,
        e.subject,
        e.lessonDuration,
        e.grossAmount,
        e.platformFee,
        e.taxWithheld,
        e.netAmount,
        e.status,
        e.referenceId,
      ]),
    ];

    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

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

      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <h2 className="mt-1 text-xl font-bold">{formatNaira(stats.totalEarnings)}</h2>
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
                <p className="text-sm text-gray-600">Available Payout</p>
                <h2 className="mt-1 text-xl font-bold">{formatNaira(stats.pendingPayout)}</h2>
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
                <h2 className="mt-1 text-xl font-bold">{formatNaira(stats.paidThisMonth)}</h2>
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
                <p className="text-sm text-gray-600">Tax Withheld</p>
                <h2 className="mt-1 text-xl font-bold">{formatNaira(stats.taxWithheldThisMonth)}</h2>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Payout</p>
                <p className="mt-1 text-lg font-bold text-purple-600">
                  {formatISODate(stats.nextPayoutDate)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lessons Completed</p>
                <h2 className="mt-1 text-2xl font-bold">{stats.totalLessonsCompleted}</h2>
              </div>
              <LineChart className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg per Lesson</p>
                <h2 className="mt-1 text-2xl font-bold">{formatNaira(stats.averageEarningsPerLesson)}</h2>
              </div>
              <TrendingDown className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Account Status */}
      {!bankAccount ? (
        <Alert className="bg-amber-50 border-amber-200">
          <CreditCard className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Bank Account Required:</strong> Add your bank details to receive payouts.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Bank Account Verified:</strong> Account ending in {bankAccount.accountLast4}
          </AlertDescription>
        </Alert>
      )}

      {/* Payout Information */}
      <Alert className="bg-blue-50 border-blue-200">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Automatic Weekly Payouts:</strong> Every Friday at 2 PM UTC. Minimum payout: ₦50. Your available balance will be processed automatically.
        </AlertDescription>
      </Alert>

      {/* Earnings Tabs */}
      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Earnings ({earnings.length})</TabsTrigger>
          <TabsTrigger value="requests">Payouts ({payouts.length})</TabsTrigger>
          <TabsTrigger value="compliance">Tax & Compliance</TabsTrigger>
        </TabsList>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={downloadEarningsReport} className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
              <CardDescription>All lesson earnings with ISO 8601 timestamps</CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <NairaIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No earnings yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {earnings.map((earning) => (
                    <Card key={earning.id} className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{earning.studentName}</p>
                            <p className="text-xs text-gray-500">{earning.referenceId}</p>
                            <p className="text-sm text-gray-600">
                              {earning.subject} • {formatISODateTime(earning.date)} • {earning.lessonDuration}
                            </p>
                          </div>
                          {getStatusBadge(earning.status)}
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Gross</p>
                            <p className="font-medium">{formatNaira(earning.grossAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Fee (20%)</p>
                            <p className="font-medium text-red-600">-{formatNaira(earning.platformFee)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Tax</p>
                            <p className="font-medium text-orange-600">-{formatNaira(earning.taxWithheld)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Net</p>
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

        {/* Payouts Tab */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Track all payout requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No payout history</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {payouts.map((payout) => (
                    <Card key={payout.id} className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{formatNaira(payout.amount)}</p>
                            <p className="text-xs text-gray-500">{payout.reference || payout.id}</p>
                            <p className="text-sm text-gray-600">
                              Requested: {formatISODateTime(payout.requestedAt)}
                            </p>
                            {payout.completedAt && (
                              <p className="text-sm text-gray-600">
                                Completed: {formatISODateTime(payout.completedAt)}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(payout.status)}
                        </div>
                        {payout.failureReason && (
                          <Alert className="bg-red-50 border-red-200 mt-2">
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            <AlertDescription className="text-red-800 text-xs">
                              {payout.failureReason}
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

        {/* Tax & Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Withholding Report</CardTitle>
              <CardDescription>5% tax withheld per Nigerian regulations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tax Information:</strong> Knowledge Fons Academy withholds 5% tax on all earnings for Nigerian tax compliance (FIRS). This is deducted from your net earnings.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Tax Withheld This Month</p>
                    <p className="text-2xl font-bold mt-2">{formatNaira(stats.taxWithheldThisMonth)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">YTD Tax Withheld</p>
                    <p className="text-2xl font-bold mt-2">₦0.00</p>
                  </CardContent>
                </Card>
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download Tax Certificate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Disclaimer */}
      <Alert className="bg-gray-50 border-gray-200">
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-700 text-xs">
          <strong>Platform Fee & Standards:</strong> Knowledge Fons Academy charges 20% platform fee covering payment processing, insurance, customer support, and platform maintenance. All timestamps are in ISO 8601 format. Payouts follow international financial standards with full audit trails for compliance.
        </AlertDescription>
      </Alert>
    </div>
  );
}
