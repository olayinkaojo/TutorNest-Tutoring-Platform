import * as kv from './kv_store.tsx';

export interface TeacherProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  subjects: string[];
  qualifications: string;
  hourlyRate?: number;
  bio?: string;
  profileImage?: string;
  verified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  credentialUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherClass {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  level: string;
  schedule?: string;
  description?: string;
  maxStudents?: number;
  studentCount: number;
  inviteCode: string;
  isPublic: boolean;
  enrollmentOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createTeacherProfile(
  userId: string,
  data: {
    name: string;
    email: string;
    subjects: string[];
    qualifications: string;
    hourlyRate?: number;
    bio?: string;
  }
): Promise<TeacherProfile> {
  const profile: TeacherProfile = {
    id: `teacher_${userId}`,
    userId,
    name: data.name,
    email: data.email,
    subjects: data.subjects,
    qualifications: data.qualifications,
    hourlyRate: data.hourlyRate,
    bio: data.bio,
    verified: false,
    verificationStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`teacher:${userId}`, profile);
  return profile;
}

export async function getTeacherProfile(userId: string): Promise<TeacherProfile | null> {
  return await kv.get(`teacher:${userId}`);
}

export async function updateTeacherProfile(
  userId: string,
  data: Partial<TeacherProfile>
): Promise<TeacherProfile> {
  const existing = await getTeacherProfile(userId);
  if (!existing) throw new Error('Teacher profile not found');

  const updated: TeacherProfile = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`teacher:${userId}`, updated);
  return updated;
}

export async function uploadTeacherCredential(
  userId: string,
  credentialUrl: string
): Promise<TeacherProfile> {
  const profile = await getTeacherProfile(userId);
  if (!profile) throw new Error('Teacher profile not found');

  const updated = await updateTeacherProfile(userId, {
    credentialUrl,
    verificationStatus: 'pending',
  });

  return updated;
}

export async function verifyTeacherAccount(
  userId: string,
  approved: boolean
): Promise<TeacherProfile> {
  const profile = await getTeacherProfile(userId);
  if (!profile) throw new Error('Teacher profile not found');

  return await updateTeacherProfile(userId, {
    verified: approved,
    verificationStatus: approved ? 'approved' : 'rejected',
  });
}

export async function createClass(
  teacherId: string,
  data: {
    name: string;
    subject: string;
    level: string;
    schedule?: string;
    description?: string;
    maxStudents?: number;
    isPublic?: boolean;
    enrollmentOpen?: boolean;
  }
): Promise<TeacherClass> {
  const inviteCode = generateInviteCode();
  const classId = `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const teacherClass: TeacherClass = {
    id: classId,
    teacherId,
    name: data.name,
    subject: data.subject,
    level: data.level,
    schedule: data.schedule,
    description: data.description,
    maxStudents: data.maxStudents,
    studentCount: 0,
    inviteCode,
    isPublic: data.isPublic ?? false,
    enrollmentOpen: data.enrollmentOpen ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`class:${classId}`, teacherClass);
  await kv.set(`class:${classId}:invite-code`, inviteCode);
  await addClassToTeacher(teacherId, classId);

  return teacherClass;
}

export async function getClass(classId: string): Promise<TeacherClass | null> {
  return await kv.get(`class:${classId}`);
}

export async function updateClass(
  classId: string,
  data: Partial<TeacherClass>
): Promise<TeacherClass> {
  const existing = await getClass(classId);
  if (!existing) throw new Error('Class not found');

  const updated: TeacherClass = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`class:${classId}`, updated);
  return updated;
}

export async function deleteClass(classId: string): Promise<void> {
  const teacherClass = await getClass(classId);
  if (!teacherClass) throw new Error('Class not found');

  // Remove from teacher's class list
  await removeClassFromTeacher(teacherClass.teacherId, classId);

  // Delete class data
  await kv.delete(`class:${classId}`);
  await kv.delete(`class:${classId}:invite-code`);
  await kv.delete(`class:${classId}:members`);
}

export async function addClassToTeacher(teacherId: string, classId: string): Promise<void> {
  const key = `teacher:${teacherId}:classes`;
  const classes = (await kv.get(key)) || [];
  if (!classes.includes(classId)) {
    classes.push(classId);
    await kv.set(key, classes);
  }
}

export async function removeClassFromTeacher(teacherId: string, classId: string): Promise<void> {
  const key = `teacher:${teacherId}:classes`;
  const classes = (await kv.get(key)) || [];
  await kv.set(
    key,
    classes.filter((c: string) => c !== classId)
  );
}

export async function getTeacherClasses(teacherId: string): Promise<TeacherClass[]> {
  const classIds = (await kv.get(`teacher:${teacherId}:classes`)) || [];
  const classes: TeacherClass[] = [];

  for (const classId of classIds) {
    const teacherClass = await getClass(classId);
    if (teacherClass) {
      classes.push(teacherClass);
    }
  }

  return classes;
}

export async function addStudentToClass(
  classId: string,
  studentId: string
): Promise<TeacherClass> {
  const teacherClass = await getClass(classId);
  if (!teacherClass) throw new Error('Class not found');

  const members = (await kv.get(`class:${classId}:members`)) || [];
  if (!members.find((m: any) => m.userId === studentId)) {
    members.push({
      userId: studentId,
      role: 'student',
      joinedAt: new Date().toISOString(),
    });
    await kv.set(`class:${classId}:members`, members);

    // Update student count
    return await updateClass(classId, {
      studentCount: teacherClass.studentCount + 1,
    });
  }

  return teacherClass;
}

export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<TeacherClass> {
  const teacherClass = await getClass(classId);
  if (!teacherClass) throw new Error('Class not found');

  const members = (await kv.get(`class:${classId}:members`)) || [];
  const filtered = members.filter((m: any) => m.userId !== studentId);

  await kv.set(`class:${classId}:members`, filtered);

  // Update student count
  return await updateClass(classId, {
    studentCount: Math.max(0, teacherClass.studentCount - 1),
  });
}

export async function getClassMembers(classId: string): Promise<any[]> {
  return (await kv.get(`class:${classId}:members`)) || [];
}

export async function getClassByInviteCode(inviteCode: string): Promise<TeacherClass | null> {
  // Search through all classes to find matching invite code
  const allClasses = await kv.list({ prefix: ['class:'] });
  for await (const entry of allClasses) {
    const storedCode = await kv.get(entry.key);
    if (storedCode === inviteCode) {
      const classId = entry.key[0].toString();
      return await getClass(classId);
    }
  }
  return null;
}

export async function enrollStudentByCode(studentId: string, inviteCode: string): Promise<void> {
  // Find class with this invite code
  let classId: string | null = null;

  // Try direct lookup first
  const allEntries = await kv.list({ prefix: ['class:'] });
  for await (const entry of allEntries) {
    if (entry.key[1]?.toString() === 'invite-code') {
      const code = await kv.get(entry.key);
      if (code === inviteCode) {
        classId = entry.key[0].toString();
        break;
      }
    }
  }

  if (!classId) throw new Error('Invalid invite code');

  await addStudentToClass(classId, studentId);

  // Add to student's classes list
  const studentClassesKey = `student:${studentId}:classes`;
  const studentClasses = (await kv.get(studentClassesKey)) || [];
  if (!studentClasses.includes(classId)) {
    studentClasses.push(classId);
    await kv.set(studentClassesKey, studentClasses);
  }
}

export async function getStudentClasses(studentId: string): Promise<TeacherClass[]> {
  const classIds = (await kv.get(`student:${studentId}:classes`)) || [];
  const classes: TeacherClass[] = [];

  for (const classId of classIds) {
    const teacherClass = await getClass(classId);
    if (teacherClass) {
      classes.push(teacherClass);
    }
  }

  return classes;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
