import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { verifyAccessToken, requireSelfOrAdmin } from './route-auth.tsx';
import { PaymentProcessor } from './unified-payment-processor.tsx';
import { NotificationBroker } from './notification-broker.tsx';

const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY') ?? '';

const app = new Hono();

// Get Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
};

// Helper to get user from token
const getUserFromToken = async (accessToken: string | null) => {
  const userId = await verifyAccessToken(accessToken);
  return userId ? { id: userId } : null;
};

// Sample books data - in production, this would come from a database
const SAMPLE_BOOKS = [
  {
    id: 'book-001',
    title: 'Advanced Mathematics for Key Stage 3',
    author: 'Dr. Sarah Johnson',
    description: 'Comprehensive guide covering algebra, geometry, and problem-solving techniques for Key Stage 3 students.',
    coverImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=600&fit=crop',
    price: 12.99,
    category: 'Mathematics',
    ageRange: '11-14',
    rating: 4.7,
    reviewCount: 234,
    subscriptionTier: 'basic',
  },
  {
    id: 'book-002',
    title: 'Science Experiments at Home',
    author: 'Prof. Michael Chen',
    description: 'Fun and educational science experiments that can be safely conducted at home with common materials.',
    coverImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=600&fit=crop',
    price: 15.99,
    category: 'Science',
    ageRange: '8-12',
    rating: 4.9,
    reviewCount: 567,
    subscriptionTier: 'basic',
  },
  {
    id: 'book-003',
    title: 'Creative Writing Workshop',
    author: 'Emma Thompson',
    description: 'Develop your creative writing skills with exercises, prompts, and techniques used by professional writers.',
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=600&fit=crop',
    price: 10.99,
    category: 'English',
    ageRange: '12-16',
    rating: 4.6,
    reviewCount: 189,
    subscriptionTier: 'standard',
  },
  {
    id: 'book-004',
    title: 'World History: Ancient Civilizations',
    author: 'Dr. James Patterson',
    description: 'Explore the fascinating world of ancient civilizations from Egypt to Rome, with stunning illustrations.',
    coverImage: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=600&fit=crop',
    price: 18.99,
    category: 'History',
    ageRange: '13-16',
    rating: 4.8,
    reviewCount: 412,
    subscriptionTier: 'standard',
  },
  {
    id: 'book-005',
    title: 'French for Beginners',
    author: 'Marie Dubois',
    description: 'Start your French language journey with this interactive book featuring audio exercises and cultural insights.',
    coverImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop',
    price: 14.99,
    category: 'Languages',
    ageRange: '10-15',
    rating: 4.5,
    reviewCount: 298,
    subscriptionTier: 'premium',
  },
  {
    id: 'book-006',
    title: 'Introduction to Coding for Kids',
    author: 'Alex Kumar',
    description: 'Learn programming basics through fun projects and games. Perfect for young aspiring developers.',
    coverImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&h=600&fit=crop',
    price: 16.99,
    category: 'Science',
    ageRange: '9-14',
    rating: 4.9,
    reviewCount: 723,
    subscriptionTier: 'basic',
  },
  {
    id: 'book-007',
    title: 'Art Techniques for Young Artists',
    author: 'Sophie Martinez',
    description: 'Master various art techniques including drawing, painting, and sculpture with step-by-step tutorials.',
    coverImage: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=600&fit=crop',
    price: 13.99,
    category: 'Art',
    ageRange: '8-16',
    rating: 4.7,
    reviewCount: 445,
    subscriptionTier: 'premium',
  },
  {
    id: 'book-008',
    title: 'Music Theory Made Simple',
    author: 'David Williams',
    description: 'Understand the fundamentals of music theory with clear explanations and practical exercises.',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    price: 11.99,
    category: 'Music',
    ageRange: '11-17',
    rating: 4.6,
    reviewCount: 321,
    subscriptionTier: 'standard',
  },
  {
    id: 'book-009',
    title: 'GCSE Physics Revision Guide',
    author: 'Dr. Rachel Green',
    description: 'Complete revision guide for GCSE Physics with practice questions and exam tips.',
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=600&fit=crop',
    price: 19.99,
    category: 'Science',
    ageRange: '14-16',
    rating: 4.8,
    reviewCount: 892,
    subscriptionTier: 'standard',
  },
  {
    id: 'book-010',
    title: 'English Grammar Essentials',
    author: 'Linda Brown',
    description: 'Master English grammar with clear rules, examples, and exercises for all levels.',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop',
    price: 9.99,
    category: 'English',
    ageRange: '10-16',
    rating: 4.5,
    reviewCount: 654,
    subscriptionTier: 'basic',
  },
  {
    id: 'book-011',
    title: 'Shakespeare for Students',
    author: 'Prof. Robert Taylor',
    description: 'Understand and appreciate Shakespeare\'s works with modern translations and detailed analysis.',
    coverImage: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=600&fit=crop',
    price: 14.99,
    category: 'English',
    ageRange: '13-18',
    rating: 4.7,
    reviewCount: 478,
    subscriptionTier: 'premium',
  },
  {
    id: 'book-012',
    title: 'Mental Maths Mastery',
    author: 'Karen White',
    description: 'Improve your mental arithmetic skills with techniques and practice exercises for quick calculations.',
    coverImage: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=400&h=600&fit=crop',
    price: 8.99,
    category: 'Mathematics',
    ageRange: '7-12',
    rating: 4.6,
    reviewCount: 567,
    subscriptionTier: 'basic',
  },
];

// Get all books
app.get('/books', async (c) => {
  console.log('=== GET /bookshop/books endpoint called ===');
  
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const user = await getUserFromToken(accessToken);
    if (!user) {
      console.log('Unauthorized access to books');
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    console.log(`User ${user.id} fetching books`);

    return c.json({
      success: true,
      books: SAMPLE_BOOKS,
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return c.json({ success: false, error: 'Failed to fetch books' }, 500);
  }
});

// Get user's purchased books. Previously only checked that SOME valid
// user was authenticated, never that the :userId in the URL was actually
// them (or an admin) — any logged-in user could read anyone else's book
// library by swapping the path param.
app.get('/library/:userId', async (c) => {
  console.log('=== GET /bookshop/library/:userId endpoint called ===');

  try {
    const userId = c.req.param('userId');
    const auth = await requireSelfOrAdmin(c, userId);
    if (auth instanceof Response) return auth;

    // Get user's purchased books from KV store
    const purchasedBookIds = await kv.get(`user_books:${userId}`) as string[] || [];
    
    // Get full book details
    const userBooks = SAMPLE_BOOKS.filter(book => purchasedBookIds.includes(book.id));

    console.log(`User ${userId} has ${userBooks.length} books in library`);

    return c.json({
      success: true,
      books: userBooks,
    });
  } catch (error) {
    console.error('Error fetching user library:', error);
    return c.json({ success: false, error: 'Failed to fetch library' }, 500);
  }
});

// ─── Bookshop Payment Initialization ─────────────────────────────────────────
// Used to call PaymentProcessor.initializeFlutterwavePayment, which hits
// Flutterwave's hosted-checkout-link API and expects the browser to be
// redirected back to a `/payment/callback` page afterwards — but no such
// page exists anywhere in this frontend (confirmed: zero references to
// "payment/callback" in src/). That flow was unreachable by construction.
// Switched to the same inline-popup pattern the real booking payment flow
// already uses (BookSessionWithPayment.tsx -> payments/initiate-plan):
// no Flutterwave API call is needed at this stage at all — just a
// reference + a pending record for /purchase/verify to find afterwards.
app.post('/purchase/initialize', async (c) => {
  console.log('=== POST /bookshop/purchase/initialize ===');

  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (!FLUTTERWAVE_SECRET_KEY) return c.json({ success: false, error: 'Payment not configured yet' }, 503);

    const body = await c.req.json() as { bookIds: string[] };
    const { bookIds } = body;

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return c.json({ success: false, error: 'Invalid book IDs' }, 400);
    }

    // Get book details and calculate total
    const purchasedBooks = SAMPLE_BOOKS.filter(book => bookIds.includes(book.id));
    if (purchasedBooks.length === 0) {
      return c.json({ success: false, error: 'No valid books found' }, 400);
    }

    const totalPrice = purchasedBooks.reduce((sum, book) => sum + book.price, 0);
    const bookTitles = purchasedBooks.map(b => b.title);
    const paymentId = crypto.randomUUID();
    const reference = `BOOKSHOP_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`;

    // Store pending purchase — nothing is granted until /purchase/verify
    // confirms real payment for this exact reference/amount.
    const pendingPurchase = {
      id: paymentId,
      userId: user.id,
      bookIds,
      bookTitles,
      totalPrice,
      reference,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`pending_purchase:${paymentId}`, pendingPurchase);
    await kv.set(`purchase_ref:${reference}`, paymentId);

    console.log(`[Bookshop] Initialized payment for ${bookIds.length} books: ${reference}`);

    return c.json({
      success: true,
      paymentId,
      reference,
      amount: totalPrice,
      currency: 'NGN',
      bookCount: purchasedBooks.length,
    });
  } catch (error) {
    console.error('[Bookshop] Error initializing payment:', error);
    return c.json({ success: false, error: 'Failed to initialize payment' }, 500);
  }
});

// ─── Bookshop Payment Verification ───────────────────────────────────────────
// Verify payment and complete book purchase
app.post('/purchase/verify/:reference', async (c) => {
  console.log('=== POST /bookshop/purchase/verify/:reference (Flutterwave) ===');

  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const reference = c.req.param('reference');
    if (!reference) {
      return c.json({ success: false, error: 'Invalid payment reference' }, 400);
    }

    // Get pending purchase
    const paymentId = await kv.get(`purchase_ref:${reference}`) as string;
    if (!paymentId) {
      return c.json({ success: false, error: 'Purchase not found' }, 404);
    }

    const pendingPurchase = await kv.get(`pending_purchase:${paymentId}`) as any;
    if (!pendingPurchase) {
      return c.json({ success: false, error: 'Purchase record not found' }, 404);
    }
    if (pendingPurchase.userId !== user.id) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    if (pendingPurchase.status === 'completed') {
      // Already granted — idempotent re-confirm (e.g. a retried request).
      return c.json({ success: true, purchase: pendingPurchase, message: 'Already purchased' });
    }

    // Verify payment with Flutterwave
    const verifyResult = await PaymentProcessor.verifyFlutterwavePayment(reference);
    if (!verifyResult.success || !verifyResult.paymentVerified) {
      console.error(`[Bookshop] Payment verification failed: ${reference}`);
      return c.json({
        success: false,
        error: verifyResult.error || 'Payment verification failed',
      }, 400);
    }

    // "Verified" alone only proves SOME payment went through under this
    // reference — not that it was for the right amount. The inline
    // checkout popup takes its `amount` from the browser, so anyone
    // comfortable with devtools could open it for ₦1 against a reference
    // that actually owes far more. Compare what Flutterwave says was
    // actually charged against what this pending purchase was created
    // for (never the client) before granting anything — the same check
    // confirmPlanPayment does for tutoring-session payments, which this
    // endpoint never had.
    const paidAmount = Number(verifyResult.amount);
    const paidCurrency = verifyResult.currency;
    if (paidCurrency !== 'NGN' || !(paidAmount >= Number(pendingPurchase.totalPrice))) {
      console.error(
        `[Bookshop] Payment mismatch for ${reference} — expected NGN ${pendingPurchase.totalPrice}, ` +
        `Flutterwave reports ${paidAmount} ${paidCurrency}`
      );
      return c.json({
        success: false,
        error: 'Payment amount did not match the expected price — no books were granted. Please contact support.',
      }, 400);
    }

    // Update user's book library
    const existingBooks = (await kv.get(`user_books:${user.id}`)) as string[] || [];
    const updatedBooks = [...new Set([...existingBooks, ...pendingPurchase.bookIds])];
    await kv.set(`user_books:${user.id}`, updatedBooks);

    // Create completed purchase record
    const completedPurchase = {
      ...pendingPurchase,
      id: `purchase_${Date.now()}_${user.id}`,
      status: 'completed',
      verifiedAt: new Date().toISOString(),
      paymentAmount: verifyResult.amount,
      paymentCurrency: verifyResult.currency,
    };

    await kv.set(`purchase:${completedPurchase.id}`, completedPurchase);

    // Mark the pending record completed rather than deleting it — a
    // retried verify call for the same reference (network hiccup, double
    // click) can then be recognized as already-done above instead of
    // 404ing on a since-deleted record.
    await kv.set(`pending_purchase:${paymentId}`, { ...pendingPurchase, status: 'completed' });

    // Create notification
    await NotificationBroker.createNotification(kv,
      NotificationBroker.createBookshopPurchaseNotification(
        user.id,
        pendingPurchase.bookTitles,
        pendingPurchase.totalPrice
      )
    );

    console.log(`[Bookshop] Purchase verified: ${completedPurchase.id} (${pendingPurchase.bookIds.length} books)`);

    return c.json({
      success: true,
      purchase: completedPurchase,
      message: `Successfully purchased ${pendingPurchase.bookIds.length} books`,
    });
  } catch (error) {
    console.error('[Bookshop] Error verifying payment:', error);
    return c.json({ success: false, error: 'Failed to verify payment' }, 500);
  }
});

// Disabled: this was the ONLY checkout endpoint the live frontend actually
// called (confirmed by audit) — it granted every book in the cart straight
// into the user's library with zero payment of any kind; `totalPrice` was
// computed only for a console.log. Any authenticated user could get the
// entire catalog for free. Real purchases now go through
// /purchase/initialize -> Flutterwave inline checkout -> /purchase/verify,
// the same pattern tutoring-session payments already use.
app.post('/purchase', async (c) => {
  return c.json(
    { success: false, error: 'This checkout method is no longer available. Please use the bookshop checkout in the app.' },
    410,
  );
});

// Get purchase history
app.get('/purchases/:userId', async (c) => {
  console.log('=== GET /bookshop/purchases/:userId endpoint called ===');

  try {
    const userId = c.req.param('userId');
    const auth = await requireSelfOrAdmin(c, userId);
    if (auth instanceof Response) return auth;

    // Get all purchases for this user
    const allPurchases = await kv.getByPrefix(`purchase:`);
    const userPurchases = allPurchases.filter((p: any) => p.userId === userId);

    console.log(`User ${userId} has ${userPurchases.length} purchase records`);

    return c.json({
      success: true,
      purchases: userPurchases,
    });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return c.json({ success: false, error: 'Failed to fetch purchases' }, 500);
  }
});

export default app;