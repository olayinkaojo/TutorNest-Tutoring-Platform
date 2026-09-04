/**
 * Admin Payment Monitoring Dashboard
 * Track all payments, refunds, and revenue metrics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Undo2,
} from 'lucide-react';
import { Input } from './ui/input';
import { formatNaira } from '../utils/currency';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface Payment {
  id: string;
  reference: string;
  user: string;
  userRole: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  createdAt: string;
  planType: string;
}

interface PaymentStats {
  totalRevenue: number;
  pendingPayments: number;
  failedPayments: number;
  refundedAmount: number;
  thisMonthRevenue: number;
  thisMonthCount: number;
}

interface RefundRequest {
  id: string;
  paymentId: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  amount: number;
  refundPercentage: number;
  reason: string;
  status: 'pending' | 'processed' | 'rejected' | 'failed';
  reference: string;
  requestedAt: string;
}

export function AdminPaymentMonitoring() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingPayments: 0,
    failedPayments: 0,
    refundedAmount: 0,
    thisMonthRevenue: 0,
    thisMonthCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pendingRefunds, setPendingRefunds] = useState<RefundRequest[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(true);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchPayments();
    fetchPendingRefunds();
    const interval = setInterval(() => {
      fetchPayments();
      fetchPendingRefunds();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingRefunds = async () => {
    try {
      setLoadingRefunds(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/refunds?status=pending`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setPendingRefunds(data.refunds || []);
      }
    } catch (error) {
      console.error('Error fetching pending refunds:', error);
    } finally {
      setLoadingRefunds(false);
    }
  };

  const handleRefundAction = async (refund: RefundRequest, action: 'approve' | 'reject') => {
    const confirmMsg = action === 'approve'
      ? `Approve and process a refund of ${formatNaira(refund.amount)} to ${refund.userName} via Flutterwave?`
      : `Reject this refund request from ${refund.userName}?`;
    if (!confirm(confirmMsg)) return;

    const note = action === 'reject'
      ? (window.prompt('Reason for rejecting (shown to the customer, optional):') || '')
      : '';

    setProcessingRefundId(refund.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/refunds/${refund.id}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action, note }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        setPendingRefunds((prev) => prev.filter((r) => r.id !== refund.id));
        fetchPayments();
      } else {
        alert(data.error || `Failed to ${action} refund`);
      }
    } catch (error) {
      console.error(`Error ${action}ing refund:`, error);
      alert(`Failed to ${action} refund`);
    } finally {
      setProcessingRefundId(null);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch all payments from admin dashboard stats endpoint
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dashboard-stats?year=${year}&month=${month}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const realPayments: Payment[] = data.payments || [];

        const thisMonthStart = new Date(year, month - 1, 1);
        const thisMonthEnd = new Date(year, month, 0);
        const thisMonthPayments = realPayments.filter(p => {
          const d = new Date(p.createdAt);
          return d >= thisMonthStart && d <= thisMonthEnd && p.status === 'confirmed';
        });

        setPayments(realPayments);
        setStats({
          totalRevenue: parseFloat(data.stats?.revenue || '0'),
          pendingPayments: data.stats?.pendingPayments || 0,
          failedPayments: data.stats?.failedPayments || 0,
          refundedAmount: parseFloat(data.stats?.refundedAmount || '0'),
          thisMonthRevenue: thisMonthPayments.reduce((sum, p) => sum + p.amount, 0),
          thisMonthCount: thisMonthPayments.length,
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      confirmed: { color: '#10b981', icon: <TrendingUp className="w-3 h-3" /> },
      pending: { color: '#f59e0b', icon: <AlertCircle className="w-3 h-3" /> },
      failed: { color: '#ef4444', icon: <TrendingDown className="w-3 h-3" /> },
      refunded: { color: '#6b7280', icon: <TrendingDown className="w-3 h-3" /> },
    };

    const config = statusMap[status] || statusMap.pending;
    return (
      <Badge style={{ backgroundColor: config.color, color: 'white' }} className="gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true : payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <h2 className="text-2xl font-bold mt-2">{formatNaira(stats.totalRevenue.toString())}</h2>
                <p className="text-xs text-gray-500 mt-1">All-time</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <h2 className="text-2xl font-bold mt-2">{formatNaira(stats.thisMonthRevenue.toString())}</h2>
                <p className="text-xs text-gray-500 mt-1">{stats.thisMonthCount} payments</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payments</p>
                <h2 className="text-2xl font-bold mt-2">{stats.pendingPayments}</h2>
                <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed/Refunded</p>
                <h2 className="text-2xl font-bold mt-2">{formatNaira((stats.failedPayments + stats.refundedAmount).toString())}</h2>
                <p className="text-xs text-gray-500 mt-1">Total issues</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Refunds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="w-5 h-5" style={{ color: '#625d9c' }} />
            Pending Refund Requests
            {pendingRefunds.length > 0 && (
              <Badge style={{ backgroundColor: '#f59e0b', color: 'white' }}>{pendingRefunds.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Approving sends the refund to the customer's original payment method via Flutterwave immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRefunds ? (
            <div className="text-center py-6 text-gray-500">Loading refund requests...</div>
          ) : pendingRefunds.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">No pending refund requests.</div>
          ) : (
            <div className="space-y-3">
              {pendingRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{refund.userName}</p>
                      <Badge variant="outline">{formatNaira(refund.amount)} · {refund.refundPercentage}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{refund.reason}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{refund.reference}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={processingRefundId === refund.id}
                      onClick={() => handleRefundAction(refund, 'reject')}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="text-white"
                      style={{ backgroundColor: '#5d9827' }}
                      disabled={processingRefundId === refund.id}
                      onClick={() => handleRefundAction(refund, 'approve')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {processingRefundId === refund.id ? 'Processing...' : 'Approve & Refund'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search by reference or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="gap-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('confirmed')}
                size="sm"
              >
                Confirmed
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === 'failed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('failed')}
                size="sm"
              >
                Failed
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => fetchPayments()}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>All Flutterwave payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading payments...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No payments found</p>
            </div>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                      <TableCell>{payment.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.userRole}</Badge>
                      </TableCell>
                      <TableCell>{payment.planType}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatNaira(payment.amount.toString())}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Payments Report
        </Button>
      </div>
    </div>
  );
}
