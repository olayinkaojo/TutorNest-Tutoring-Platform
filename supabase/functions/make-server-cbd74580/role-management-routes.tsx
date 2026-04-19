import { Hono } from 'npm:hono';
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

// Helper to get user from token
const getUserFromToken = async (accessToken: string | null) => {
  if (!accessToken) {
    console.log('No access token provided');
    return null;
  }
  
  try {
    // Decode JWT to extract user ID (same approach as main getUserId function)
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Extract user ID from payload (Supabase uses 'sub' claim for user ID)
    const userId = payload.sub;
    
    if (!userId) {
      console.error('No user ID found in token payload');
      return null;
    }
    
    // Return a user object with the ID
    return { id: userId };
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

    // Get existing roles
    const existingRoles = await kv.get(`user_roles:${userId}`) as string[] || [];
    
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
    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile?.email) {
      const emailData = emailTemplates.roleAdditionCongratulations(
        userProfile.fullName || userProfile.name || 'User',
        newRole,
        `https://tutornest.org/dashboard`
      );
      await sendEmail({
        to: userProfile.email,
        subject: emailData.subject,
        html: emailData.html,
        replyTo: 'support@tutornest.org'
      });
    }

    // If adding tutor role, also send verification pending email
    if (newRole === 'tutor' && userProfile?.email) {
      const verificationEmailData = emailTemplates.tutorVerificationPending(
        userProfile.fullName || userProfile.name || 'Tutor',
        `https://tutornest.org/tutor-dashboard`
      );
      // Small delay to avoid overwhelming the email service
      setTimeout(async () => {
        await sendEmail({
          to: userProfile.email,
          subject: verificationEmailData.subject,
          html: verificationEmailData.html,
          replyTo: 'support@tutornest.org'
        });
      }, 1000);
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
    const targetProfile = await kv.get(profileKey);
    
    if (!targetProfile) {
      return c.json({ success: false, error: 'Profile not found for this role' }, 404);
    }

    // IMPORTANT: Update the main user profile to reflect the active role
    // This ensures that when the profile is fetched again (e.g., on tab focus),
    // it returns the correct active role instead of reverting to the old role
    await kv.set(`user:${userId}`, targetProfile);

    console.log(`User ${userId} switching to role: ${targetRole}`);
    console.log('Updated main user profile with target role');

    return c.json({
      success: true,
      profile: targetProfile,
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