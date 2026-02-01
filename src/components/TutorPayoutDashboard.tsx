import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
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
  ExternalLink
} from 'lucide-react';
import { NairaIcon } from './icons/NairaIcon';
import { formatNaira } from '../utils/currency';

interface TutorPayoutDashboardProps {
  session: any;
  tutorId: string;
}

interface Earning {
  id: string;
  bookingId: string;
  date: string;
  studentName: string;
  lessonDuration: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  status: 'pending' | 'paid' | 'processing';
  payoutDate?: string;
}

interface Payout {
  id: string;
  period: string;
  amount: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  scheduledDate: string;
  paidDate?: string;
  earningsCount: number;
  failureReason?: string;
}

interface PayoutSettings {
  schedule: 'weekly' | 'biweekly' | 'monthly';
  minimumAmount: string;
  bankAccountLast4?: string;
}

export function TutorPayoutDashboard({ session, tutorId }: TutorPayoutDashboardProps) {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [settings, setSettings] = useState<PayoutSettings>({
    schedule: 'weekly',
    minimumAmount: '50',
  });
  const [stats, setStats] = useState({
    totalEarnings: '0.00',
    pendingPayout: '0.00',
    paidThisMonth: '0.00',
    nextPayoutDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayoutData();
  }, []);

  const fetchPayoutData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payouts/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEarnings(data.earnings || []);
        setPayouts(data.payouts || []);
        setStats(data.stats || stats);
        setSettings(data.settings || settings);
      }
    } catch (err: any) {
      console.error('Error fetching payout data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Paid</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
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

      {/* Stats Cards */}
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

      {/* Payout Schedule Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Payout Schedule:</strong> {settings.schedule.charAt(0).toUpperCase() + settings.schedule.slice(1)} payouts
          {settings.bankAccountLast4 && ` to account ending in ${settings.bankAccountLast4}`}.
          Minimum payout amount: {formatNaira(settings.minimumAmount)}
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Earnings History</CardTitle>
                  <CardDescription>Detailed breakdown of your lesson earnings</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
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
                              {formatDate(earning.date)} • {earning.lessonDuration}
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
                        {earning.payoutDate && (
                          <p className="text-xs text-gray-500 mt-2">
                            Paid on {formatDate(earning.payoutDate)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payout History</CardTitle>
                  <CardDescription>Track your scheduled and completed payouts</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No payouts yet</p>
                  <p className="text-sm mt-2">
                    Payouts occur {settings.schedule} once you reach {formatNaira(settings.minimumAmount)}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <Card key={payout.id} className={
                      payout.status === 'failed' ? 'border-red-200 bg-red-50' : 'bg-gray-50'
                    }>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{payout.period}</p>
                            <p className="text-sm text-gray-600">
                              {payout.earningsCount} lesson{payout.earningsCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(payout.status)}
                            <p className="text-lg font-medium mt-1">{formatNaira(payout.amount)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-gray-600">
                              {payout.status === 'paid' && payout.paidDate
                                ? `Paid on ${formatDate(payout.paidDate)}`
                                : `Scheduled for ${formatDate(payout.scheduledDate)}`}
                            </p>
                          </div>
                        </div>

                        {payout.status === 'failed' && payout.failureReason && (
                          <Alert className="mt-3 bg-white border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800 text-sm">
                              <strong>Payout Failed:</strong> {payout.failureReason}
                              <Button variant="link" className="h-auto p-0 ml-2 text-red-600">
                                Update Bank Details <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
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
      </Tabs>

      {/* Platform Fee Info */}
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