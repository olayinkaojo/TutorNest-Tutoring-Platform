import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { requireAdmin, requireSelfOrAdmin, verifyUser, isAdmin } from './route-auth.tsx';
import { logAuditEvent } from './activity-log.tsx';

const app = new Hono();

const PAYMENT_PLAN_LABELS: Record<string, string> = {
  trial: 'Trial Session',
  once_weekly: 'Once a Week (1 Term)',
  twice_weekly: 'Twice a Week (1 Term)',
};

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Type definitions
interface VATRate {
  country: string;
  countryCode: string;
  rate: number; // Percentage
  type: 'standard' | 'reduced' | 'zero';
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  userAddress?: string;
  subscriptionId?: string;
  tierId?: string;
  tierName?: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  discounts: InvoiceDiscount[];
  totalDiscounts: number;
  creditsApplied: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'void';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDiscount {
  type: 'coupon' | 'credit' | 'promotion';
  code?: string;
  description: string;
  amount: number;
}

interface TaxReport {
  id: string;
  reportType: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalVAT: number;
  totalDiscounts: number;
  totalRefunds: number;
  netRevenue: number;
  invoiceCount: number;
  breakdown: {
    byCountry: Record<string, { revenue: number; vat: number; count: number }>;
    byTier: Record<string, { revenue: number; count: number }>;
  };
  createdAt: string;
  createdBy: string;
}

// VAT rates for different jurisdictions. This platform is Nigerian — every
// real invoice should be NGN at Nigeria's rate, not falling back to UK VAT
// on a GBP invoice, which is what happened for every Nigerian user before
// Nigeria had an entry here at all.
const VAT_RATES: VATRate[] = [
  { country: 'Nigeria', countryCode: 'NG', rate: 7.5, type: 'standard' },
  { country: 'United Kingdom', countryCode: 'GB', rate: 20, type: 'standard' },
  { country: 'Ireland', countryCode: 'IE', rate: 23, type: 'standard' },
  { country: 'France', countryCode: 'FR', rate: 20, type: 'standard' },
  { country: 'Germany', countryCode: 'DE', rate: 19, type: 'standard' },
  { country: 'Spain', countryCode: 'ES', rate: 21, type: 'standard' },
  { country: 'Italy', countryCode: 'IT', rate: 22, type: 'standard' },
  { country: 'Netherlands', countryCode: 'NL', rate: 21, type: 'standard' },
  { country: 'Belgium', countryCode: 'BE', rate: 21, type: 'standard' },
  { country: 'Sweden', countryCode: 'SE', rate: 25, type: 'standard' },
  { country: 'Denmark', countryCode: 'DK', rate: 25, type: 'standard' },
  { country: 'United States', countryCode: 'US', rate: 0, type: 'zero' }, // No federal VAT
  { country: 'Canada', countryCode: 'CA', rate: 5, type: 'standard' }, // GST
  { country: 'Australia', countryCode: 'AU', rate: 10, type: 'standard' }, // GST
];

// Helper: Get VAT rate by country code
function getVATRate(countryCode: string): VATRate {
  const rate = VAT_RATES.find(r => r.countryCode === countryCode);
  return rate || { country: 'Nigeria', countryCode: 'NG', rate: 7.5, type: 'standard' }; // Default to Nigeria — this is a Nigerian platform
}

// Helper: Calculate VAT
function calculateVAT(amount: number, vatRate: number): number {
  return Math.round((amount * vatRate / 100) * 100) / 100;
}

// Helper: Generate invoice number
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// ========== VAT RATES ==========

// Get all VAT rates
app.get('/tax/vat-rates', async (c) => {
  try {
    return c.json({
      success: true,
      vatRates: VAT_RATES
    });
  } catch (error) {
    console.error('Error fetching VAT rates:', error);
    return c.json({ success: false, error: 'Failed to fetch VAT rates' }, 500);
  }
});

// Get VAT rate for specific country
app.get('/tax/vat-rate/:countryCode', async (c) => {
  try {
    const countryCode = c.req.param('countryCode').toUpperCase();
    const vatRate = getVATRate(countryCode);

    return c.json({
      success: true,
      vatRate
    });
  } catch (error) {
    console.error('Error fetching VAT rate:', error);
    return c.json({ success: false, error: 'Failed to fetch VAT rate' }, 500);
  }
});

// ========== INVOICE GENERATION ==========

// Create invoice for subscription
app.post('/invoices/create', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.userId);
    if (auth instanceof Response) return auth;
    const {
      userId,
      userEmail,
      userName,
      userAddress,
      userCountryCode,
      subscriptionId,
      tierId,
      tierName,
      tierPrice,
      couponDiscount,
      couponCode,
      creditsApplied,
      paymentMethod,
      notes
    } = await c.req.json();

    if (!userId || !userEmail || !userName || !tierPrice) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Get VAT rate
    const vatRateInfo = getVATRate(userCountryCode || 'GB');
    
    // Calculate amounts
    const subtotal = tierPrice;
    const discounts: InvoiceDiscount[] = [];
    let totalDiscounts = 0;

    if (couponDiscount && couponDiscount > 0) {
      discounts.push({
        type: 'coupon',
        code: couponCode,
        description: `Coupon: ${couponCode}`,
        amount: couponDiscount
      });
      totalDiscounts += couponDiscount;
    }

    if (creditsApplied && creditsApplied > 0) {
      discounts.push({
        type: 'credit',
        description: 'Account credits applied',
        amount: creditsApplied
      });
      totalDiscounts += creditsApplied;
    }

    const amountAfterDiscounts = Math.max(0, subtotal - totalDiscounts);
    const vatAmount = calculateVAT(amountAfterDiscounts, vatRateInfo.rate);
    const total = amountAfterDiscounts + vatAmount;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: generateInvoiceNumber(),
      userId,
      userEmail,
      userName,
      userAddress,
      subscriptionId,
      tierId,
      tierName,
      items: [
        {
          description: `${tierName} Subscription - Monthly`,
          quantity: 1,
          unitPrice: tierPrice,
          total: tierPrice
        }
      ],
      subtotal,
      vatRate: vatRateInfo.rate,
      vatAmount,
      discounts,
      totalDiscounts,
      creditsApplied: creditsApplied || 0,
      total,
      currency: 'NGN',
      status: 'issued',
      issueDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      paymentMethod,
      notes,
      createdAt: now.toISOString()
    };

    // Save invoice
    await kv.set(`invoice_${invoice.id}`, invoice);

    // Add to user's invoices
    const userInvoicesKey = `user_invoices_${userId}`;
    const userInvoices = await kv.get(userInvoicesKey) || [];
    userInvoices.unshift(invoice.id);
    await kv.set(userInvoicesKey, userInvoices);

    // Add to global invoice index
    const invoiceIndexKey = `invoice_index_${invoice.invoiceNumber}`;
    await kv.set(invoiceIndexKey, invoice.id);

    console.log(`Invoice ${invoice.invoiceNumber} created for user ${userId}. Total: £${total.toFixed(2)} (incl. ${vatRateInfo.rate}% VAT)`);

    await logAuditEvent({
      userId,
      action: 'invoice_created',
      category: 'tax',
      description: `Invoice ${invoice.invoiceNumber} created — total £${total.toFixed(2)} (incl. ${vatRateInfo.rate}% VAT)`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total, tierId },
    });

    return c.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return c.json({ success: false, error: 'Failed to create invoice' }, 500);
  }
});

// Get invoice by ID
app.get('/invoices/:invoiceId', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const ownerInvoice: any = await kv.get(`invoice_${c.req.param('invoiceId')}`);
    if (!ownerInvoice) return c.json({ success: false, error: 'Invoice not found' }, 404);
    if (ownerInvoice.userId !== callerId && !(await isAdmin(callerId))) return c.json({ success: false, error: 'Forbidden' }, 403);
    const invoiceId = c.req.param('invoiceId');
    
    const invoice: Invoice | null = await kv.get(`invoice_${invoiceId}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }

    return c.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return c.json({ success: false, error: 'Failed to fetch invoice' }, 500);
  }
});

// Get user's invoices
app.get('/invoices/user/:userId', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('userId'));
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    
    const invoiceIds = await kv.get(`user_invoices_${userId}`) || [];
    const invoices = [];

    for (const invId of invoiceIds) {
      const invoice = await kv.get(`invoice_${invId}`);
      if (invoice) {
        invoices.push(invoice);
      }
    }

    return c.json({
      success: true,
      invoices
    });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return c.json({ success: false, error: 'Failed to fetch invoices' }, 500);
  }
});

// Mark invoice as paid
app.post('/invoices/:invoiceId/paid', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const invoiceId = c.req.param('invoiceId');
    const { paymentMethod, transactionId } = await c.req.json();

    const invoice: Invoice | null = await kv.get(`invoice_${invoiceId}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }

    invoice.status = 'paid';
    invoice.paidDate = new Date().toISOString();
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    
    if (transactionId) {
      invoice.notes = `${invoice.notes || ''}\nTransaction ID: ${transactionId}`.trim();
    }

    await kv.set(`invoice_${invoiceId}`, invoice);

    console.log(`Invoice ${invoice.invoiceNumber} marked as paid`);

    return c.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return c.json({ success: false, error: 'Failed to update invoice' }, 500);
  }
});

// Void invoice
app.post('/invoices/:invoiceId/void', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const invoiceId = c.req.param('invoiceId');
    const { reason } = await c.req.json();

    const invoice: Invoice | null = await kv.get(`invoice_${invoiceId}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }

    if (invoice.status === 'paid') {
      return c.json({ success: false, error: 'Cannot void a paid invoice. Issue a refund instead.' }, 400);
    }

    invoice.status = 'void';
    invoice.notes = `${invoice.notes || ''}\nVoided: ${reason}`.trim();

    await kv.set(`invoice_${invoiceId}`, invoice);

    console.log(`Invoice ${invoice.invoiceNumber} voided: ${reason}`);

    await logAuditEvent({
      userId: invoice.userId,
      adminId: auth as string,
      action: 'invoice_voided',
      category: 'tax',
      description: `Invoice ${invoice.invoiceNumber} voided. Reason: ${reason}`,
      metadata: { invoiceId, invoiceNumber: invoice.invoiceNumber, reason },
    });

    return c.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error voiding invoice:', error);
    return c.json({ success: false, error: 'Failed to void invoice' }, 500);
  }
});

// Generate downloadable invoice (returns formatted data for PDF generation on frontend)
app.get('/invoices/:invoiceId/download', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const ownerInvoice: any = await kv.get(`invoice_${c.req.param('invoiceId')}`);
    if (!ownerInvoice) return c.json({ success: false, error: 'Invoice not found' }, 404);
    if (ownerInvoice.userId !== callerId && !(await isAdmin(callerId))) return c.json({ success: false, error: 'Forbidden' }, 403);
    const invoiceId = c.req.param('invoiceId');
    
    const invoice: Invoice | null = await kv.get(`invoice_${invoiceId}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }

    // Format invoice data for PDF generation
    const formattedInvoice = {
      ...invoice,
      companyInfo: {
        name: 'Knowledge Fons Academy Ltd',
        email: 'billing@knowledgefonsacademy.com',
      },
      formattedDates: {
        issueDate: new Date(invoice.issueDate).toLocaleDateString('en-GB'),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('en-GB'),
        paidDate: invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString('en-GB') : null
      },
      formattedAmounts: {
        subtotal: `£${invoice.subtotal.toFixed(2)}`,
        totalDiscounts: invoice.totalDiscounts > 0 ? `-£${invoice.totalDiscounts.toFixed(2)}` : '£0.00',
        vatAmount: `£${invoice.vatAmount.toFixed(2)}`,
        total: `£${invoice.total.toFixed(2)}`
      }
    };

    return c.json({
      success: true,
      invoice: formattedInvoice
    });
  } catch (error) {
    console.error('Error generating downloadable invoice:', error);
    return c.json({ success: false, error: 'Failed to generate invoice' }, 500);
  }
});

// ========== TAX REPORTS & ACCOUNTING EXPORTS ==========

// Generate tax report for a period
app.post('/tax/reports/generate', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { reportType, startDate, endDate, adminId } = await c.req.json();

    if (!reportType || !startDate || !endDate || !adminId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // This used to read invoice_inv_* KV records — but those are only ever
    // written by this same file's own /invoices/create, which nothing in
    // the real payment flow (payment-routes.tsx) ever calls. So this
    // report always summed zero real invoices, regardless of how much
    // revenue the platform actually took in. Real revenue lives in the
    // `payments` table (written by confirmPlanPayment in
    // payment-routes.tsx) — use that instead.
    const allPayments = await db.getAllPaymentsForAdmin();
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    const paymentsInRange = allPayments.filter((p: any) => {
      if (p.status !== 'successful') return false;
      const paidAt = new Date(p.confirmedAt || p.createdAt);
      return paidAt >= rangeStart && paidAt <= rangeEnd;
    });

    const totalRevenue = paymentsInRange.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    // Nigeria's VAT (7.5%) — prices quoted to parents are treated as
    // VAT-inclusive (no separate VAT line is charged at checkout), so this
    // backs the VAT component out of the total rather than adding it on
    // top, for remittance reporting purposes.
    const vatRateInfo = getVATRate('NG');
    const totalVAT = totalRevenue - totalRevenue / (1 + vatRateInfo.rate / 100);

    const byTier: Record<string, { revenue: number; count: number }> = {};
    for (const payment of paymentsInRange) {
      const planLabel = PAYMENT_PLAN_LABELS[payment.planType] || payment.planType || 'Unknown plan';
      if (!byTier[planLabel]) byTier[planLabel] = { revenue: 0, count: 0 };
      byTier[planLabel].revenue += Number(payment.amount || 0);
      byTier[planLabel].count += 1;
    }

    // Get refunds in the period — refund:<id> (colon) is the real key
    // every refund flow in this codebase writes to (payment-routes.tsx,
    // booking-routes.tsx, reviews-disputes-routes.tsx); this used to read
    // `refund_` (underscore, never written anywhere) and check
    // status === 'completed' (the real status string is 'processed'), so
    // it always summed zero refunds regardless of how many were processed.
    const refundsData = await kv.getByPrefix('refund:');
    const refunds = refundsData.filter((ref: any) => {
      const refundDate = new Date(ref.processedAt || ref.requestedAt);
      return refundDate >= rangeStart && refundDate <= rangeEnd && ref.status === 'processed';
    });

    const totalRefunds = refunds.reduce((sum: number, ref: any) => sum + (ref.amount || 0), 0);
    const totalDiscounts = 0; // No discount/coupon system feeds real payments today.
    const netRevenue = totalRevenue - totalRefunds;

    const report: TaxReport = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportType,
      startDate,
      endDate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalVAT: Math.round(totalVAT * 100) / 100,
      totalDiscounts,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      invoiceCount: paymentsInRange.length,
      breakdown: {
        byCountry: {},
        byTier
      },
      createdAt: new Date().toISOString(),
      createdBy: adminId
    };

    // Save report
    await kv.set(`tax_report_${report.id}`, report);

    console.log(`Tax report generated for ${startDate} to ${endDate}. Net revenue: ${formatNaira(netRevenue)}`);

    await logAuditEvent({
      userId: adminId,
      action: 'tax_report_generated',
      category: 'tax',
      description: `Tax report generated (${reportType}, ${startDate} to ${endDate}) — net revenue ${formatNaira(netRevenue)}`,
      metadata: { reportId: report.id, reportType, startDate, endDate, netRevenue },
    });

    return c.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating tax report:', error);
    return c.json({ success: false, error: 'Failed to generate tax report' }, 500);
  }
});

// Get all tax reports
app.get('/tax/reports', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const reports = await kv.getByPrefix('tax_report_');

    // Sort by creation date descending
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error fetching tax reports:', error);
    return c.json({ success: false, error: 'Failed to fetch tax reports' }, 500);
  }
});

// Export accounting data (CSV format)
app.post('/tax/export', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { startDate, endDate, format } = await c.req.json();

    if (!startDate || !endDate) {
      return c.json({ success: false, error: 'Missing date range' }, 400);
    }

    // Same dead data source as /tax/reports/generate above — real revenue
    // lives in the `payments` table, not invoice_inv_* KV records nothing
    // real ever writes. See that handler's comment for the full story.
    const allPayments = await db.getAllPaymentsForAdmin();
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    const paymentsInRange = allPayments
      .filter((p: any) => {
        if (p.status !== 'successful') return false;
        const paidAt = new Date(p.confirmedAt || p.createdAt);
        return paidAt >= rangeStart && paidAt <= rangeEnd;
      })
      .sort((a: any, b: any) => new Date(a.confirmedAt || a.createdAt).getTime() - new Date(b.confirmedAt || b.createdAt).getTime());

    const vatRateInfo = getVATRate('NG');

    const rows = await Promise.all(paymentsInRange.map(async (p: any) => {
      const payer = (await kv.get(`user:${p.userId}`).catch(() => null)) as any || await db.getProfile(p.userId).catch(() => null);
      const name = payer?.fullName || payer?.full_name || payer?.name || 'Unknown';
      const email = payer?.email || 'Unknown';
      const total = Number(p.amount || 0);
      const vatAmount = total - total / (1 + vatRateInfo.rate / 100);
      return {
        reference: p.reference,
        date: new Date(p.confirmedAt || p.createdAt).toLocaleDateString('en-GB'),
        name,
        email,
        description: PAYMENT_PLAN_LABELS[p.planType] || p.planType || 'Unknown plan',
        subtotal: (total - vatAmount).toFixed(2),
        vatRate: `${vatRateInfo.rate}%`,
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        status: p.status,
      };
    }));

    // Format as CSV
    const csvHeaders = [
      'Payment Reference',
      'Date',
      'Customer Name',
      'Customer Email',
      'Description',
      'Subtotal (excl. VAT)',
      'VAT Rate',
      'VAT Amount',
      'Total',
      'Status',
    ];

    const csvRows = rows.map(r => [
      r.reference,
      r.date,
      r.name,
      r.email,
      r.description,
      r.subtotal,
      r.vatRate,
      r.vatAmount,
      r.total,
      r.status,
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    await logAuditEvent({
      userId: auth as string,
      action: 'tax_export',
      category: 'tax',
      description: `Accounting data exported (${startDate} to ${endDate}) — ${rows.length} payment(s)`,
      metadata: { startDate, endDate, recordCount: rows.length },
    });

    return c.json({
      success: true,
      format: 'csv',
      filename: `tutornest_accounting_${startDate}_to_${endDate}.csv`,
      content: csvContent,
      recordCount: rows.length
    });
  } catch (error) {
    console.error('Error exporting accounting data:', error);
    return c.json({ success: false, error: 'Failed to export accounting data' }, 500);
  }
});

export default app;
