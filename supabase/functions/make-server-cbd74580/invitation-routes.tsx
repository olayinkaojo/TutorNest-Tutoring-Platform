import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

const invitationRoutes = new Hono();

// Duplicated from index.ts — shared helper
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Duplicated from index.ts — shared helper
const getUserId = async (accessToken: string | null): Promise<string | null> => {
  if (!accessToken) return null;

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('getUserId: token verification failed:', msg);
    return null;
  }
};

// Send invitation to tutor
invitationRoutes.post('/invitations/send', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { tutorId, studentId, childId } = body;

    console.log('Invitation request received:', { userId, tutorId, studentId, childId });

    // Support both childId (new) and studentId (old) for backward compatibility
    const targetStudentId = childId || studentId;

    if (!tutorId || !targetStudentId) {
      console.error('Missing required fields for invitation:', { tutorId, targetStudentId, body });
      return c.json({ error: 'Tutor ID and Student ID are required' }, 400);
    }

    // If childId is provided, get the child profile
    let studentInfo: any;
    if (childId) {
      const childProfile = await kv.get(`child:${childId}`) as any;
      if (!childProfile) {
        return c.json({ error: 'Child profile not found' }, 404);
      }

      // Verify the requesting user is the parent of this child
      if (childProfile.parentId !== userId) {
        return c.json({ error: 'Unauthorized: You can only send invitations for your own children' }, 403);
      }

      // Helper function to calculate age
      const calculateAge = (dob: string): number => {
        if (!dob) return 0;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      studentInfo = {
        name: `${childProfile.firstName} ${childProfile.lastName}`,
        firstName: childProfile.firstName,
        subjects: childProfile.subjects,
        yearGroup: childProfile.gradeLevel,
        age: calculateAge(childProfile.dateOfBirth),
        specialNeeds: childProfile.specialNeeds
      };
    } else {
      // Fall back to old method with studentId
      const studentProfile = await kv.get(`user:${studentId}`) as any;
      if (!studentProfile) {
        return c.json({ error: 'Student profile not found' }, 404);
      }

      studentInfo = {
        name: studentProfile.firstName,
        firstName: studentProfile.firstName,
        subjects: studentProfile.subjects,
        yearGroup: studentProfile.yearGroup
      };
    }

    // Get tutor profile
    const tutorProfile = await kv.get(`user:${tutorId}`) as any;
    if (!tutorProfile) {
      console.error(`Tutor profile not found for ID: ${tutorId}`);
      return c.json({ error: 'Tutor not found' }, 404);
    }

    console.log('Tutor profile found:', { tutorId, tutorName: `${tutorProfile.firstName} ${tutorProfile.lastName}` });

    // Check if invitation already exists
    const existingInvitations = await kv.getByPrefix(`invitation:${tutorId}:${targetStudentId}`);
    if (existingInvitations.length > 0) {
      const existing = existingInvitations[0];
      if (existing.status === 'pending') {
        return c.json({ error: 'Invitation already sent to this tutor' }, 400);
      }
    }

    // Create invitation
    const invitationId = `invitation:${tutorId}:${targetStudentId}:${Date.now()}`;
    const invitation = {
      id: invitationId,
      tutorId,
      studentId: targetStudentId,
      childId: childId || null, // Store childId for new invitations
      parentId: userId,
      status: 'pending', // pending, accepted, declined, expired
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
      reminderSentAt: null,
      respondedAt: null,
      studentInfo,
    };

    await kv.set(invitationId, invitation);

    // Add to tutor's pending invitations list
    const tutorInvitations = await kv.get(`tutor_invitations:${tutorId}`) as any || { invitations: [] };
    tutorInvitations.invitations.push(invitationId);
    await kv.set(`tutor_invitations:${tutorId}`, tutorInvitations);

    console.log(`Invitation sent from parent ${userId} to tutor ${tutorId} for ${childId ? 'child' : 'student'} ${targetStudentId}`);

    // Send email notification to tutor
    try {
      const tutorData: any = tutorProfile;
      const userData: any = await kv.get(`user:${userId}`) as any;
      const tutorEmail = tutorData?.email;
      const parentName = userData?.full_name || userData?.email || 'A parent';
      const studentName = studentInfo?.full_name || studentInfo?.name || 'A student';

      if (tutorEmail) {
        const acceptLink = `${Deno.env.get('FRONTEND_URL') || 'https://app.tutornest.org'}/invitations`;
        const emailData = emailTemplates.tutorBookingNotification(
          tutorData?.full_name || 'Tutor',
          parentName,
          studentName,
          `${(invitation as any).preferredDates?.[0] || 'TBD'}`,
          `${(invitation as any).preferredTimes?.[0] || 'TBD'}`,
          acceptLink
        );

        await sendEmail({
          to: tutorEmail,
          ...emailData,
        });
      }
    } catch (emailError) {
      console.error('Error sending tutor notification email:', emailError);
      // Don't fail the request if email fails
    }

    return c.json({ success: true, invitation });
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get tutor's pending invitations
invitationRoutes.get('/invitations/tutor', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all invitations for this tutor
    const allInvitations = await kv.getByPrefix(`invitation:${userId}:`);

    // Filter pending invitations only
    const pendingInvitations = allInvitations.filter((inv: any) => inv.status === 'pending');

    return c.json({ invitations: pendingInvitations });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Respond to invitation
invitationRoutes.post('/invitations/:invitationId/respond', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const tutorId = await getUserId(accessToken ?? null);

    if (!tutorId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const invitationId = c.req.param('invitationId');
    const { response } = await c.req.json(); // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(response)) {
      return c.json({ error: 'Invalid response. Must be accept or decline' }, 400);
    }

    const invitation = await kv.get(invitationId) as any;
    if (!invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    if (invitation.tutorId !== tutorId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Invitation already responded to' }, 400);
    }

    // Update invitation
    const updatedInvitation = {
      ...invitation,
      status: response === 'accept' ? 'accepted' : 'declined',
      respondedAt: new Date().toISOString(),
    };

    await kv.set(invitationId, updatedInvitation);

    // Update tutor's response rate
    const tutorProfile = await kv.get(`user:${tutorId}`) as any;
    if (tutorProfile) {
      const allInvitations = await kv.getByPrefix(`invitation:${tutorId}:`);
      const responded = allInvitations.filter((inv: any) => inv.respondedAt).length;
      const responseRate = Math.round((responded / allInvitations.length) * 100);

      await kv.set(`user:${tutorId}`, {
        ...tutorProfile,
        responseRate,
        updatedAt: new Date().toISOString(),
      });
    }

    return c.json({ success: true, invitation: updatedInvitation });
  } catch (error: any) {
    console.error('Error responding to invitation:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Check and process expired invitations (SLA enforcement)
invitationRoutes.post('/invitations/check-sla', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const now = new Date();
    const allInvitations = await kv.getByPrefix('invitation:');

    const updates = {
      reminders: 0,
      expired: 0,
    };

    for (const invitation of allInvitations) {
      if (invitation.status !== 'pending') continue;

      const sentAt = new Date(invitation.sentAt);
      const expiresAt = new Date(invitation.expiresAt);
      const hoursSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

      // Send reminder after 24 hours
      if (hoursSinceSent >= 24 && !invitation.reminderSentAt) {
        invitation.reminderSentAt = now.toISOString();
        await kv.set(invitation.id, invitation);
        updates.reminders++;
        // TODO: Send reminder email
      }

      // Auto-expire after 72 hours
      if (now > expiresAt) {
        invitation.status = 'expired';
        invitation.expiredAt = now.toISOString();
        await kv.set(invitation.id, invitation);
        updates.expired++;
      }
    }

    return c.json({
      success: true,
      reminders: updates.reminders,
      expired: updates.expired
    });
  } catch (error: any) {
    console.error('Error checking SLA:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export { invitationRoutes };
