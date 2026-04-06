import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

export function studentAuthRoutes(app: Hono, getUserId: (token: string | null) => Promise<string | null>) {

  // Enable student login for a child profile (Parent-initiated)
  app.post('/make-server-cbd74580/student-auth/enable-login', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const parentId = await getUserId(accessToken ?? null);

      if (!parentId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { childId, studentEmail, generatePassword } = body;

      // Get child profile
      const child = await kv.get(`child:${childId}`) as any;
      if (!child) {
        return c.json({ error: 'Child profile not found' }, 404);
      }

      // Verify parent owns this child
      if (child.parentId !== parentId) {
        return c.json({ error: 'Unauthorized: Not your child' }, 403);
      }

      // Check if student login already enabled
      if (child.studentLoginEnabled) {
        return c.json({ error: 'Student login already enabled for this child' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Generate student email if not provided
      const finalStudentEmail = studentEmail || 
        `${child.firstName.toLowerCase()}.${child.lastName.toLowerCase()}.${childId.slice(-4)}@student.tutornest.com`;

      // Check if a user with this email already exists
      let authUserId = null;
      let existingAuthUser = null;
      
      try {
        // Try to get user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && users) {
          existingAuthUser = users.users.find((u: any) => u.email === finalStudentEmail);
        }
      } catch (err) {
        console.log('Could not check for existing user, will attempt creation:', err);
      }

      if (existingAuthUser) {
        console.log('Student auth user already exists with this email:', finalStudentEmail);
        authUserId = existingAuthUser.id;
        
        // Check if there's already a user profile for this auth user
        const existingProfile = await kv.get(`user:${authUserId}`) as any;
        if (existingProfile) {
          // Link the existing profile to this child
          console.log('Linking existing student profile to child:', childId);
          existingProfile.linkedChildId = childId;
          existingProfile.linkedParentId = parentId;
          await kv.set(`user:${authUserId}`, existingProfile);
          
          // Update child profile
          child.studentLoginEnabled = true;
          child.studentUserId = authUserId;
          child.studentEmail = finalStudentEmail;
          await kv.set(`child:${childId}`, child);
          
          return c.json({ 
            success: true,
            message: 'Student login enabled (existing account linked)',
            studentEmail: finalStudentEmail,
            studentUserId: authUserId,
            existingAccount: true
          });
        }
      }

      // Generate secure password if requested
      const password = generatePassword 
        ? `${child.firstName}${Math.random().toString(36).slice(-8)}!`
        : body.password;

      if (!password) {
        return c.json({ error: 'Password required' }, 400);
      }

      // Create Supabase auth user for student (only if doesn't exist)
      let authData: any = null;
      if (!existingAuthUser) {
        const { data, error: authError } = await supabase.auth.admin.createUser({
          email: finalStudentEmail,
          password: password,
          email_confirm: true, // Auto-confirm since parent is creating it
          user_metadata: {
            role: 'student',
            firstName: child.firstName,
            lastName: child.lastName,
            linkedChildId: childId,
            linkedParentId: parentId,
            isDependent: true
          }
        });

        if (authError || !data.user) {
          console.error('Error creating student auth:', authError);
          return c.json({ 
            error: authError?.message || 'Failed to create student account',
            details: authError,
            debugInfo: `Email: ${finalStudentEmail}, ChildId: ${childId}` 
          }, 500);
        }
        
        authData = data;
        authUserId = data.user.id;
      } else {
        // Use existing auth user but create a new profile
        authData = { user: existingAuthUser };
        authUserId = existingAuthUser.id;
      }

      // Create student user profile
      const studentProfile = {
        id: authUserId,
        userId: authUserId,
        role: 'student',
        email: finalStudentEmail,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        grade: child.gradeLevel,
        subjects: child.subjects || [],
        learningGoals: child.learningGoals || [],
        specialNeeds: child.specialNeeds,
        linkedChildId: childId,
        linkedParentId: parentId,
        isDependent: true,
        accountType: 'student',
        createdAt: new Date().toISOString(),
        createdBy: parentId
      };

      await kv.set(`user:${authUserId}`, studentProfile);

      // Update child profile with student login info
      child.studentLoginEnabled = true;
      child.studentUserId = authUserId;
      child.studentEmail = finalStudentEmail;
      child.studentLoginEnabledAt = new Date().toISOString();
      await kv.set(`child:${childId}`, child);

      // Create notification for parent
      const notificationId = `notification:${Date.now()}`;
      await kv.set(notificationId, {
        id: notificationId,
        userId: parentId,
        type: 'info',
        title: 'Student Login Enabled',
        message: `Student login has been enabled for ${child.firstName}. Email: ${finalStudentEmail}`,
        read: false,
        priority: 'medium',
        createdAt: new Date().toISOString(),
        metadata: {
          childId,
          studentEmail: finalStudentEmail
        }
      });

      return c.json({ 
        success: true, 
        studentUserId: authUserId,
        studentEmail: finalStudentEmail,
        temporaryPassword: generatePassword ? password : undefined,
        message: 'Student login enabled successfully'
      });
    } catch (error: any) {
      console.error('Error enabling student login:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Disable student login (Parent-initiated)
  app.post('/make-server-cbd74580/student-auth/disable-login', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const parentId = await getUserId(accessToken ?? null);

      if (!parentId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { childId } = body;

      // Get child profile
      const child = await kv.get(`child:${childId}`) as any;
      if (!child) {
        return c.json({ error: 'Child profile not found' }, 404);
      }

      // Verify parent owns this child
      if (child.parentId !== parentId) {
        return c.json({ error: 'Unauthorized: Not your child' }, 403);
      }

      if (!child.studentLoginEnabled) {
        return c.json({ error: 'Student login not enabled' }, 400);
      }

      // Disable the student account (don't delete, for audit purposes)
      if (child.studentUserId) {
        const studentProfile = await kv.get(`user:${child.studentUserId}`) as any;
        if (studentProfile) {
          studentProfile.disabled = true;
          studentProfile.disabledAt = new Date().toISOString();
          studentProfile.disabledBy = parentId;
          await kv.set(`user:${child.studentUserId}`, studentProfile);
        }
      }

      // Update child profile
      child.studentLoginEnabled = false;
      child.studentLoginDisabledAt = new Date().toISOString();
      await kv.set(`child:${childId}`, child);

      return c.json({ 
        success: true,
        message: 'Student login disabled successfully'
      });
    } catch (error: any) {
      console.error('Error disabling student login:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Independent student signup (18+, no parent)
  app.post('/make-server-cbd74580/student-auth/independent-signup', async (c) => {
    try {
      const body = await c.req.json();
      const { email, password, firstName, lastName, dateOfBirth, subjects, learningGoals } = body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !dateOfBirth) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      // Calculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Require 18+ for independent signup
      if (age < 18) {
        return c.json({ 
          error: 'Independent signup requires age 18+. Please have a parent/guardian create an account.',
          requiresParent: true 
        }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          firstName: firstName,
          lastName: lastName,
          isDependent: false
        }
      });

      if (authError || !authData.user) {
        console.error('Error creating independent student:', authError);
        return c.json({ error: authError?.message || 'Failed to create account' }, 500);
      }

      // Create student user profile
      const studentProfile = {
        id: authData.user.id,
        userId: authData.user.id,
        role: 'student',
        email: email,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        age: age,
        subjects: subjects || [],
        learningGoals: learningGoals || [],
        isDependent: false,
        accountType: 'independent_student',
        createdAt: new Date().toISOString(),
        onboardingCompleted: false
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎓 INDEPENDENT STUDENT SIGNUP: Creating student profile');
      console.log('User ID:', authData.user.id);
      console.log('Email:', email);
      console.log('Role:', studentProfile.role);
      console.log('Profile:', JSON.stringify(studentProfile, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await kv.set(`user:${authData.user.id}`, studentProfile);
      console.log('✅ Independent student profile saved to KV store');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Send email verification
      const verificationLink = `${Deno.env.get('VITE_APP_URL') || 'https://tutornest.com'}/verify-email?token=${authData.user.id}`;
      const emailResult = await sendEmail({
        to: email,
        subject: emailTemplates.emailVerification(firstName, verificationLink).subject,
        html: emailTemplates.emailVerification(firstName, verificationLink).html,
      });
      
      if (!emailResult.success) {
        console.warn('⚠️ Failed to send verification email:', emailResult.error);
      } else {
        console.log('✅ Verification email sent to', email);
      }

      // Create welcome notification
      const notificationId = `notification:${Date.now()}`;
      await kv.set(notificationId, {
        id: notificationId,
        userId: authData.user.id,
        type: 'welcome',
        title: 'Welcome to TutorNest! 🎓',
        message: 'Your account has been created. Complete your profile to find the perfect tutor.',
        read: false,
        priority: 'medium',
        createdAt: new Date().toISOString()
      });

      // Auto-login user after signup
      console.log('Signing in independent student to get session token...');
      try {
        const anonSupabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          console.error('Error auto-login after independent signup:', signInError);
          return c.json({ 
            success: true,
            userId: authData.user.id,
            message: 'Account created successfully. Please sign in manually.',
            warning: 'Auto-login failed'
          });
        }
        
        console.log('Auto-login successful for independent student');
        return c.json({ 
          success: true,
          userId: authData.user.id,
          user: signInData.user,
          session: signInData.session,
          message: 'Independent student account created successfully'
        });
      } catch (signInException: any) {
        console.error('Exception during independent student auto-login:', signInException);
        return c.json({ 
          success: true,
          userId: authData.user.id,
          message: 'Account created successfully. Please sign in manually.',
          warning: 'Auto-login failed'
        });
      }
    } catch (error: any) {
      console.error('Error creating independent student:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Student-initiated signup with parent linking (13-17)
  app.post('/make-server-cbd74580/student-auth/dependent-signup', async (c) => {
    try {
      const body = await c.req.json();
      const { email, password, firstName, lastName, dateOfBirth, parentEmail, subjects, learningGoals } = body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !dateOfBirth || !parentEmail) {
        return c.json({ error: 'Missing required fields (including parent email)' }, 400);
      }

      // Calculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Age restriction: 13-17 for dependent signup
      if (age < 13) {
        return c.json({ 
          error: 'Account creation requires age 13+. Please have a parent create your account.',
          tooYoung: true 
        }, 400);
      }

      if (age >= 18) {
        return c.json({ 
          error: 'Age 18+ should use independent signup.',
          shouldUseIndependent: true 
        }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: 'student',
          firstName: firstName,
          lastName: lastName,
          isDependent: true,
          parentEmail: parentEmail,
          awaitingParentLink: true
        }
      });

      if (authError || !authData.user) {
        console.error('Error creating dependent student:', authError);
        return c.json({ error: authError?.message || 'Failed to create account' }, 500);
      }

      // Create student user profile (pending parent link)
      const studentProfile = {
        id: authData.user.id,
        userId: authData.user.id,
        role: 'student',
        email: email,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        age: age,
        subjects: subjects || [],
        learningGoals: learningGoals || [],
        isDependent: true,
        parentEmail: parentEmail,
        accountType: 'dependent_student',
        awaitingParentLink: true,
        parentLinkToken: `link_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString()
      };

      await kv.set(`user:${authData.user.id}`, studentProfile);

      // Store pending link request
      const linkRequestId = `parent-link-request:${authData.user.id}`;
      await kv.set(linkRequestId, {
        id: linkRequestId,
        studentId: authData.user.id,
        studentName: `${firstName} ${lastName}`,
        studentEmail: email,
        parentEmail: parentEmail,
        linkToken: studentProfile.parentLinkToken,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

      // Send email to student with verification link
      const studentVerificationLink = `${Deno.env.get('VITE_APP_URL') || 'https://tutornest.com'}/verify-email?token=${authData.user.id}`;
      const studentEmailResult = await sendEmail({
        to: email,
        subject: emailTemplates.emailVerification(firstName, studentVerificationLink).subject,
        html: emailTemplates.emailVerification(firstName, studentVerificationLink).html,
      });
      
      if (!studentEmailResult.success) {
        console.warn('⚠️ Failed to send student verification email:', studentEmailResult.error);
      } else {
        console.log('✅ Student verification email sent to', email);
      }

      // Send email to parent with linking invitation
      const parentLinkUrl = `${Deno.env.get('VITE_APP_URL') || 'https://tutornest.com'}/parent/link-student?token=${studentProfile.parentLinkToken}&studentId=${authData.user.id}`;
      const parentInviteEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #625d9c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1>Link Your Child's TutorNest Account</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
            <p>Hi there,</p>
            
            <p>${firstName} ${lastName} has created a TutorNest account and would like you to approve it.</p>
            
            <p>As their parent/guardian, you'll need to verify this account link to allow them to access TutorNest tutoring sessions.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${parentLinkUrl}" style="display: inline-block; background-color: #625d9c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Link & Approve Account
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy this link:<br>
              <span style="word-break: break-all; color: #0066cc;">${parentLinkUrl}</span>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              This link will expire in 7 days. If you didn't request this or don't recognize ${firstName} ${lastName}, you can safely ignore this email.
            </p>
          </div>
        </div>
      `;
      
      const parentEmailResult = await sendEmail({
        to: parentEmail,
        subject: `${firstName} ${lastName} wants to use TutorNest - Approve Account`,
        html: parentInviteEmail,
      });
      
      if (!parentEmailResult.success) {
        console.warn('⚠️ Failed to send parent invitation email:', parentEmailResult.error);
      } else {
        console.log('✅ Parent invitation email sent to', parentEmail);
      }

      // Auto-login user after signup
      console.log('Signing in dependent student to get session token...');
      try {
        const anonSupabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          console.error('Error auto-login after dependent signup:', signInError);
          return c.json({ 
            success: true,
            userId: authData.user.id,
            message: 'Account created. Please sign in manually. An invitation has been sent to your parent/guardian.',
            awaitingParentLink: true,
            warning: 'Auto-login failed'
          });
        }
        
        console.log('Auto-login successful for dependent student');
        return c.json({ 
          success: true,
          userId: authData.user.id,
          user: signInData.user,
          session: signInData.session,
          message: 'Account created. An invitation has been sent to your parent/guardian.',
          awaitingParentLink: true
        });
      } catch (signInException: any) {
        console.error('Exception during dependent student auto-login:', signInException);
        return c.json({ 
          success: true,
          userId: authData.user.id,
          message: 'Account created. Please sign in manually. An invitation has been sent to your parent/guardian.',
          awaitingParentLink: true,
          warning: 'Auto-login failed'
        });
      }
    } catch (error: any) {
      console.error('Error creating dependent student:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Parent accepts student link request
  app.post('/make-server-cbd74580/student-auth/accept-link', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const parentId = await getUserId(accessToken ?? null);

      if (!parentId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { linkToken } = body;

      // Find link request
      const allRequests = await kv.getByPrefix('parent-link-request:');
      const linkRequest = allRequests.find((r: any) => r.linkToken === linkToken);

      if (!linkRequest) {
        return c.json({ error: 'Invalid or expired link' }, 404);
      }

      if (linkRequest.status !== 'pending') {
        return c.json({ error: 'Link request already processed' }, 400);
      }

      // Check expiration
      if (new Date(linkRequest.expiresAt) < new Date()) {
        return c.json({ error: 'Link request expired' }, 400);
      }

      // Get parent profile
      const parentProfile = await kv.get(`user:${parentId}`) as any;
      if (!parentProfile || parentProfile.role !== 'parent') {
        return c.json({ error: 'Only parent accounts can accept link requests' }, 403);
      }

      // Verify parent email matches
      if (parentProfile.email !== linkRequest.parentEmail) {
        return c.json({ error: 'Parent email does not match the requested email' }, 403);
      }

      // Get student profile
      const studentProfile = await kv.get(`user:${linkRequest.studentId}`) as any;
      if (!studentProfile) {
        return c.json({ error: 'Student profile not found' }, 404);
      }

      // Create child profile for this student
      const childId = `child:${Date.now()}`;
      const childProfile = {
        id: childId,
        parentId: parentId,
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        dateOfBirth: studentProfile.dateOfBirth,
        gradeLevel: studentProfile.grade || 'Not specified',
        subjects: studentProfile.subjects || [],
        learningGoals: studentProfile.learningGoals || [],
        specialNeeds: studentProfile.specialNeeds,
        studentLoginEnabled: true,
        studentUserId: studentProfile.id,
        studentEmail: studentProfile.email,
        createdAt: new Date().toISOString(),
        linkedFromStudentSignup: true
      };

      await kv.set(childId, childProfile);

      // Update student profile
      studentProfile.linkedChildId = childId;
      studentProfile.linkedParentId = parentId;
      studentProfile.awaitingParentLink = false;
      studentProfile.parentLinkedAt = new Date().toISOString();
      await kv.set(`user:${linkRequest.studentId}`, studentProfile);

      // Update parent's children list
      const parentChildrenKey = `parent_children:${parentId}`;
      const existingChildren = await kv.get(parentChildrenKey) || [];
      if (Array.isArray(existingChildren)) {
        existingChildren.push(childId);
        await kv.set(parentChildrenKey, existingChildren);
      } else {
        await kv.set(parentChildrenKey, [childId]);
      }

      // Update link request status
      linkRequest.status = 'accepted';
      linkRequest.acceptedAt = new Date().toISOString();
      linkRequest.acceptedBy = parentId;
      await kv.set(linkRequest.id, linkRequest);

      // Create notifications
      const parentNotificationId = `notification:${Date.now()}`;
      await kv.set(parentNotificationId, {
        id: parentNotificationId,
        userId: parentId,
        type: 'success',
        title: 'Student Account Linked',
        message: `${studentProfile.firstName} ${studentProfile.lastName}'s account has been linked to yours.`,
        read: false,
        priority: 'medium',
        createdAt: new Date().toISOString()
      });

      const studentNotificationId = `notification:${Date.now() + 1}`;
      await kv.set(studentNotificationId, {
        id: studentNotificationId,
        userId: linkRequest.studentId,
        type: 'success',
        title: 'Account Linked Successfully! 🎉',
        message: `Your account has been linked to your parent/guardian. You can now access all features.`,
        read: false,
        priority: 'high',
        createdAt: new Date().toISOString()
      });

      return c.json({ 
        success: true,
        childId: childId,
        message: 'Student account linked successfully'
      });
    } catch (error: any) {
      console.error('Error accepting link request:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get pending link requests for parent
  app.get('/make-server-cbd74580/student-auth/pending-links', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const parentId = await getUserId(accessToken ?? null);

      if (!parentId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get parent email
      const parentProfile = await kv.get(`user:${parentId}`) as any;
      if (!parentProfile) {
        return c.json({ error: 'Parent profile not found' }, 404);
      }

      // Get all pending link requests for this parent's email
      const allRequests = await kv.getByPrefix('parent-link-request:');
      const pendingRequests = allRequests.filter((r: any) => 
        r.parentEmail === parentProfile.email && 
        r.status === 'pending' &&
        new Date(r.expiresAt) > new Date()
      );

      return c.json({ 
        requests: pendingRequests
      });
    } catch (error: any) {
      console.error('Error fetching pending links:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Check student link status (for students waiting for parent)
  app.get('/make-server-cbd74580/student-auth/link-status', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const studentId = await getUserId(accessToken ?? null);

      if (!studentId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const studentProfile = await kv.get(`user:${studentId}`) as any;
      if (!studentProfile || studentProfile.role !== 'student') {
        return c.json({ error: 'Not a student account' }, 403);
      }

      return c.json({
        isLinked: !studentProfile.awaitingParentLink,
        linkedParentId: studentProfile.linkedParentId,
        awaitingParentLink: studentProfile.awaitingParentLink || false,
        parentEmail: studentProfile.parentEmail
      });
    } catch (error: any) {
      console.error('Error checking link status:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Reset student password (Parent-initiated)
  app.post('/make-server-cbd74580/student-auth/reset-password', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const parentId = await getUserId(accessToken ?? null);

      if (!parentId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { childId, newPassword } = body;

      // Get child profile
      const child = await kv.get(`child:${childId}`) as any;
      if (!child) {
        return c.json({ error: 'Child profile not found' }, 404);
      }

      // Verify parent owns this child
      if (child.parentId !== parentId) {
        return c.json({ error: 'Unauthorized: Not your child' }, 403);
      }

      if (!child.studentLoginEnabled || !child.studentUserId) {
        return c.json({ error: 'Student login not enabled' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        child.studentUserId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error resetting student password:', updateError);
        return c.json({ error: 'Failed to reset password' }, 500);
      }

      // Create audit log
      const auditId = `audit:${child.studentUserId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: child.studentUserId,
        action: 'password_reset_by_parent',
        description: 'Password reset by parent',
        parentId: parentId,
        timestamp: new Date().toISOString()
      });

      return c.json({ 
        success: true,
        message: 'Student password reset successfully'
      });
    } catch (error: any) {
      console.error('Error resetting student password:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
}