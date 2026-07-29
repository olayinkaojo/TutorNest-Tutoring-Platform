import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { requireAdmin, requireSelfOrAdmin, verifyUser, isAdmin } from './route-auth.tsx';

const app = new Hono();

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

// VAT rates for different jurisdictions
const VAT_RATES: VATRate[] = [
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
  return rate || { country: 'United Kingdom', countryCode: 'GB', rate: 20, type: 'standard' }; // Default to UK
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
      currency: 'GBP',
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
        address: '123 Education Street, London, UK',
        vatNumber: 'GB123456789',
        email: 'billing@knowledgefonsacademy.com',
        phone: '+44 20 1234 5678'
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

    // Fetch all invoices in the date range
    const allInvoicesData = await kv.getByPrefix('invoice_inv_');
    const invoices: Invoice[] = allInvoicesData
      .map(item => item.value)
      .filter(inv => {
        const invoiceDate = new Date(inv.issueDate);
        return invoiceDate >= new Date(startDate) && invoiceDate <= new Date(endDate) && inv.status === 'paid';
      });

    // Calculate totals
    let totalRevenue = 0;
    let totalVAT = 0;
    let totalDiscounts = 0;
    const byCountry: Record<string, { revenue: number; vat: number; count: number }> = {};
    const byTier: Record<string, { revenue: number; count: number }> = {};

    for (const invoice of invoices) {
      totalRevenue += invoice.total;
      totalVAT += invoice.vatAmount;
      totalDiscounts += invoice.totalDiscounts;

      // By country (using VAT rate as proxy)
      const countryKey = `${invoice.vatRate}%`;
      if (!byCountry[countryKey]) {
        byCountry[countryKey] = { revenue: 0, vat: 0, count: 0 };
      }
      byCountry[countryKey].revenue += invoice.total;
      byCountry[countryKey].vat += invoice.vatAmount;
      byCountry[countryKey].count += 1;

      // By tier
      if (invoice.tierName) {
        if (!byTier[invoice.tierName]) {
          byTier[invoice.tierName] = { revenue: 0, count: 0 };
        }
        byTier[invoice.tierName].revenue += invoice.total;
        byTier[invoice.tierName].count += 1;
      }
    }

    // Get refunds in the period (from refund manager)
    const refundsData = await kv.getByPrefix('refund_');
    const refunds = refundsData
      .map(item => item.value)
      .filter(ref => {
        const refundDate = new Date(ref.processedAt || ref.requestedAt);
        return refundDate >= new Date(startDate) && refundDate <= new Date(endDate) && ref.status === 'completed';
      });

    const totalRefunds = refunds.reduce((sum, ref) => sum + (ref.amount || 0), 0);
    const netRevenue = totalRevenue - totalRefunds;

    const report: TaxReport = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportType,
      startDate,
      endDate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalVAT: Math.round(totalVAT * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      invoiceCount: invoices.length,
      breakdown: {
        byCountry,
        byTier
      },
      createdAt: new Date().toISOString(),
      createdBy: adminId
    };

    // Save report
    await kv.set(`tax_report_${report.id}`, report);

    console.log(`Tax report generated for ${startDate} to ${endDate}. Net revenue: £${netRevenue.toFixed(2)}`);

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
    const reportsData = await kv.getByPrefix('tax_report_');
    const reports = reportsData.map(item => item.value);

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

    // Fetch all invoices in the date range
    const allInvoicesData = await kv.getByPrefix('invoice_inv_');
    const invoices: Invoice[] = allInvoicesData
      .map(item => item.value)
      .filter(inv => {
        const invoiceDate = new Date(inv.issueDate);
        return invoiceDate >= new Date(startDate) && invoiceDate <= new Date(endDate);
      });

    // Sort by date
    invoices.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

    // Format as CSV
    const csvHeaders = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Customer Email',
      'Description',
      'Subtotal',
      'Discounts',
      'VAT Rate',
      'VAT Amount',
      'Total',
      'Status',
      'Payment Method'
    ];

    const csvRows = invoices.map(inv => [
      inv.invoiceNumber,
      new Date(inv.issueDate).toLocaleDateString('en-GB'),
      inv.userName,
      inv.userEmail,
      inv.items.map(item => item.description).join('; '),
      inv.subtotal.toFixed(2),
      inv.totalDiscounts.toFixed(2),
      `${inv.vatRate}%`,
      inv.vatAmount.toFixed(2),
      inv.total.toFixed(2),
      inv.status,
      inv.paymentMethod || 'N/A'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return c.json({
      success: true,
      format: 'csv',
      filename: `tutornest_accounting_${startDate}_to_${endDate}.csv`,
      content: csvContent,
      recordCount: invoices.length
    });
  } catch (error) {
    console.error('Error exporting accounting data:', error);
    return c.json({ success: false, error: 'Failed to export accounting data' }, 500);
  }
});

export default app;
