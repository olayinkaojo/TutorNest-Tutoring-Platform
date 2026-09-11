import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

const app = new Hono();

// Get Supabase client with service role
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Helper to get user from token.
//
// SECURITY: this previously decoded the JWT payload WITHOUT verifying its
// signature and trusted `sub` as the caller's id. Since add-role/switch-role
// only gate on `user.id === userId`, a forged token with any `sub` defeated
// that check — a caller could add or switch roles on another account. It now
// verifies the token against Supabase (signature + expiry), same as the main
// getUserId helper.
const getUserFromToken = async (accessToken: string | null) => {
  if (!accessToken) {
    console.log('No access token provided');
    return null;
  }

  try {
    const { data: { user }, error } = await getSupabaseClient().auth.getUser(accessToken);
    if (error || !user) {
      console.error('Token verification failed:', error?.message);
      return null;
    }
    return { id: user.id };
  } catch (err) {
    console.error('Exception in getUserFromToken:', err);
    return null;
  }
};

// Get user's available roles
app.get('/user-roles/:userId', async (c) => {
  console.log('=== GET /role-management/user-roles/:userId endpoint called ===');
  
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Get user's roles from KV store
    const userRoles = await kv.get(`user_roles:${userId}`) as string[] || [];
    
    console.log(`User ${userId} has roles:`, userRoles);

    return c.json({
      success: true,
      roles: userRoles,
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return c.json({ success: false, error: 'Failed to fetch roles' }, 500);
  }
});

// Add a role to user (e.g., parent wants to become tutor)
app.post('/add-role', async (c) => {
  console.log('=== POST /role-management/add-role endpoint called ===');
  
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { userId, newRole, roleData } = await c.req.json();
    
    // Validate the user is adding a role to their own account
    if (user.id !== userId) {
      return c.json({ success: false, error: 'Can only add roles to your own account' }, 403);
    }
    
    if (!['parent', 'tutor', 'student'].includes(newRole)) {
      return c.json({ success: false, error: 'Invalid role' }, 400);
    }

    // Get existing roles. Bootstrap with the account's current role the
    // first time this feature is ever used for it — otherwise user_roles
    // would only ever contain roles added THROUGH this endpoint, never the
    // original signup role, and that original role becomes unrecoverable
    // the moment /switch-role later overwrites user:<id>.role (nothing
    // else remembers what it used to be). This is also what
    // GET /admin/users' allRoles reads from, to show a dual-role user as
    // more than just whichever dashboard they're currently sat in.
    let existingRoles = await kv.get(`user_roles:${userId}`) as string[] || [];
    if (existingRoles.length === 0) {
      const currentProfile = await kv.get(`user:${userId}`) as { role?: string } | null;
      if (currentProfile?.role) existingRoles = [currentProfile.role];
    }

    // Check if role already exists
    if (existingRoles.includes(newRole)) {
      return c.json({ success: false, error: 'Role already exists' }, 400);
    }

    // Add the new role
    const updatedRoles = [...existingRoles, newRole];
    await kv.set(`user_roles:${userId}`, updatedRoles);
    
    // Store role-specific data if provided
    if (roleData) {
      const profileKey = `profile_${newRole}_${userId}`;
      await kv.set(profileKey, {
        ...roleData,
        userId,
        role: newRole,
        createdAt: new Date().toISOString(),
        status: newRole === 'tutor' ? 'pending_approval' : 'active',
      });
    }

    console.log(`Added role ${newRole} to user ${userId}`);
    console.log(`User now has roles:`, updatedRoles);

    // Send congratulations email
    const appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.knowledgefonsacademy.com';
    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile?.email) {
      const emailData = emailTemplates.roleAdditionCongratulations(
        userProfile.fullName || userProfile.name || 'User',
        newRole,
        `${appUrl}/dashboard`
      );
      await sendEmail({
        to: userProfile.email,
        subject: emailData.subject,
        html: emailData.html,
        replyTo: 'support@knowledgefonsacademy.com'
      });
    }

    // If adding tutor role, also send verification pending email
    if (newRole === 'tutor' && userProfile?.email) {
      const verificationEmailData = emailTemplates.tutorVerificationPending(
        userProfile.fullName || userProfile.name || 'Tutor',
        `${appUrl}/tutor-dashboard`
      );
      await sendEmail({
        to: userProfile.email,
        subject: verificationEmailData.subject,
        html: verificationEmailData.html,
        replyTo: 'support@knowledgefonsacademy.com'
      });
    }

    return c.json({
      success: true,
      roles: updatedRoles,
      message: `Role ${newRole} added successfully`,
    });
  } catch (error) {
    console.error('Error adding role:', error);
    return c.json({ success: false, error: 'Failed to add role' }, 500);
  }
});

// Switch active role
app.post('/switch-role', async (c) => {
  console.log('=== POST /role-management/switch-role endpoint called ===');
  
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { userId, targetRole } = await c.req.json();
    
    // Validate the user is switching their own role
    if (user.id !== userId) {
      return c.json({ success: false, error: 'Can only switch your own role' }, 403);
    }

    // Get user's available roles
    const availableRoles = await kv.get(`user_roles:${userId}`) as string[] || [];
    
    if (!availableRoles.includes(targetRole)) {
      return c.json({ success: false, error: 'Role not available for this user' }, 403);
    }

    // Get the profile for the target role
    const profileKey = `profile_${targetRole}_${userId}`;
    const targetProfile = await kv.get(profileKey) as Record<string, unknown> | null;

    if (!targetProfile) {
      return c.json({ success: false, error: 'Profile not found for this role' }, 404);
    }

    // IMPORTANT: Merge the target role's fields into the existing user record —
    // do NOT overwrite it wholesale. profile_<role>_<userId> is created from
    // whatever the "add a role" flow sent (often just a couple of fields, e.g.
    // { name: '', createdVia: 'add_role_feature' }), so replacing the canonical
    // user:<userId> record with it used to wipe out email, firstName, lastName,
    // photoUrl, and everything else on the account whenever a dual-role user
    // switched roles. Merging keeps that identity data and only layers the
    // target role's own fields (role, status, role-specific data) on top.
    const existingUser = await kv.get(`user:${userId}`) as Record<string, unknown> | null;
    const mergedProfile = { ...(existingUser ?? {}), ...targetProfile };
    await kv.set(`user:${userId}`, mergedProfile);

    console.log(`User ${userId} switching to role: ${targetRole}`);
    console.log('Merged target role profile into main user profile');

    return c.json({
      success: true,
      profile: mergedProfile,
      message: `Switched to ${targetRole} role successfully`,
    });
  } catch (error) {
    console.error('Error switching role:', error);
    return c.json({ success: false, error: 'Failed to switch role' }, 500);
  }
});

// Get profile for specific role
app.get('/role-profile/:userId/:role', async (c) => {
  console.log('=== GET /role-management/role-profile/:userId/:role endpoint called ===');
  
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const role = c.req.param('role');
    
    // Get the profile for the specified role
    const profileKey = `profile_${role}_${userId}`;
    const profile = await kv.get(profileKey);
    
    if (!profile) {
      return c.json({ success: false, error: 'Profile not found' }, 404);
    }

    console.log(`Retrieved ${role} profile for user ${userId}`);

    return c.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Error fetching role profile:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

// Initialize user roles (called when profile is created)
app.post('/initialize-roles', async (c) => {
  console.log('=== POST /role-management/initialize-roles endpoint called ===');
  
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { userId, initialRole } = await c.req.json();
    
    if (user.id !== userId) {
      return c.json({ success: false, error: 'Can only initialize your own roles' }, 403);
    }

    // Check if roles already initialized
    const existingRoles = await kv.get(`user_roles:${userId}`);
    
    if (existingRoles) {
      console.log(`Roles already initialized for user ${userId}`);
      return c.json({
        success: true,
        roles: existingRoles,
        message: 'Roles already initialized',
      });
    }

    // Initialize with the first role
    await kv.set(`user_roles:${userId}`, [initialRole]);
    
    console.log(`Initialized roles for user ${userId} with role: ${initialRole}`);

    return c.json({
      success: true,
      roles: [initialRole],
      message: 'Roles initialized successfully',
    });
  } catch (error) {
    console.error('Error initializing roles:', error);
    return c.json({ success: false, error: 'Failed to initialize roles' }, 500);
  }
});

export default app;