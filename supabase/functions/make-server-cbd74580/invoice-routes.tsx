import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const invoiceRoutes = new Hono();

// Helper to get user ID from access token
const getUserIdFromToken = (accessToken: string | null): string | null => {
  if (!accessToken) return null;
  
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch (err) {
    console.error('getUserIdFromToken error:', err);
    return null;
  }
};

// Generate invoice number
const generateInvoiceNumber = (): string => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
};

// Create invoice for a booking
invoiceRoutes.post('/create', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return c.json({ error: 'Missing booking ID' }, 400);
    }

    // Get booking details
    const booking = await kv.get(`booking:${bookingId}`);
    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Verify user is parent/student who made the booking
    if (booking.parentId !== userId && booking.studentId !== userId) {
      return c.json({ error: 'Unauthorized to create invoice for this booking' }, 403);
    }

    // Check if invoice already exists
    const existingInvoiceId = await kv.get(`booking_invoice:${bookingId}`);
    if (existingInvoiceId) {
      const existingInvoice = await kv.get(`invoice:${existingInvoiceId}`);
      if (existingInvoice) {
        return c.json({ invoice: existingInvoice });
      }
    }

    // Get tutor details
    const tutor = await kv.get(`user:${booking.tutorId}`);

    // Calculate amounts
    const subtotal = booking.price;
    const platformFee = Math.round(subtotal * 0.2);
    const tutorAmount = Math.round(subtotal * 0.8);
    const vat = 0; // VAT can be added if needed
    const total = subtotal;

    // Create invoice
    const invoiceId = crypto.randomUUID();
    const invoice = {
      id: invoiceId,
      invoiceNumber: generateInvoiceNumber(),
      bookingId,
      parentId: booking.parentId,
      studentId: booking.studentId,
      tutorId: booking.tutorId,
      tutorName: tutor?.fullName || tutor?.name || 'Unknown Tutor',
      studentName: booking.studentName,
      subject: booking.subject,
      sessionDate: booking.sessionDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      
      // Amounts in Naira
      subtotal,
      platformFee,
      tutorAmount,
      vat,
      total,
      currency: 'NGN',
      currencySymbol: '₦',
      
      // Payment info
      paymentMethod: booking.paymentMethod || 'Card',
      paymentReference: booking.paymentReference,
      paidAt: booking.paidAt,
      
      // Status
      status: 'paid',
      
      // Metadata
      createdAt: new Date().toISOString(),
      issuedBy: 'Knowledge Fons Academy Platform'
    };

    // Save invoice
    await kv.set(`invoice:${invoiceId}`, invoice);
    await kv.set(`booking_invoice:${bookingId}`, invoiceId);

    // Add to user's invoice list
    const userInvoices = await kv.get(`user_invoices:${userId}`) || [];
    userInvoices.push(invoiceId);
    await kv.set(`user_invoices:${userId}`, userInvoices);

    console.log(`Invoice created: ${invoice.invoiceNumber} for booking ${bookingId}`);

    return c.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user's invoices
invoiceRoutes.get('/user/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const requestingUserId = getUserIdFromToken(accessToken);
    
    if (!requestingUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');

    // Verify user can access these invoices
    if (requestingUserId !== userId) {
      // Check if admin
      const user = await kv.get(`user:${requestingUserId}`);
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Unauthorized to view these invoices' }, 403);
      }
    }

    // Get user's invoice IDs
    const invoiceIds = await kv.get(`user_invoices:${userId}`) || [];

    // Get all invoices
    const invoices = [];
    for (const invoiceId of invoiceIds) {
      const invoice = await kv.get(`invoice:${invoiceId}`);
      if (invoice) {
        invoices.push(invoice);
      }
    }

    // Sort by creation date (newest first)
    invoices.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ invoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single invoice
invoiceRoutes.get('/:invoiceId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const invoiceId = c.req.param('invoiceId');
    const invoice = await kv.get(`invoice:${invoiceId}`);

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Verify access
    const user = await kv.get(`user:${userId}`);
    const isAdmin = user?.role === 'admin';
    const isOwner = invoice.parentId === userId || invoice.studentId === userId;
    const isTutor = invoice.tutorId === userId;

    if (!isAdmin && !isOwner && !isTutor) {
      return c.json({ error: 'Unauthorized to view this invoice' }, 403);
    }

    return c.json({ invoice });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get invoice by booking ID
invoiceRoutes.get('/booking/:bookingId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const invoiceId = await kv.get(`booking_invoice:${bookingId}`);

    if (!invoiceId) {
      return c.json({ error: 'Invoice not found for this booking' }, 404);
    }

    const invoice = await kv.get(`invoice:${invoiceId}`);
    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Verify access
    const user = await kv.get(`user:${userId}`);
    const isAdmin = user?.role === 'admin';
    const isOwner = invoice.parentId === userId || invoice.studentId === userId;
    const isTutor = invoice.tutorId === userId;

    if (!isAdmin && !isOwner && !isTutor) {
      return c.json({ error: 'Unauthorized to view this invoice' }, 403);
    }

    return c.json({ invoice });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all invoices (admin only)
invoiceRoutes.get('/admin/all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify admin role
    const user = await kv.get(`user:${userId}`);
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Get all invoices
    const allInvoices = await kv.getByPrefix('invoice:');
    
    // Sort by creation date
    allInvoices.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ invoices: allInvoices });
  } catch (error: any) {
    console.error('Error fetching all invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default invoiceRoutes;
