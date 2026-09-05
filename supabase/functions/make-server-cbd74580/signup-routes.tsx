import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';
import { upsertProfile } from './db.tsx';

const signupRoutes = new Hono();

// Duplicated from index.ts — shared helper
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Check if email exists endpoint
signupRoutes.post('/check-email', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const supabase = getSupabaseClient();

    // Try to get user by email using admin API
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error checking email:', error);
      return c.json({ error: 'Failed to check email availability' }, 500);
    }

    // Check if email exists in the user list
    const emailExists = data.users.some(user => user.email?.toLowerCase() === email.toLowerCase());

    return c.json({
      exists: emailExists,
      available: !emailExists
    });
  } catch (err: any) {
    console.error('Exception checking email:', err);
    return c.json({
      error: 'Failed to check email availability',
      message: err.message
    }, 500);
  }
});

// Sign up endpoint
signupRoutes.post('/signup', async (c) => {
  try {
    console.log('=== SIGNUP ENDPOINT CALLED ===');
    const { email, password, name, profileData, role } = await c.req.json();
    console.log('Signup request for email:', email, 'name:', name, 'role:', role);

    if (!email || !password || !name) {
      console.error('Missing required fields: email, password, or name');
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return c.json({ error: 'Please enter a valid email address' }, 400);
    }

    // Validate password length (Supabase requires at least 6 characters)
    if (password.length < 6) {
      console.error('Password too short');
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('Environment check:');
    console.log('- SUPABASE_URL exists:', !!supabaseUrl);
    console.log('- SUPABASE_URL value:', supabaseUrl);
    console.log('- SUPABASE_ANON_KEY exists:', !!anonKey);
    console.log('- SUPABASE_ANON_KEY length:', anonKey?.length || 0);
    console.log('- SUPABASE_ANON_KEY starts with:', anonKey?.substring(0, 20) || 'N/A');

    if (!supabaseUrl || !anonKey) {
      console.error('Missing environment variables!');
      console.error('SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING');
      console.error('SUPABASE_ANON_KEY:', anonKey ? 'present' : 'MISSING');
      return c.json({ error: 'Server configuration error: Missing environment variables. Please contact support.' }, 500);
    }

    // Use service role to create user with auto-confirmed email
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('- SERVICE_ROLE_KEY exists:', !!serviceRoleKey);

    if (!serviceRoleKey) {
      console.error('Missing SERVICE_ROLE_KEY!');
      return c.json({ error: 'Server configuration error: Missing service role key. Please contact support.' }, 500);
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Create user via admin client — auto-confirm so they can sign in immediately
    const userRole = role || profileData?.role || null;

    // Frontend already blocks submission on this (ParentSignup.tsx,
    // TutorSignup.tsx), but that's client-side only — enforce it here too so
    // it can't be skipped by calling this endpoint directly. Doesn't apply
    // to admin signups, who aren't a participant in recorded sessions.
    if ((userRole === 'parent' || userRole === 'tutor') && !profileData?.recordingAcknowledged) {
      return c.json({ error: 'Please confirm you understand that sessions are recorded before creating an account.' }, 400);
    }

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: userRole },
      email_confirm: true,
    });

    if (error) {
      if (error.message?.includes('already registered') || error.message?.includes('already been registered') || error.code === 'email_exists') {
        return c.json({ error: 'A user with this email already exists. Please sign in instead.' }, 409);
      }
      return c.json({ error: error.message || 'Failed to create account' }, 400);
    }

    if (!data?.user) {
      return c.json({ error: 'Failed to create account - no user data returned' }, 500);
    }

    // Step 2: Generate verification link and send confirmation email via Resend
    const appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.knowledgefonsacademy.com';
    try {
      const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: appUrl },
      });

      if (linkError) {
        console.warn('⚠️ Could not generate verification link:', linkError.message);
      } else {
        const verificationUrl = linkData?.properties?.action_link;
        if (verificationUrl) {
          const roleForEmail = userRole || profileData?.role || 'user';
          const confirmTpl = emailTemplates.signupConfirmEmail(name, roleForEmail, verificationUrl);
          await sendEmail({
            to: email,
            subject: confirmTpl.subject,
            html: confirmTpl.html,
          });
          console.log('✅ Verification email sent to:', email);
        }
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Could not send verification email:', emailErr.message);
    }

    console.log('User created successfully for:', email);

    // Detect admin email and auto-assign role
    const isAdmin = email.toLowerCase().includes('admin@') || email.toLowerCase() === 'admin@knowledgefonsacademy.com';

    // Create initial user profile in KV store
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 SIGNUP: Creating initial user profile in KV store');
    console.log('User ID:', data.user.id);
    console.log('Email:', email);
    console.log('Is Admin:', isAdmin);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      // Build full profile — merge any profileData sent with the signup request
      const initialProfile: any = {
        userId: data.user.id,
        id: data.user.id,
        email,
        name,
        createdAt: new Date().toISOString(),
        ...(profileData || {}),
      };

      // Set role from explicit field, profileData, or admin detection
      if (isAdmin) {
        initialProfile.role = 'admin';
        initialProfile.onboardingComplete = true;
        console.log('✅ Setting role to ADMIN for admin email');
      } else if (role || profileData?.role) {
        initialProfile.role = role || profileData.role;
        initialProfile.onboardingComplete = true;
        console.log('✅ Role set from signup request:', initialProfile.role);
      } else {
        console.log('⏸️  NO ROLE SET - Will be set by specific signup flow (parent/tutor/student)');
      }

      await kv.set(`user:${data.user.id}`, initialProfile);
      console.log('✅ Initial profile saved to KV store:', JSON.stringify(initialProfile, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // If signing up as a tutor, immediately create a verification record so the admin dashboard picks them up
      if (initialProfile.role === 'tutor') {
        await kv.set(`verification:${data.user.id}`, {
          userId: data.user.id,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
          appeals: [],
        });
        console.log('✅ Verification record created for tutor:', data.user.id);

        try {
          const dash = `${appUrl}/dashboard`;
          const pendingTpl = emailTemplates.tutorVerificationPending(name, dash);
          await sendEmail({
            to: email,
            subject: pendingTpl.subject,
            html: pendingTpl.html,
          });
          console.log('✅ Application received email sent to tutor:', email);

          // Notify admin of new tutor application
          const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@knowledgefonsacademy.com';
          const adminDash = `${appUrl}/admin/verifications`;
          const adminTpl = emailTemplates.adminTutorApplicationAlert(name, email, adminDash);
          await sendEmail({ to: adminEmail, subject: adminTpl.subject, html: adminTpl.html }).catch(() => {});
        } catch (emailErr: any) {
          console.warn('⚠️ Could not send application received email:', emailErr.message);
        }
      }

      // Also write to proper profiles table (dual-write during migration)
      try {
        await upsertProfile(data.user.id, initialProfile);
        console.log('✅ Profile also saved to profiles table');
      } catch (dbError: any) {
        // Non-fatal — schema.sql may not have been run yet
        console.warn('⚠️ Could not write to profiles table (run schema.sql first):', dbError.message);
      }
    } catch (kvError: any) {
      console.error('❌ Error creating user profile in KV store:', kvError);
      console.error('KV Error details:', JSON.stringify(kvError, null, 2));
      // Don't fail the signup if KV store fails
    }

    console.log('Signup successful for:', email);
    return c.json({
      success: true,
      requiresEmailConfirmation: false,
      userId: data.user.id,
      isAdmin,
      session: null,
    });
  } catch (error: any) {
    console.error('Signup error (outer catch):', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error status:', error.status);
    console.error('Error code:', error.code);
    console.error('Full error object:', JSON.stringify(error, null, 2));

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return c.json({
        error: 'Invalid request format',
        debug: { type: 'SyntaxError', message: error.message }
      }, 400);
    }

    return c.json({
      error: error.message || 'Internal server error',
      debug: {
        type: error.constructor.name,
        message: error.message,
        status: error.status,
        code: error.code,
        location: 'outer_catch'
      }
    }, error.status || 500);
  }
});

export default signupRoutes;
