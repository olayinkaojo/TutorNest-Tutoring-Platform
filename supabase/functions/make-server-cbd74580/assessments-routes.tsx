import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { verifyAccessToken } from './route-auth.tsx';

const assessmentsRoutes = new Hono();

// Helper to get user ID from access token
const getUserIdFromToken = async (accessToken: string | null): Promise<string | null> => {
  return verifyAccessToken(accessToken);
};

// Submit a new assessment
assessmentsRoutes.post('/submit', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized', message: 'Invalid or missing access token' }, 401);
    }

    const body = await c.req.json();
    const {
      bookingId,
      studentId,
      tutorId,
      subject,
      sessionDate,
      scores,
      overallScore,
      grade,
      topicsCovered,
      strengths,
      areasForImprovement,
      comments,
      homeworkAssigned,
      nextSessionGoals,
      submittedAt
    } = body;

    // Validate required fields
    if (!bookingId || !studentId || !tutorId || !subject || !scores || !topicsCovered) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify the requesting user is the tutor
    if (userId !== tutorId) {
      return c.json({ error: 'Unauthorized: Only the tutor can submit assessments' }, 403);
    }

    // Generate assessment ID
    const assessmentId = crypto.randomUUID();

    // Create assessment record
    const assessment = {
      id: assessmentId,
      bookingId,
      studentId,
      tutorId,
      subject,
      sessionDate,
      scores: {
        understanding: scores.understanding || 0,
        participation: scores.participation || 0,
        homeworkCompletion: scores.homeworkCompletion || 0,
        attentiveness: scores.attentiveness || 0,
        improvement: scores.improvement || 0
      },
      overallScore: overallScore || 0,
      grade: grade || 'N/A',
      topicsCovered,
      strengths: strengths || '',
      areasForImprovement: areasForImprovement || '',
      comments: comments || '',
      homeworkAssigned: homeworkAssigned || '',
      nextSessionGoals: nextSessionGoals || '',
      submittedAt: submittedAt || new Date().toISOString()
    };

    // Store assessment
    await kv.set(`assessment:${assessmentId}`, assessment);

    // Add to student's assessments list
    const studentAssessmentsKey = `student_assessments:${studentId}`;
    const existingAssessments = (await kv.get(studentAssessmentsKey)) || [];
    if (Array.isArray(existingAssessments)) {
      existingAssessments.push(assessmentId);
      await kv.set(studentAssessmentsKey, existingAssessments);
    } else {
      await kv.set(studentAssessmentsKey, [assessmentId]);
    }

    // Add to tutor's assessments list
    const tutorAssessmentsKey = `tutor_assessments:${tutorId}`;
    const tutorExistingAssessments = (await kv.get(tutorAssessmentsKey)) || [];
    if (Array.isArray(tutorExistingAssessments)) {
      tutorExistingAssessments.push(assessmentId);
      await kv.set(tutorAssessmentsKey, tutorExistingAssessments);
    } else {
      await kv.set(tutorAssessmentsKey, [assessmentId]);
    }

    // Update booking with assessment reference
    const booking = await kv.get(`booking:${bookingId}`);
    if (booking) {
      booking.assessmentId = assessmentId;
      booking.assessed = true;
      await kv.set(`booking:${bookingId}`, booking);
    }

    console.log(`Assessment submitted successfully: ${assessmentId} for student ${studentId}`);

    return c.json({
      success: true,
      assessmentId,
      assessment
    });
  } catch (error: any) {
    console.error('Error submitting assessment:', error);
    return c.json({ error: error.message || 'Failed to submit assessment' }, 500);
  }
});

// Get assessments for a student
assessmentsRoutes.get('/student/:studentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('GET /student/:studentId - Access token present:', !!accessToken);
    
    const userId = await getUserIdFromToken(accessToken);
    
    if (!userId) {
      console.error('GET /student/:studentId - Failed to get userId from token');
      return c.json({ error: 'Unauthorized', message: 'Invalid or missing access token' }, 401);
    }

    const studentIdParam = c.req.param('studentId');
    console.log('GET /student/:studentId - Requested student ID:', studentIdParam, 'User ID:', userId);

    // Try to get student by child ID first
    let student = await kv.get(`child:${studentIdParam}`);
    let actualChildId = studentIdParam;
    let isChildAccount = !!student;
    
    // If not found, try to find child by studentUserId (when student logs in themselves)
    if (!student) {
      // Search for child with this studentUserId
      const allChildrenKeys = await kv.getByPrefix('child:');
      const foundChild = allChildrenKeys.find((child: any) => child.studentUserId === studentIdParam);
      
      if (foundChild) {
        student = foundChild;
        actualChildId = foundChild.id;
        isChildAccount = true;
      }
    }
    
    // If still not found, check if it's a standalone student user
    if (!student) {
      const userRecord = await kv.get(`user:${studentIdParam}`);
      if (userRecord && userRecord.role === 'student') {
        student = {
          id: userRecord.userId || userRecord.id,
          studentUserId: userRecord.userId || userRecord.id,
          parentId: null // No parent for standalone student
        };
        actualChildId = student.id;
        isChildAccount = false;
        console.log('GET /student/:studentId - Found standalone student user:', student.id);
      }
    }
    
    if (!student) {
      console.log('GET /student/:studentId - Student not found:', studentIdParam);
      return c.json({ error: 'Student not found' }, 404);
    }

    // Verify access (parent, the student themselves, or standalone student)
    const hasParentAccess = student.parentId && userId === student.parentId;
    const hasStudentAccess = userId === studentIdParam || userId === student.studentUserId || userId === actualChildId;
    
    console.log('GET /student/:studentId - Access check:', {
      hasParentAccess,
      hasStudentAccess,
      parentId: student.parentId,
      studentUserId: student.studentUserId,
      actualChildId,
      userId,
      isChildAccount
    });
    
    if (!hasParentAccess && !hasStudentAccess) {
      return c.json({ error: 'Unauthorized: You can only view assessments for your own children' }, 403);
    }

    // Get assessment IDs using the actual child ID
    const studentAssessmentsKey = `student_assessments:${actualChildId}`;
    const assessmentIds = (await kv.get(studentAssessmentsKey)) || [];

    if (!Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      console.log('GET /student/:studentId - No assessments found for:', actualChildId);
      return c.json({ assessments: [] });
    }

    // Get all assessments
    const assessments = [];
    for (const assessmentId of assessmentIds) {
      const assessment = await kv.get(`assessment:${assessmentId}`);
      if (assessment) {
        // Get tutor info
        const allUsers = await kv.getByPrefix('user:');
        const tutor = allUsers.find((u: any) => (u.userId || u.id) === assessment.tutorId);
        
        assessments.push({
          ...assessment,
          tutorName: tutor?.fullName || tutor?.name || 'Unknown Tutor'
        });
      }
    }

    // Sort by submission date (newest first)
    assessments.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    console.log(`GET /student/:studentId - Found ${assessments.length} assessments`);

    return c.json({ assessments });
  } catch (error: any) {
    console.error('Error fetching student assessments:', error);
    return c.json({ error: error.message || 'Failed to fetch assessments' }, 500);
  }
});

// Get assessment statistics for a student
assessmentsRoutes.get('/stats/student/:studentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('GET /stats/student/:studentId - Access token present:', !!accessToken);
    
    const userId = await getUserIdFromToken(accessToken);
    
    if (!userId) {
      console.error('GET /stats/student/:studentId - Failed to get userId from token');
      return c.json({ error: 'Unauthorized', message: 'Invalid or missing access token' }, 401);
    }

    const studentIdParam = c.req.param('studentId');

    // Try to get student by child ID first
    let student = await kv.get(`child:${studentIdParam}`);
    let actualChildId = studentIdParam;
    let isChildAccount = !!student;
    
    // If not found, try to find child by studentUserId
    if (!student) {
      const allChildrenKeys = await kv.getByPrefix('child:');
      const foundChild = allChildrenKeys.find((child: any) => child.studentUserId === studentIdParam);
      
      if (foundChild) {
        student = foundChild;
        actualChildId = foundChild.id;
        isChildAccount = true;
      }
    }
    
    // If still not found, check if it's a standalone student user
    if (!student) {
      const userRecord = await kv.get(`user:${studentIdParam}`);
      if (userRecord && userRecord.role === 'student') {
        student = {
          id: userRecord.userId || userRecord.id,
          studentUserId: userRecord.userId || userRecord.id,
          parentId: null // No parent for standalone student
        };
        actualChildId = student.id;
        isChildAccount = false;
        console.log('GET /stats/student/:studentId - Found standalone student user:', student.id);
      }
    }
    
    if (!student) {
      console.log('GET /stats/student/:studentId - Student not found:', studentIdParam);
      return c.json({ error: 'Student not found' }, 404);
    }

    // Verify access (parent, the student themselves, or standalone student)
    const hasParentAccess = student.parentId && userId === student.parentId;
    const hasStudentAccess = userId === studentIdParam || userId === student.studentUserId || userId === actualChildId;
    
    console.log('GET /stats/student/:studentId - Access check:', {
      hasParentAccess,
      hasStudentAccess,
      parentId: student.parentId,
      studentUserId: student.studentUserId,
      actualChildId,
      userId,
      isChildAccount
    });
    
    if (!hasParentAccess && !hasStudentAccess) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get assessments
    const studentAssessmentsKey = `student_assessments:${actualChildId}`;
    const assessmentIds = (await kv.get(studentAssessmentsKey)) || [];

    if (!Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      return c.json({ 
        stats: {
          totalAssessments: 0,
          averageScore: 0,
          subjectBreakdown: {},
          recentTrend: 'neutral'
        }
      });
    }

    // Calculate statistics
    const assessments = [];
    for (const assessmentId of assessmentIds) {
      const assessment = await kv.get(`assessment:${assessmentId}`);
      if (assessment) {
        assessments.push(assessment);
      }
    }

    const totalAssessments = assessments.length;
    const totalScore = assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0);
    const averageScore = totalAssessments > 0 ? totalScore / totalAssessments : 0;

    // Subject breakdown
    const subjectBreakdown: any = {};
    assessments.forEach(assessment => {
      const subject = assessment.subject;
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = {
          count: 0,
          totalScore: 0,
          averageScore: 0
        };
      }
      subjectBreakdown[subject].count++;
      subjectBreakdown[subject].totalScore += assessment.overallScore || 0;
    });

    // Calculate averages for each subject
    Object.keys(subjectBreakdown).forEach(subject => {
      const data = subjectBreakdown[subject];
      data.averageScore = data.totalScore / data.count;
    });

    // Calculate category averages (understanding, participation, etc.)
    const categoryAverages: any = {
      understanding: 0,
      participation: 0,
      homeworkCompletion: 0,
      attentiveness: 0,
      improvement: 0
    };
    
    if (totalAssessments > 0) {
      assessments.forEach(assessment => {
        Object.keys(categoryAverages).forEach(category => {
          categoryAverages[category] += (assessment.scores?.[category] || 0);
        });
      });
      
      Object.keys(categoryAverages).forEach(category => {
        categoryAverages[category] = categoryAverages[category] / totalAssessments;
      });
    }

    // Calculate subject performance (overall scores by subject)
    const subjectPerformance: any = {};
    Object.keys(subjectBreakdown).forEach(subject => {
      subjectPerformance[subject] = Math.round(subjectBreakdown[subject].averageScore);
    });

    // Calculate recent trend (last 3 vs previous 3)
    let recentTrend = 'neutral';
    if (assessments.length >= 6) {
      const sorted = [...assessments].sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      const recent3 = sorted.slice(0, 3);
      const previous3 = sorted.slice(3, 6);
      
      const recentAvg = recent3.reduce((sum, a) => sum + (a.overallScore || 0), 0) / 3;
      const previousAvg = previous3.reduce((sum, a) => sum + (a.overallScore || 0), 0) / 3;
      
      if (recentAvg > previousAvg + 5) recentTrend = 'improving';
      else if (recentAvg < previousAvg - 5) recentTrend = 'declining';
    }

    const stats = {
      totalAssessments,
      averageScore: Math.round(averageScore * 10) / 10,
      subjectBreakdown,
      categoryAverages,
      subjectPerformance,
      recentTrend
    };

    console.log(`GET /stats/student/:studentId - Calculated stats for ${totalAssessments} assessments`);

    return c.json({ stats });
  } catch (error: any) {
    console.error('Error fetching assessment stats:', error);
    return c.json({ error: error.message || 'Failed to fetch stats' }, 500);
  }
});

// Get assessments for a tutor
assessmentsRoutes.get('/tutor/:tutorId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized', message: 'Invalid or missing access token' }, 401);
    }

    const tutorIdParam = c.req.param('tutorId');

    // Verify the requesting user is the tutor
    if (userId !== tutorIdParam) {
      return c.json({ error: 'Unauthorized: You can only view your own assessments' }, 403);
    }

    // Get tutor's assessments
    const tutorAssessmentsKey = `tutor_assessments:${tutorIdParam}`;
    const assessmentIds = (await kv.get(tutorAssessmentsKey)) || [];

    if (!Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      return c.json({ assessments: [] });
    }

    // Get all assessments
    const assessments = [];
    for (const assessmentId of assessmentIds) {
      const assessment = await kv.get(`assessment:${assessmentId}`);
      if (assessment) {
        // Get student info
        const student = await kv.get(`child:${assessment.studentId}`);
        
        assessments.push({
          ...assessment,
          studentName: student?.name || 'Unknown Student'
        });
      }
    }

    // Sort by submission date (newest first)
    assessments.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return c.json({ assessments });
  } catch (error: any) {
    console.error('Error fetching tutor assessments:', error);
    return c.json({ error: error.message || 'Failed to fetch assessments' }, 500);
  }
});

export default assessmentsRoutes;