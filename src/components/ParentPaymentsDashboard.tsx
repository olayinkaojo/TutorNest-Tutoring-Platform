import { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Download,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Wallet,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Info,
  ShieldCheck,
  Banknote,
  Hash,
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
import { formatNaira } from '../utils/currency';

interface Payment {
  id: string;
  bookingId?: string;
  tutorId: string;
  studentId?: string;
  userId: string;
  amount: number;
  subject: string;
  status: 'successful' | 'pending' | 'failed' | 'refunded';
  reference: string;
  createdAt: string;
  verifiedAt?: string;
  confirmedAt?: string;
  planType?: string;
  source?: 'kv' | 'db';
  metadata?: {
    tutorName?: string;
    studentName?: string;
    sessionDate?: string;
    sessionTime?: string;
    planType?: string;
  };
}

interface PaymentStats {
  totalSpent: number;
  thisMonth: number;
  lastMonth: number;
  pendingAmount: number;
  transactionCount: number;
}

function computeStats(payments: Payment[]): PaymentStats {
  const now = new Date();
  const thisM = now.getMonth();
  const thisY = now.getFullYear();
  const lastM = thisM === 0 ? 11 : thisM - 1;
  const lastY = thisM === 0 ? thisY - 1 : thisY;

  let totalSpent = 0, thisMonth = 0, lastMonth = 0, pendingAmount = 0;
  for (const p of payments) {
    if (p.status === 'successful') {
      totalSpent += p.amount;
      const d = new Date(p.createdAt);
      if (d.getMonth() === thisM && d.getFullYear() === thisY) thisMonth += p.amount;
      if (d.getMonth() === lastM && d.getFullYear() === lastY) lastMonth += p.amount;
    } else if (p.status === 'pending') {
      pendingAmount += p.amount;
    }
  }
  return { totalSpent, thisMonth, lastMonth, pendingAmount, transactionCount: payments.length };
}

export function ParentPaymentsDashboard({ accessToken }: { accessToken: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats>({
    totalSpent: 0, thisMonth: 0, lastMonth: 0, pendingAmount: 0, transactionCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  useEffect(() => { loadAll(); }, [accessToken]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/history`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      const fetched: Payment[] = data.payments || [];
      setPayments(fetched);
      setStats(computeStats(fetched));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const uniqueMonths = useMemo(() =>
    Array.from(new Set(payments.map((p) => {
      const d = new Date(p.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))).sort().reverse(),
  [payments]);

  const filtered = useMemo(() => {
    return payments
      .filter((p) => {
        const q = searchTerm.toLowerCase();
        if (q && !p.subject?.toLowerCase().includes(q) &&
          !p.reference.toLowerCase().includes(q) &&
          !p.metadata?.tutorName?.toLowerCase().includes(q) &&
          !p.metadata?.studentName?.toLowerCase().includes(q)) return false;
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        if (filterMonth !== 'all') {
          const d = new Date(p.createdAt);
          const [y, m] = filterMonth.split('-').map(Number);
          if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'date-asc')  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [payments, searchTerm, filterStatus, filterMonth, sortBy]);

  const downloadInvoice = async (payment: Payment) => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/${payment.id}/invoice`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await res.json();
      if (res.ok && data.invoice) {
        const w = window.open('', '_blank');
        if (w) { w.document.write(generateInvoiceHTML(data.invoice, payment)); w.document.close(); }
        toast.success('Invoice opened — use Ctrl+P to print or save as PDF');
      } else {
        throw new Error(data.error || 'Failed to generate invoice');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invoice');
    }
  };

  const requestRefund = async (paymentId: string) => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/${paymentId}/refund`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Customer requested refund' }),
        },
      );
      const data = await res.json();
      if (res.ok) { toast.success('Refund request submitted successfully'); await loadAll(); }
      else throw new Error(data.error || 'Failed to process refund');
    } catch (err: any) {
      toast.error(err.message || 'Failed to request refund');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#5d9827' }} />
          <p className="text-sm text-muted-foreground">Loading payment history…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Spent"
          value={formatNaira(stats.totalSpent)}
          icon={Banknote}
          accent="#5d9827"
          sub={`${stats.transactionCount} transaction${stats.transactionCount !== 1 ? 's' : ''}`}
        />
        <StatCard
          title="This Month"
          value={formatNaira(stats.thisMonth)}
          icon={Calendar}
          accent="#2563eb"
          trend={stats.lastMonth > 0 ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 : null}
          trendLabel="vs last month"
        />
        <StatCard
          title="Pending"
          value={formatNaira(stats.pendingAmount)}
          icon={Clock}
          accent="#d97706"
          sub="Awaiting confirmation"
        />
        <StatCard
          title="Transactions"
          value={String(stats.transactionCount)}
          icon={Receipt}
          accent="#7c3aed"
          sub={payments.filter((p) => p.status === 'successful').length + ' successful'}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="receipts">Receipts & Invoices</TabsTrigger>
        </TabsList>

        {/* ── Transactions Tab ── */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subject, tutor, ref…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger><SelectValue placeholder="All Months" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {uniqueMonths.map((m) => (
                      <SelectItem key={m} value={m}>
                        {new Date(`${m}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Highest Amount</SelectItem>
                    <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Active filter chips */}
              {(searchTerm || filterStatus !== 'all' || filterMonth !== 'all') && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {searchTerm && (
                    <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setSearchTerm('')}>
                      "{searchTerm}" ✕
                    </Badge>
                  )}
                  {filterStatus !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setFilterStatus('all')}>
                      {filterStatus} ✕
                    </Badge>
                  )}
                  {filterMonth !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer gap-1" onClick={() => setFilterMonth('all')}>
                      {new Date(`${filterMonth}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} ✕
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4" />
                    Payment Transactions
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {filtered.length} of {payments.length} transactions
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-14 px-6">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No transactions found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {payments.length === 0 ? 'Your payment history will appear here after your first booking.' : 'Try adjusting your filters.'}
                  </p>
                </div>
              ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Tutor</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/80">
                          <TableCell className="pl-6">
                            <div className="font-medium text-sm">
                              {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(p.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm">{p.subject || '—'}</span>
                            {(p.planType || p.metadata?.planType) && (
                              <Badge variant="outline" className="ml-2 text-xs py-0">
                                {formatPlanType(p.planType || p.metadata?.planType)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.metadata?.tutorName || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.metadata?.studentName || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-sm">{formatNaira(p.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {p.reference.substring(0, 12)}…
                            </span>
                          </TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex gap-1 justify-end">
                              {p.status === 'successful' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => downloadInvoice(p)} title="Download invoice" className="h-8 w-8 p-0">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => requestRefund(p.id)} title="Request refund" className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-600">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payment Methods Tab ── */}
        <TabsContent value="methods" className="mt-4">
          <PaymentMethodsPanel />
        </TabsContent>

        {/* ── Receipts & Invoices Tab ── */}
        <TabsContent value="receipts" className="mt-4">
          <ReceiptsPanel
            payments={payments.filter((p) => p.status === 'successful')}
            onDownload={downloadInvoice}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, accent, sub, trend, trendLabel,
}: {
  title: string;
  value: string;
  icon: any;
  accent: string;
  sub?: string;
  trend?: number | null;
  trendLabel?: string;
}) {
  const TrendIcon = trend == null ? null : trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  const trendColor = trend == null ? '' : trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg" style={{ backgroundColor: accent }} />
      <CardContent className="pl-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accent}18` }}>
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: accent }}>{value}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {TrendIcon && trend != null && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(Math.round(trend))}%
            </span>
          )}
          {(sub || trendLabel) && (
            <span className="text-xs text-muted-foreground">
              {TrendIcon && trendLabel ? trendLabel : sub}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { className: string; icon: any; label: string }> = {
    successful: { className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, label: 'Paid' },
    pending:    { className: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock,        label: 'Pending' },
    failed:     { className: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle,      label: 'Failed' },
    refunded:   { className: 'bg-blue-50 text-blue-700 border-blue-200',    icon: RefreshCw,    label: 'Refunded' },
  };
  const c = cfg[status] || cfg.pending;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`${c.className} flex items-center gap-1 w-fit text-xs font-medium`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function PaymentMethodsPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" style={{ color: '#5d9827' }} />
            Payment Methods
          </CardTitle>
          <CardDescription>How payments are processed on TutorNest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Secure checkout via Flutterwave.</strong> Your card details are encrypted and processed
              directly by Flutterwave — TutorNest never stores full card numbers.
            </AlertDescription>
          </Alert>

          {/* Supported methods */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: CreditCard, label: 'Debit / Credit Card', sub: 'Visa, Mastercard, Verve' },
              { icon: Banknote,   label: 'Bank Transfer',        sub: 'Direct bank payment' },
              { icon: Wallet,     label: 'USSD',                 sub: 'All major Nigerian banks' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-xl border bg-slate-50/60 hover:bg-slate-100/60 transition-colors">
                <div className="p-2.5 rounded-lg bg-white shadow-sm">
                  <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border p-4 space-y-3 bg-slate-50/40">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              How it works
            </p>
            {[
              'Choose a tutor and a session plan on the Find Tutors page.',
              'Click "Book Now" — a secure Flutterwave checkout window opens.',
              'Complete payment with your preferred method.',
              'Booking is confirmed instantly and sessions are scheduled for you.',
              'Receipts and invoices appear here automatically after each payment.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptsPanel({
  payments, onDownload,
}: {
  payments: Payment[];
  onDownload: (p: Payment) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return !q ||
      p.subject?.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      p.metadata?.tutorName?.toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: '#5d9827' }} />
              Receipts & Invoices
            </CardTitle>
            <CardDescription>{payments.length} receipt{payments.length !== 1 ? 's' : ''} available</CardDescription>
          </div>
          {payments.length > 0 && (
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search receipts…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">
              {payments.length === 0 ? 'No receipts yet' : 'No receipts match your search'}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {payments.length === 0 && 'Invoices are generated automatically after each successful payment.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border hover:shadow-sm hover:border-slate-300 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#5d982718' }}>
                    <Receipt className="h-5 w-5" style={{ color: '#5d9827' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {p.subject || 'Tutoring Session'}
                      {(p.planType || p.metadata?.planType) && (
                        <Badge variant="outline" className="ml-2 text-xs py-0 font-normal">
                          {formatPlanType(p.planType || p.metadata?.planType)}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.metadata?.tutorName && <span className="font-medium">{p.metadata.tutorName}</span>}
                      {p.metadata?.tutorName && ' · '}
                      {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-mono mt-0.5 truncate">{p.reference}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold">{formatNaira(p.amount)}</p>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 mt-0.5">Paid</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(p)}
                    className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatPlanType(t?: string): string {
  if (!t) return '';
  const map: Record<string, string> = {
    trial: 'Trial', once_weekly: 'Weekly', twice_weekly: '2×/Week', db: 'Plan',
  };
  return map[t] || t;
}

function generateInvoiceHTML(invoice: any, payment: Payment): string {
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const fmtAmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  const planBadge = (payment.planType || payment.metadata?.planType)
    ? `<span style="display:inline-block;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;margin-left:8px;">${formatPlanType(payment.planType || payment.metadata?.planType)}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice — TutorNest</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.5}
    .page{max-width:760px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#1e3a2f 0%,#5d9827 100%);color:white;padding:36px 40px;display:flex;justify-content:space-between;align-items:flex-start}
    .brand h1{font-size:26px;font-weight:800;letter-spacing:-.5px}
    .brand p{font-size:13px;opacity:.75;margin-top:4px}
    .invoice-meta{text-align:right}
    .invoice-meta .label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;opacity:.7}
    .invoice-meta .inv-number{font-size:22px;font-weight:800;margin-top:2px}
    .paid-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;margin-top:8px}
    .body{padding:36px 40px}
    .meta-row{display:flex;justify-content:space-between;margin-bottom:32px;gap:24px}
    .meta-block h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#64748b;margin-bottom:8px}
    .meta-block p{font-size:14px;color:#1e293b}
    .meta-block .muted{color:#64748b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:24px 0}
    thead{background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:2px solid #e2e8f0}
    th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#475569}
    td{padding:16px;font-size:14px;border-bottom:1px solid #f1f5f9}
    tr:last-child td{border-bottom:none}
    .amount-col{text-align:right;font-weight:700}
    .totals{border-top:2px solid #e2e8f0;padding-top:20px;margin-top:8px}
    .total-line{display:flex;justify-content:space-between;font-size:13px;color:#64748b;padding:4px 0}
    .grand-total{display:flex;justify-content:space-between;font-size:20px;font-weight:800;color:#1e3a2f;border-top:2px solid #e2e8f0;padding-top:16px;margin-top:12px}
    .ref-box{background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #5d9827;border-radius:8px;padding:14px 16px;margin-top:24px;font-size:12px;color:#475569}
    .ref-box strong{color:#1e293b}
    .footer{margin-top:32px;padding-top:24px;border-top:1px solid #f1f5f9;text-align:center;font-size:12px;color:#94a3b8}
    @media print{body{background:white}.page{box-shadow:none;margin:0;border-radius:0}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>TutorNest</h1>
      <p>Professional Online Tutoring Platform · Nigeria</p>
    </div>
    <div class="invoice-meta">
      <div class="label">Invoice</div>
      <div class="inv-number">${invoice.id || `INV-${payment.id.substring(0, 8).toUpperCase()}`}</div>
      <div class="paid-badge">✓ Paid</div>
    </div>
  </div>

  <div class="body">
    <div class="meta-row">
      <div class="meta-block">
        <h3>From</h3>
        <p><strong>${invoice.from?.name || 'TutorNest'}</strong></p>
        <p class="muted">${invoice.from?.address || 'Lagos, Nigeria'}</p>
        <p class="muted">${invoice.from?.email || 'billing@tutornest.org'}</p>
      </div>
      <div class="meta-block" style="text-align:right">
        <h3>Bill To</h3>
        <p><strong>${invoice.to?.name || 'Customer'}</strong></p>
        <p class="muted">${invoice.to?.email || ''}</p>
      </div>
      <div class="meta-block" style="text-align:right">
        <h3>Details</h3>
        <p><strong>Issue Date</strong></p>
        <p class="muted">${fmtDate(invoice.date)}</p>
        ${invoice.paidDate ? `<p style="margin-top:8px"><strong>Paid On</strong></p><p class="muted">${fmtDate(invoice.paidDate)}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Tutor</th>
          <th>Session Date</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map((item: any) => `
        <tr>
          <td>${item.description}${planBadge}</td>
          <td>${item.tutor || '—'}</td>
          <td>${item.date ? `${item.date}${item.time ? ' at ' + item.time : ''}` : '—'}</td>
          <td class="amount-col">${fmtAmt(item.amount)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-line"><span>Subtotal</span><span>${fmtAmt(invoice.subtotal || invoice.total)}</span></div>
      <div class="total-line"><span>Tax (0%)</span><span>${fmtAmt(0)}</span></div>
      <div class="grand-total"><span>Total Paid</span><span>${fmtAmt(invoice.total)}</span></div>
    </div>

    <div class="ref-box">
      <strong>Payment Reference:</strong> ${payment.reference}<br>
      <strong>Transaction ID:</strong> ${payment.id}<br>
      <strong>Payment Method:</strong> Card (Flutterwave)
    </div>

    <div class="footer">
      <p>Thank you for investing in quality education!</p>
      <p style="margin-top:6px">Questions? Email support@tutornest.org · Phone: +234(0)800-TUTOR</p>
      <p style="margin-top:10px;color:#cbd5e1">Generated ${new Date().toLocaleString('en-NG')} · TutorNest Platform · Page 1 of 1</p>
    </div>
  </div>
</div>
<script>document.addEventListener('keydown',(e)=>{if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();window.print();}});</script>
</body>
</html>`;
}
