import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail } from './email-service.tsx';

const parentChildrenRoutes = new Hono();

// Helper to get user ID from access token
const getUserIdFromToken = (accessToken: string | null): string | null => {
  if (!accessToken) {
    console.log('No access token provided');
    return null;
  }
  
  try {
    // Decode JWT to extract user ID
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
    
    return userId;
  } catch (err) {
    console.error('Exception in getUserIdFromToken:', err);
    return null;
  }
};

// Add a child to a parent's account
parentChildrenRoutes.post('/add-child', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { 
      parentId, 
      firstName, 
      lastName, 
      dateOfBirth, 
      gradeLevel, 
      subjects, 
      learningGoals, 
      specialNeeds 
    } = body;

    // Validate required fields
    if (!parentId || !firstName || !lastName || !dateOfBirth || !gradeLevel || !subjects) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify the requesting user is the parent
    if (userId !== parentId) {
      return c.json({ error: 'Unauthorized: You can only add children to your own account' }, 403);
    }

    // No subscription limits for adding children - subscriptions are only for resources

    // Generate a unique child ID
    const childId = crypto.randomUUID();

    // Create child profile
    const childProfile = {
      id: childId,
      parentId,
      firstName,
      lastName,
      dateOfBirth,
      gradeLevel,
      subjects: Array.isArray(subjects) ? subjects : [subjects],
      learningGoals: learningGoals || '',
      specialNeeds: specialNeeds || '',
      createdAt: new Date().toISOString(),
      achievements: [],
      completedLessons: 0,
    };

    // Store child profile
    await kv.set(`child:${childId}`, childProfile);

    // Add child to parent's children list
    const parentChildrenKey = `parent_children:${parentId}`;
    const existingChildren = (await kv.get(parentChildrenKey)) || [];
    if (!Array.isArray(existingChildren)) {
      await kv.set(parentChildrenKey, [childId]);
    } else {
      existingChildren.push(childId);
      await kv.set(parentChildrenKey, existingChildren);
    }

    console.log(`Child profile created successfully for parent ${parentId}: ${childId}. Total children: ${existingChildren.length + 1}`);

    // Send "child added" confirmation email to the parent (non-fatal)
    try {
      const parentProfile = await kv.get(`user:${parentId}`) as any;
      const parentEmail = parentProfile?.email;
      if (parentEmail) {
        const childName = `${firstName} ${lastName}`.trim() || 'your child';
        const parentName = parentProfile?.firstName || parentProfile?.name || 'there';
        const dashboardBase = Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_APP_URL') || 'https://app.knowledgefonsacademy.com';
        const subject = `${childName} has been added to Knowledge Fons Academy`;
        const html = `
          <p>Hi ${parentName},</p>
          <p>You've successfully added <strong>${childName}</strong> to your Knowledge Fons Academy account.</p>
          <p>You can now <a href="${dashboardBase}/dashboard/parent">search for tutors</a> and book sessions for ${childName}.</p>
          <p>The Knowledge Fons Academy Team</p>
        `;
        await sendEmail({ to: parentEmail, subject, html }).catch(e => console.warn('child added email:', e));
      }
    } catch (emailErr) {
      console.warn('child added email (outer):', emailErr);
    }

    return c.json({
      success: true,
      childId,
      child: childProfile,
    });
  } catch (error: any) {
    console.error('Error adding child:', error);
    return c.json({ error: error.message || 'Failed to add child' }, 500);
  }
});

// Get all children for a parent
parentChildrenRoutes.get('/children/:parentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    console.log('=== GET /children/:parentId Debug ===');
    console.log('Extracted userId from token:', userId);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const parentId = c.req.param('parentId');
    console.log('Requested parentId:', parentId);

    // Verify the requesting user is the parent
    // Check both direct match and also verify the user profile
    if (userId !== parentId) {
      // Also check if the user profile exists with this ID
      const userProfile = await kv.get(`user:${userId}`);
      console.log('User profile found:', !!userProfile);
      
      // If the requested parentId is actually the userId, that's fine
      // Or if the user profile's id matches the parentId, that's also fine
      const profileMatch = userProfile && (
        (userProfile as any).id === parentId || 
        (userProfile as any).userId === parentId
      );
      
      console.log('Profile match result:', profileMatch);
      
      if (!profileMatch && userId !== parentId) {
        console.log('Authorization failed - userId:', userId, 'parentId:', parentId);
        return c.json({ error: 'Unauthorized: You can only view your own children' }, 403);
      }
    }

    console.log('Authorization passed, fetching children...');

    // Get children IDs - try both userId and parentId as keys
    let childrenIds = (await kv.get(`parent_children:${parentId}`)) || [];
    
    // If no children found with parentId, try with userId
    if (!Array.isArray(childrenIds) || childrenIds.length === 0) {
      childrenIds = (await kv.get(`parent_children:${userId}`)) || [];
      console.log('Tried alternate key with userId, found:', childrenIds.length, 'children');
    } else {
      console.log('Found', childrenIds.length, 'children with parentId key');
    }

    if (!Array.isArray(childrenIds) || childrenIds.length === 0) {
      console.log('No children found for this parent');
      return c.json({ children: [] });
    }

    // Get all child profiles with session statistics
    const children = [];
    for (const childId of childrenIds) {
      const child = await kv.get(`child:${childId}`);
      if (child) {
        // Get session statistics for this child from both sessions and bookings
        const sessions = await kv.getByPrefix(`session:${childId}:`);
        const allBookings = await kv.getByPrefix('booking:');
        
        // Filter bookings for this student
        const childBookings = allBookings.filter((b: any) => b.studentId === childId);
        
        // Count upcoming bookings
        const now = new Date();
        const upcomingBookingsCount = childBookings.filter((b: any) => {
          const bookingDateTime = new Date(`${b.date}T${b.startTime}`);
          return bookingDateTime > now && b.status === 'confirmed';
        }).length;
        
        // Count completed bookings
        const completedBookingsCount = childBookings.filter((b: any) => 
          b.status === 'completed'
        ).length;
        
        // Legacy sessions (keeping for backward compatibility)
        const upcomingSessions = sessions.filter((s: any) => 
          new Date(s.scheduledTime) > new Date() && s.status === 'scheduled'
        ).length;
        const completedSessions = sessions.filter((s: any) => 
          s.status === 'completed'
        ).length;
        
        // Calculate age from date of birth
        const age = calculateAge(child.dateOfBirth);
        
        children.push({
          ...child,
          age,
          upcomingSessions: upcomingBookingsCount + upcomingSessions,
          completedSessions: child.completedLessons || (completedBookingsCount + completedSessions),
          progress: child.progress || 0
        });
      }
    }

    console.log('Successfully fetched', children.length, 'children');

    // Get subscription info
    const subscription = await kv.get(`subscription_parent_${parentId}`);

    return c.json({ 
      children,
      subscription: {
        tier: subscription?.tierName || 'basic',
        limit: subscription?.maxChildren || 1
      }
    });
  } catch (error: any) {
    console.error('Error fetching children:', error);
    return c.json({ error: error.message || 'Failed to fetch children' }, 500);
  }
});

// Get a specific child profile
parentChildrenRoutes.get('/child/:childId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const childId = c.req.param('childId');
    const child = await kv.get(`child:${childId}`);

    if (!child) {
      return c.json({ error: 'Child not found' }, 404);
    }

    // Verify the requesting user is the parent
    if (userId !== child.parentId) {
      return c.json({ error: 'Unauthorized: You can only view your own children' }, 403);
    }

    return c.json({ child });
  } catch (error: any) {
    console.error('Error fetching child:', error);
    return c.json({ error: error.message || 'Failed to fetch child' }, 500);
  }
});

// Update a child profile (alternative endpoint with childId in body)
parentChildrenRoutes.put('/update-child', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { childId, firstName, lastName, dateOfBirth, gradeLevel, subjects, learningGoals, specialNeeds } = body;

    if (!childId) {
      return c.json({ error: 'Child ID is required' }, 400);
    }

    const child = await kv.get(`child:${childId}`);

    if (!child) {
      return c.json({ error: 'Child not found' }, 404);
    }

    // Verify the requesting user is the parent
    if (userId !== child.parentId) {
      return c.json({ error: 'Unauthorized: You can only update your own children' }, 403);
    }

    // Update child profile with provided fields
    const updatedChild = {
      ...child,
      firstName: firstName !== undefined ? firstName : child.firstName,
      lastName: lastName !== undefined ? lastName : child.lastName,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : child.dateOfBirth,
      gradeLevel: gradeLevel !== undefined ? gradeLevel : child.gradeLevel,
      subjects: subjects !== undefined ? (Array.isArray(subjects) ? subjects : [subjects]) : child.subjects,
      learningGoals: learningGoals !== undefined ? learningGoals : child.learningGoals,
      specialNeeds: specialNeeds !== undefined ? specialNeeds : child.specialNeeds,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`child:${childId}`, updatedChild);

    console.log(`Child profile updated successfully: ${childId}`);

    return c.json({
      success: true,
      child: updatedChild,
    });
  } catch (error: any) {
    console.error('Error updating child:', error);
    return c.json({ error: error.message || 'Failed to update child' }, 500);
  }
});

// Update a child profile
parentChildrenRoutes.put('/child/:childId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const childId = c.req.param('childId');
    const updates = await c.req.json();

    const child = await kv.get(`child:${childId}`);

    if (!child) {
      return c.json({ error: 'Child not found' }, 404);
    }

    // Verify the requesting user is the parent
    if (userId !== child.parentId) {
      return c.json({ error: 'Unauthorized: You can only update your own children' }, 403);
    }

    // Update child profile
    const updatedChild = {
      ...child,
      ...updates,
      id: childId, // Ensure ID doesn't change
      parentId: child.parentId, // Ensure parent doesn't change
      createdAt: child.createdAt, // Ensure creation date doesn't change
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`child:${childId}`, updatedChild);

    return c.json({
      success: true,
      child: updatedChild,
    });
  } catch (error: any) {
    console.error('Error updating child:', error);
    return c.json({ error: error.message || 'Failed to update child' }, 500);
  }
});

// Delete a child profile
parentChildrenRoutes.delete('/child/:childId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const childId = c.req.param('childId');
    const child = await kv.get(`child:${childId}`);

    if (!child) {
      return c.json({ error: 'Child not found' }, 404);
    }

    // Verify the requesting user is the parent
    if (userId !== child.parentId) {
      return c.json({ error: 'Unauthorized: You can only delete your own children' }, 403);
    }

    // Remove child from parent's children list
    const parentChildrenKey = `parent_children:${child.parentId}`;
    const childrenIds = (await kv.get(parentChildrenKey)) || [];
    
    if (Array.isArray(childrenIds)) {
      const updatedChildrenIds = childrenIds.filter((id: string) => id !== childId);
      await kv.set(parentChildrenKey, updatedChildrenIds);
    }

    // Delete child profile
    await kv.del(`child:${childId}`);

    console.log(`Child profile deleted: ${childId}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting child:', error);
    return c.json({ error: error.message || 'Failed to delete child' }, 500);
  }
});

export default parentChildrenRoutes;

// Helper function to calculate age
function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}