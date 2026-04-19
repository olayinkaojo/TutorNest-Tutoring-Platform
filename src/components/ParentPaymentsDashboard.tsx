import { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Wallet,
  Calendar,
  DollarSign,
  MoreVertical,
  FileText,
  Loader2,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { formatNaira } from '../utils/currency';

interface Payment {
  id: string;
  bookingId: string;
  tutorId: string;
  studentId: string;
  userId: string;
  amount: number;
  subject: string;
  status: 'successful' | 'pending' | 'failed' | 'refunded';
  reference: string;
  createdAt: string;
  verifiedAt?: string;
  metadata?: {
    tutorName?: string;
    sessionDate?: string;
    sessionTime?: string;
    planType?: string;
  };
}

interface PaymentStats {
  totalSpent: number;
  thisMonth: number;
  pendingAmount: number;
  transactionCount: number;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet';
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
}

export function ParentPaymentsDashboard({ accessToken }: { accessToken: string }) {
  // State Management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalSpent: 0,
    thisMonth: 0,
    pendingAmount: 0,
    transactionCount: 0,
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>(
    'date-desc'
  );
  const [showMasked, setShowMasked] = useState(true);

  const supabase = getSupabaseClient();

  // Fetch Data on Mount
  useEffect(() => {
    loadAllData();
  }, [accessToken]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPayments(), fetchPaymentMethods(), calculateStats()]);
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('No active session');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/history`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch payments');

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Failed to load payment history');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/methods`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.methods || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const calculateStats = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalSpent = 0;
      let thisMonth = 0;
      let pendingAmount = 0;

      payments.forEach((payment) => {
        if (payment.status === 'successful' || payment.status === 'refunded') {
          totalSpent += payment.amount;

          // Check if payment is this month
          const paymentDate = new Date(payment.createdAt);
          if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
            thisMonth += payment.amount;
          }
        } else if (payment.status === 'pending') {
          pendingAmount += payment.amount;
        }
      });

      setStats({
        totalSpent,
        thisMonth,
        pendingAmount,
        transactionCount: payments.length,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  // Filter and Sort Payments
  const filteredPayments = payments
    .filter((payment) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      if (
        !payment.subject?.toLowerCase().includes(searchLower) &&
        !payment.reference.toLowerCase().includes(searchLower) &&
        !payment.metadata?.tutorName?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && payment.status !== filterStatus) {
        return false;
      }

      // Month filter
      if (filterMonth !== 'all') {
        const paymentDate = new Date(payment.createdAt);
        const [year, month] = filterMonth.split('-').map(Number);
        if (paymentDate.getFullYear() !== year || paymentDate.getMonth() + 1 !== month) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

  // Status Badge Component
  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; icon: any; text: string }> = {
      successful: {
        bg: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle,
        text: 'Successful',
      },
      pending: {
        bg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: Clock,
        text: 'Pending',
      },
      failed: {
        bg: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircle,
        text: 'Failed',
      },
      refunded: {
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: RefreshCw,
        text: 'Refunded',
      },
    };

    const cfg = config[status] || config.pending;
    const Icon = cfg.icon;

    return (
      <Badge className={`${cfg.bg} border flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {cfg.text}
      </Badge>
    );
  };

  // Download Invoice
  const downloadInvoice = async (payment: Payment) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/${payment.id}/invoice`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.invoice) {
        // Create professional invoice HTML
        const invoiceHTML = generateInvoiceHTML(data.invoice, payment);

        // Open print dialog
        const window_ = window.open('', '_blank');
        if (window_) {
          window_.document.write(invoiceHTML);
          window_.document.close();
        }

        toast.success('Invoice opened');
      } else {
        throw new Error(data.error || 'Failed to generate invoice');
      }
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  // Request Refund
  const requestRefund = async (paymentId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/${paymentId}/refund`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Customer requested refund',
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Refund request submitted');
        await loadAllData();
      } else {
        throw new Error(data.error || 'Failed to process refund');
      }
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      toast.error(error.message || 'Failed to request refund');
    }
  };

  // Unique months for filter
  const uniqueMonths = Array.from(
    new Set(
      payments.map((p) => {
        const date = new Date(p.createdAt);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })
    )
  ).sort().reverse();

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
      {/* Payment Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Spent"
          value={formatNaira(stats.totalSpent)}
          icon={DollarSign}
          color="blue"
        />
        <StatCard title="This Month" value={formatNaira(stats.thisMonth)} icon={Calendar} color="green" />
        <StatCard title="Pending" value={formatNaira(stats.pendingAmount)} icon={Clock} color="yellow" />
        <StatCard title="Transactions" value={stats.transactionCount.toString()} icon={CreditCard} color="purple" />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Transactions</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="receipts">Receipts & Invoices</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter & Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subject, tutor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                {/* Month Filter */}
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {uniqueMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(`${month}-01`).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Highest Amount</SelectItem>
                    <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters Display */}
              {(searchTerm || filterStatus !== 'all' || filterMonth !== 'all') && (
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchTerm('')}>
                      {searchTerm} ✕
                    </Badge>
                  )}
                  {filterStatus !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterStatus('all')}>
                      {filterStatus} ✕
                    </Badge>
                  )}
                  {filterMonth !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterMonth('all')}>
                      {filterMonth} ✕
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment Transactions
                  </CardTitle>
                  <CardDescription>{filteredPayments.length} transaction(s) found</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadAllData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Tutor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {new Date(payment.createdAt).toLocaleDateString('en-NG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>{payment.subject}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.metadata?.tutorName || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatNaira(payment.amount)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {showMasked ? payment.reference.substring(0, 10) + '...' : payment.reference}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {payment.status === 'successful' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadInvoice(payment)}
                                    title="Download invoice"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => requestRefund(payment.id)}
                                    title="Request refund"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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

        {/* Payment Methods Tab */}
        <TabsContent value="methods">
          <PaymentMethodsPanel accessToken={accessToken} methods={paymentMethods} onRefresh={fetchPaymentMethods} />
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts">
          <ReceiptsPanel payments={payments.filter((p) => p.status === 'successful')} accessToken={accessToken} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ HELPER COMPONENTS ============

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <Card className={`${colorClasses[color] || colorClasses.blue} border`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </div>
          <Icon className="h-8 w-8 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodsPanel({ accessToken, methods, onRefresh }: any) {
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saved Payment Methods
            </CardTitle>
            <CardDescription>Manage your payment methods for faster checkout</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Method
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No payment methods saved</p>
            <Button onClick={() => setShowForm(true)}>Add Payment Method</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {methods.map((method: PaymentMethod) => (
              <Card key={method.id} className="border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-3 rounded">
                        <CreditCard className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        {method.card && (
                          <>
                            <p className="font-semibold capitalize">{method.card.brand}</p>
                            <p className="text-sm text-muted-foreground">
                              •••• •••• •••• {method.card.last4}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires {method.card.expiryMonth}/{method.card.expiryYear}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {method.isDefault && <Badge>Default</Badge>}
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <Alert className="border-blue-200 bg-blue-50 text-blue-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Card details will be securely processed through Flutterwave. We never store full card details.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function ReceiptsPanel({ payments, accessToken }: any) {
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Receipts & Invoices
          </CardTitle>
          <CardDescription>{payments.length} receipt(s) available</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No receipts available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment: Payment) => (
                <Card key={payment.id} className="border-slate-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{payment.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString('en-NG')} • {formatNaira(payment.amount)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ UTILITIES ============

function generateInvoiceHTML(invoice: any, payment: Payment): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 40px auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 20px;
        }
        
        .logo-section h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 5px;
        }
        
        .logo-section p {
          color: #666;
          font-size: 14px;
        }
        
        .invoice-details {
          text-align: right;
        }
        
        .invoice-details .invoice-number {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .invoice-details .invoice-id {
          font-size: 20px;
          font-weight: bold;
          color: #1e40af;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 10px;
          background: #d1fae5;
          color: #065f46;
        }
        
        .bill-to {
          margin-bottom: 30px;
        }
        
        .bill-to h3 {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 10px;
        }
        
        .bill-to p {
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        
        table thead {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          border-bottom: 2px solid #e5e7eb;
        }
        
        table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 13px;
          text-transform: uppercase;
        }
        
        table td {
          padding: 15px 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        
        table tr:last-child td {
          border-bottom: none;
        }
        
        .text-right {
          text-align: right;
        }
        
        .totals {
          margin-top: 30px;
          border-top: 2px solid #e5e7eb;
          padding-top: 20px;
          text-align: right;
        }
        
        .total-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .total-row label {
          width: 150px;
          text-align: right;
        }
        
        .total-amount {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 20px;
          font-weight: 700;
          color: #1e40af;
        }
        
        .total-amount label {
          width: 150px;
          text-align: right;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        
        .footer p {
          margin-bottom: 5px;
        }
        
        .security-info {
          background: #f0f9ff;
          border-left: 3px solid #0284c7;
          padding: 12px;
          margin-top: 20px;
          border-radius: 4px;
          font-size: 12px;
          color: #0c4a6e;
        }
        
        .security-info strong {
          color: #0284c7;
        }
        
        @media print {
          body {
            background: white;
          }
          .invoice-container {
            box-shadow: none;
            margin: 0;
          }
          .print-button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
          <div class="logo-section">
            <h1>🎓 TutorNest</h1>
            <p>Professional Online Tutoring Platform</p>
            <p style="margin-top: 8px; font-size: 12px;">Nigeria | support@tutornest.com</p>
          </div>
          <div class="invoice-details">
            <div class="invoice-number">Invoice</div>
            <div class="invoice-id">#${invoice.id}</div>
            <div class="status-badge">✓ Paid</div>
          </div>
        </div>
        
        <!-- Bill To -->
        <div class="bill-to">
          <h3>Bill To</h3>
          <p><strong>${invoice.to.name}</strong></p>
          <p>${invoice.to.email}</p>
          <p>Invoice Date: ${new Date(invoice.date).toLocaleDateString('en-NG', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        
        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Tutor</th>
              <th>Session Date & Time</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${
              invoice.items
                .map(
                  (item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.tutor}</td>
                <td>${item.date} at ${item.time}</td>
                <td class="text-right"><strong>${formatNaira(item.amount)}</strong></td>
              </tr>
            `
                )
                .join('')
            }
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <label>Subtotal:</label>
            <span>${formatNaira(invoice.items.reduce((sum: number, item: any) => sum + item.amount, 0))}</span>
          </div>
          <div class="total-row">
            <label>Tax (0%):</label>
            <span>${formatNaira(0)}</span>
          </div>
          <div class="total-amount">
            <label>Total Amount:</label>
            <span>${formatNaira(invoice.total)}</span>
          </div>
        </div>
        
        <!-- Payment Reference -->
        <div class="security-info">
          <strong>Payment Reference:</strong> ${payment.reference}<br/>
          <strong>Transaction ID:</strong> ${payment.id}
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>Thank you for investing in quality education!</p>
          <p>For support: support@tutornest.com | Phone: +234(0)800-TUTOR</p>
          <p style="margin-top: 15px; color: #bbb;">This invoice was generated on ${new Date().toLocaleString('en-NG')} • Page 1 of 1</p>
        </div>
      </div>
      
      <script>
        // Auto-print on load (optional)
        // window.print();
        
        // Print button functionality
        document.addEventListener('keydown', function(event) {
          if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
            event.preventDefault();
            window.print();
          }
        });
      </script>
    </body>
    </html>
  `;
}
