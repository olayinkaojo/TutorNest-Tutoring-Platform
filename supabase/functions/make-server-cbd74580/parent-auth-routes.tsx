import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

export function parentAuthRoutes(app: Hono, getUserId: (token: string | null) => Promise<string | null>) {

  // Parent signup - Creates parent account with profile
  app.post('/make-server-cbd74580/signup', async (c) => {
    try {
      const body = await c.req.json();
      const { 
        email, 
        password, 
        name,
        role = 'parent',
        phone,
        address,
        profileData
      } = body;

      // Validate required fields
      if (!email || !password || !name) {
        return c.json({ error: 'Missing required fields: email, password, name' }, 400);
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return c.json({ error: 'Invalid email format' }, 400);
      }

      // Validate password length
      if (password.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters long' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Check if user already exists
      let userExists = false;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
        if (authUser) {
          userExists = true;
        }
      } catch (err) {
        // User doesn't exist, which is what we want
      }

      if (userExists) {
        return c.json({ 
          error: 'This email is already registered. Please sign in or use a different email.',
          emailExists: true 
        }, 409);
      }

      // Check if admin@ prefix triggers admin role
      let finalRole = role;
      if (email.startsWith('admin@')) {
        finalRole = 'admin';
        console.log('🔐 Admin account detected for email:', email);
      }

      // Create Supabase auth user (email confirmation required)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: false,
        user_metadata: {
          role: finalRole,
          name: name,
          isAdminUser: finalRole === 'admin'
        }
      });

      if (authError || !authData.user) {
        console.error('Error creating auth user:', authError);
        return c.json({ 
          error: authError?.message || 'Failed to create account',
          details: authError 
        }, 500);
      }

      // Create parent/admin user profile
      const userProfile = {
        id: authData.user.id,
        userId: authData.user.id,
        role: finalRole,
        email: email,
        full_name: name,
        name: name,
        phone: phone || null,
        address: address || null,
        numberOfChildren: profileData?.number_of_children || 0,
        childrenAges: profileData?.children_ages || '',
        accountType: 'parent',
        isAdminUser: finalRole === 'admin',
        createdAt: new Date().toISOString(),
        onboardingCompleted: profileData?.onboardingComplete || false,
        ...profileData // Merge any additional profile data
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👨‍👩‍👧 PARENT SIGNUP: Creating parent profile');
      console.log('User ID:', authData.user.id);
      console.log('Email:', email);
      console.log('Role:', finalRole);
      console.log('Profile:', JSON.stringify(userProfile, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Save parent profile to KV store
      await kv.set(`user:${authData.user.id}`, userProfile);
      console.log('✅ Parent profile saved to KV store');

      // Send welcome email
      const appUrl = Deno.env.get('VITE_APP_URL') || 'https://tutornest.org';
      try {
        // Generate email verification link
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: `${appUrl}/auth` },
        });

        if (!linkError && linkData?.properties?.action_link) {
          // Send email verification using emailTemplates
          await sendEmail({
            to: email,
            subject: 'Welcome to TutorNest - Confirm Your Account',
            html: emailTemplates.emailVerification({
              name: name,
              confirmationLink: linkData.properties.action_link
            })
          });
          console.log('✅ Welcome email sent to parent:', email);
        } else {
          console.warn('⚠️ Could not generate verification link:', linkError?.message);
          // Still proceed even if email fails
        }
      } catch (emailErr: any) {
        console.warn('⚠️ Welcome email failed (non-fatal):', emailErr.message);
      }

      // Return success response
      return c.json({
        success: true,
        requiresEmailConfirmation: true,
        userId: authData.user.id,
        email: email,
        role: finalRole,
        isAdmin: finalRole === 'admin',
        message: 'Account created successfully. Please check your email to confirm your account.'
      }, 201);

    } catch (error: any) {
      console.error('Error during parent signup:', error);
      return c.json({ 
        error: error.message || 'Internal server error',
        status: 'error'
      }, 500);
    }
  });

  // Check email availability
  app.post('/make-server-cbd74580/check-email', async (c) => {
    try {
      const body = await c.req.json();
      const { email } = body;

      if (!email) {
        return c.json({ error: 'Email required' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      let exists = false;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
        if (authUser) {
          exists = true;
        }
      } catch (err) {
        // User doesn't exist
      }

      return c.json({
        email: email,
        exists: exists
      });
    } catch (error: any) {
      console.error('Error checking email:', error);
      return c.json({ 
        error: error.message || 'Internal server error',
        exists: false
      }, 500);
    }
  });

}
