import { Hono, Router } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import {
  createTeacherProfile,
  getTeacherProfile,
  updateTeacherProfile,
  uploadTeacherCredential,
  verifyTeacherAccount,
  createClass,
  getClass,
  updateClass,
  deleteClass,
  getTeacherClasses,
  addStudentToClass,
  removeStudentFromClass,
  getClassMembers,
  enrollStudentByCode,
  getStudentClasses,
} from './teacher-profile-service.tsx';

export const teacherRoutes = new Router();

// Teacher Profile Endpoints

teacherRoutes.post('/profile', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const data = await c.req.json();
    const profile = await createTeacherProfile(userId, data);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.get('/profile', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const profile = await getTeacherProfile(userId);
    if (!profile) return c.json({ error: 'Profile not found' }, 404);

    return c.json({ profile });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.put('/profile', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const data = await c.req.json();
    const profile = await updateTeacherProfile(userId, data);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.post('/verification', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { credentialUrl } = await c.req.json();
    const profile = await uploadTeacherCredential(userId, credentialUrl);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.get('/verification-status', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const profile = await getTeacherProfile(userId);
    if (!profile) return c.json({ error: 'Profile not found' }, 404);

    return c.json({
      verified: profile.verified,
      status: profile.verificationStatus,
      credentialUrl: profile.credentialUrl,
    });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// Admin endpoint for verification
teacherRoutes.post('/verify/:userId', async (c) => {
  try {
    const adminId = c.req.header('X-Admin-Id');
    if (!adminId) return c.json({ error: 'Admin access required' }, 401);

    const userId = c.req.param('userId');
    const { approved } = await c.req.json();

    const profile = await verifyTeacherAccount(userId, approved);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// Class Management Endpoints

teacherRoutes.post('/classes', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const data = await c.req.json();
    const teacherClass = await createClass(userId, data);

    return c.json({ success: true, class: teacherClass });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.get('/classes', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classes = await getTeacherClasses(userId);

    return c.json({ classes });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.get('/classes/:classId', async (c) => {
  try {
    const classId = c.req.param('classId');
    const userId = c.req.header('X-User-Id');

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    // Verify ownership
    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    return c.json({ class: teacherClass });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.put('/classes/:classId', async (c) => {
  try {
    const classId = c.req.param('classId');
    const userId = c.req.header('X-User-Id');

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const data = await c.req.json();
    const updated = await updateClass(classId, data);

    return c.json({ success: true, class: updated });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.delete('/classes/:classId', async (c) => {
  try {
    const classId = c.req.param('classId');
    const userId = c.req.header('X-User-Id');

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await deleteClass(classId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// Student Enrollment

teacherRoutes.post('/classes/:classId/invite-code', async (c) => {
  try {
    const classId = c.req.param('classId');
    const userId = c.req.header('X-User-Id');

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    return c.json({ inviteCode: teacherClass.inviteCode });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.post('/enroll-by-code', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { inviteCode } = await c.req.json();
    await enrollStudentByCode(userId, inviteCode);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.post('/classes/:classId/add-student', async (c) => {
  try {
    const classId = c.req.param('classId');
    const userId = c.req.header('X-User-Id');
    const { studentId } = await c.req.json();

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updated = await addStudentToClass(classId, studentId);

    return c.json({ success: true, class: updated });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.delete('/classes/:classId/students/:studentId', async (c) => {
  try {
    const classId = c.req.param('classId');
    const studentId = c.req.param('studentId');
    const userId = c.req.header('X-User-Id');

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updated = await removeStudentFromClass(classId, studentId);

    return c.json({ success: true, class: updated });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherRoutes.get('/classes/:classId/members', async (c) => {
  try {
    const classId = c.req.param('classId');
    const userId = c.req.header('X-User-Id');

    const teacherClass = await getClass(classId);
    if (!teacherClass) return c.json({ error: 'Class not found' }, 404);

    if (teacherClass.teacherId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const members = await getClassMembers(classId);

    return c.json({ members });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// Student endpoints

teacherRoutes.get('/my-classes', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classes = await getStudentClasses(userId);

    return c.json({ classes });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
