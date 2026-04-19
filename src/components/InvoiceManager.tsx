import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { projectId } from '../utils/supabase/info.tsx';
import { FileText, Download, Eye, CheckCircle, Clock, XCircle, Printer } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  // Parties
  userName?: string;
  userEmail?: string;
  tutorName?: string;
  studentName?: string;
  subject?: string;
  // Line items
  items?: InvoiceItem[];
  // Amounts
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  discounts?: any[];
  totalDiscounts?: number;
  total: number;
  currency?: string;
  currencySymbol?: string;
  // Payment
  paymentMethod?: string;
  paymentReference?: string;
  // Status & dates
  status: 'draft' | 'issued' | 'paid' | 'void';
  issueDate?: string;
  dueDate?: string;
  paidDate?: string;
  createdAt: string;
}

interface InvoiceManagerProps {
  userId: string;
  session: any;
  isAdmin?: boolean;
}

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export function InvoiceManager({ userId, session, isAdmin = false }: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    fetchInvoices();
  }, [userId, session]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invoices/user/${userId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error('Error fetching invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-green-100 text-green-800 border-green-300">Paid</Badge>;
    if (status === 'issued') return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Issued</Badge>;
    if (status === 'void') return <Badge variant="outline" className="text-gray-500">Void</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const printInvoice = (inv: Invoice) => {
    const items = inv.items || [{
      description: inv.subject ? `Tutoring — ${inv.subject}` : 'Tutoring Session',
      quantity: 1,
      unitPrice: inv.total,
      total: inv.total,
    }];

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${inv.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 40px; max-width: 780px; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 24px; font-weight: 700; color: #625d9c; }
    .brand-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #625d9c; }
    .invoice-title p { font-size: 13px; color: #666; margin-top: 4px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .party-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 6px; }
    .party-name { font-size: 15px; font-weight: 600; }
    .party-detail { font-size: 13px; color: #555; margin-top: 2px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f8f7ff; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
    .meta-item label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: .06em; }
    .meta-item p { font-size: 14px; font-weight: 500; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #625d9c; color: white; padding: 10px 14px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 12px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; }
    .totals-row.grand { font-size: 17px; font-weight: 700; color: #111; border-top: 2px solid #625d9c; margin-top: 8px; padding-top: 12px; }
    .status-bar { margin-top: 40px; text-align: center; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .status-paid { background: #dcfce7; color: #166534; }
    .footer { margin-top: 48px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">TutorNest</div>
      <div class="brand-sub">Personalised Tutoring Platform</div>
      <div class="brand-sub" style="margin-top:8px">Lagos, Nigeria</div>
      <div class="brand-sub">billing@tutornest.org</div>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p>${inv.invoiceNumber}</p>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Issued By</div>
      <div class="party-name">TutorNest Platform</div>
      <div class="party-detail">billing@tutornest.org</div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.userName || 'Parent'}</div>
      ${inv.userEmail ? `<div class="party-detail">${inv.userEmail}</div>` : ''}
      ${inv.studentName ? `<div class="party-detail">Student: ${inv.studentName}</div>` : ''}
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <label>Invoice Date</label>
      <p>${fmtDate(inv.issueDate || inv.createdAt)}</p>
    </div>
    <div class="meta-item">
      <label>Paid Date</label>
      <p>${fmtDate(inv.paidDate || inv.createdAt)}</p>
    </div>
    <div class="meta-item">
      <label>Reference</label>
      <p style="font-family:monospace;font-size:12px">${inv.paymentReference || '—'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:55%">Description</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${fmt(item.unitPrice)}</td>
        <td style="text-align:right">${fmt(item.total)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row"><span>Subtotal</span><span>${fmt(inv.subtotal)}</span></div>
      ${(inv.vatRate || 0) > 0 ? `<div class="totals-row"><span>VAT (${inv.vatRate}%)</span><span>${fmt(inv.vatAmount || 0)}</span></div>` : ''}
      ${(inv.totalDiscounts || 0) > 0 ? `<div class="totals-row" style="color:#166534"><span>Discount</span><span>-${fmt(inv.totalDiscounts || 0)}</span></div>` : ''}
      <div class="totals-row grand"><span>Total Paid</span><span>${fmt(inv.total)}</span></div>
    </div>
  </div>

  ${inv.status === 'paid' ? `<div class="status-bar status-paid">✓ PAYMENT RECEIVED — PAID IN FULL</div>` : ''}
  ${inv.paymentMethod ? `<p style="margin-top:12px;font-size:12px;color:#888;text-align:center">Payment method: ${inv.paymentMethod}</p>` : ''}

  <div class="footer">
    Thank you for choosing TutorNest. This is a system-generated invoice and does not require a signature.<br>
    For queries, contact billing@tutornest.org
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: '#625d9c' }} />
            Invoices &amp; Receipts
          </CardTitle>
          <CardDescription>
            Invoices are automatically generated after each payment and marked as paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-gray-700">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                An invoice is automatically created after each booking payment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500 tracking-wide">
                    <th className="text-left py-3 px-2">Invoice #</th>
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Description</th>
                    <th className="text-left py-3 px-2">Tutor</th>
                    <th className="text-right py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                        {fmtDate(inv.issueDate || inv.createdAt)}
                      </td>
                      <td className="py-3 px-2 text-gray-700 max-w-[200px] truncate">
                        {inv.items?.[0]?.description || (inv.subject ? `Tutoring — ${inv.subject}` : 'Tutoring Session')}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{inv.tutorName || '—'}</td>
                      <td className="py-3 px-2 text-right font-semibold">{fmt(inv.total)}</td>
                      <td className="py-3 px-2">{statusBadge(inv.status)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(inv)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => printInvoice(inv)} title="Print / Save PDF">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.status === 'paid'
                    ? <CheckCircle className="h-5 w-5 text-green-600" />
                    : selected.status === 'issued'
                    ? <Clock className="h-5 w-5 text-blue-600" />
                    : <XCircle className="h-5 w-5 text-gray-400" />}
                  Invoice {selected.invoiceNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {/* Parties */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase text-gray-400 font-semibold mb-1 tracking-wide">From</p>
                    <p className="font-semibold">TutorNest Platform</p>
                    <p className="text-sm text-gray-500">Lagos, Nigeria</p>
                    <p className="text-sm text-gray-500">billing@tutornest.org</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400 font-semibold mb-1 tracking-wide">Bill To</p>
                    <p className="font-semibold">{selected.userName || 'Parent'}</p>
                    {selected.userEmail && <p className="text-sm text-gray-500">{selected.userEmail}</p>}
                    {selected.studentName && <p className="text-sm text-gray-500">Student: {selected.studentName}</p>}
                  </div>
                </div>

                <Separator />

                {/* Meta */}
                <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Invoice Date</p>
                    <p className="font-medium">{fmtDate(selected.issueDate || selected.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Paid Date</p>
                    <p className="font-medium">{fmtDate(selected.paidDate || selected.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Reference</p>
                    <p className="font-mono text-xs break-all">{selected.paymentReference || '—'}</p>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <p className="font-semibold mb-3">Items</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-gray-400">
                        <th className="text-left pb-2">Description</th>
                        <th className="text-center pb-2">Qty</th>
                        <th className="text-right pb-2">Unit</th>
                        <th className="text-right pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.items || [{
                        description: selected.subject ? `Tutoring — ${selected.subject}` : 'Tutoring Session',
                        quantity: 1,
                        unitPrice: selected.total,
                        total: selected.total,
                      }]).map((item, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3">{item.description}</td>
                          <td className="py-3 text-center">{item.quantity}</td>
                          <td className="py-3 text-right">{fmt(item.unitPrice)}</td>
                          <td className="py-3 text-right font-medium">{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span><span>{fmt(selected.subtotal)}</span>
                    </div>
                    {(selected.vatRate || 0) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>VAT ({selected.vatRate}%)</span><span>{fmt(selected.vatAmount || 0)}</span>
                      </div>
                    )}
                    {(selected.totalDiscounts || 0) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span><span>-{fmt(selected.totalDiscounts || 0)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base pt-1">
                      <span>Total Paid</span><span>{fmt(selected.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className={`text-center py-3 rounded-lg font-semibold text-sm ${
                  selected.status === 'paid' ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
                }`}>
                  {selected.status === 'paid' ? '✓ Payment received — Paid in full' : `Status: ${selected.status.toUpperCase()}`}
                </div>

                {selected.paymentMethod && (
                  <p className="text-xs text-gray-400 text-center">Payment method: {selected.paymentMethod}</p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={() => printInvoice(selected)} style={{ backgroundColor: '#625d9c' }} className="text-white">
                  <Printer className="h-4 w-4 mr-2" />
                  Print / Save PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
