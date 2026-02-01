import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Helper to get user ID from token
const getUserId = async (accessToken: string | null): Promise<string | null> => {
  if (!accessToken) {
    console.log('No access token provided');
    return null;
  }
  
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const userId = payload.sub;
    
    if (!userId) {
      console.error('No user ID found in token payload');
      return null;
    }
    
    return userId;
  } catch (err) {
    console.error('Exception in getUserId:', err);
    return null;
  }
};

// Get all session reports for a tutor
app.get('/:tutorId', async (c) => {
  console.log('=== GET /tutor-session-reports/:tutorId called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tutorId = c.req.param('tutorId');
    
    // Verify the user is requesting their own reports
    if (userId !== tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get all reports for this tutor
    const allReports = await kv.getByPrefix(`session_report_${tutorId}_`);
    
    // Sort by date (most recent first)
    const reports = (allReports || []).sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    console.log(`Retrieved ${reports.length} session reports for tutor ${tutorId}`);

    return c.json({ 
      success: true,
      reports 
    });
  } catch (error) {
    console.error('Error fetching session reports:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create a new session report
app.post('/', async (c) => {
  console.log('=== POST /tutor-session-reports called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { 
      tutorId,
      sessionId,
      studentId,
      studentName,
      subject,
      date,
      duration,
      topicsCovered,
      studentPerformance,
      strengths,
      areasForImprovement,
      homeworkAssigned,
      nextSessionPlan,
      behaviorNotes,
      overallRating,
      progressStatus,
      attendance,
      engagement,
      comprehension,
      participation
    } = body;

    // Verify the user is creating their own report
    if (userId !== tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Validate required fields
    if (!studentName || !subject || !date || !topicsCovered || !studentPerformance) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate unique report ID
    const reportId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report = {
      id: reportId,
      tutorId,
      sessionId: sessionId || null,
      studentId: studentId || null,
      studentName,
      subject,
      date,
      duration: duration || 60,
      topicsCovered,
      studentPerformance,
      strengths: strengths || '',
      areasForImprovement: areasForImprovement || '',
      homeworkAssigned: homeworkAssigned || '',
      nextSessionPlan: nextSessionPlan || '',
      behaviorNotes: behaviorNotes || '',
      overallRating: overallRating || 3,
      progressStatus: progressStatus || 'satisfactory',
      attendance: attendance || 'present',
      engagement: engagement || 3,
      comprehension: comprehension || 3,
      participation: participation || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to KV store
    await kv.set(`session_report_${tutorId}_${reportId}`, report);

    console.log(`Created session report ${reportId} for tutor ${tutorId}`);

    return c.json({ 
      success: true,
      report,
      message: 'Session report created successfully' 
    });
  } catch (error) {
    console.error('Error creating session report:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update a session report
app.put('/:reportId', async (c) => {
  console.log('=== PUT /tutor-session-reports/:reportId called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const body = await c.req.json();
    const { tutorId } = body;

    // Verify the user is updating their own report
    if (userId !== tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get existing report
    const existingReport = await kv.get(`session_report_${tutorId}_${reportId}`);
    
    if (!existingReport) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // Update report
    const updatedReport = {
      ...existingReport,
      ...body,
      id: reportId,
      tutorId,
      createdAt: (existingReport as any).createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Save updated report
    await kv.set(`session_report_${tutorId}_${reportId}`, updatedReport);

    console.log(`Updated session report ${reportId} for tutor ${tutorId}`);

    return c.json({ 
      success: true,
      report: updatedReport,
      message: 'Session report updated successfully' 
    });
  } catch (error) {
    console.error('Error updating session report:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete a session report
app.delete('/:reportId', async (c) => {
  console.log('=== DELETE /tutor-session-reports/:reportId called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const tutorId = c.req.query('tutorId');

    if (!tutorId) {
      return c.json({ error: 'Missing tutorId parameter' }, 400);
    }

    // Verify the user is deleting their own report
    if (userId !== tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get existing report to verify it exists
    const existingReport = await kv.get(`session_report_${tutorId}_${reportId}`);
    
    if (!existingReport) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // Delete report
    await kv.del(`session_report_${tutorId}_${reportId}`);

    console.log(`Deleted session report ${reportId} for tutor ${tutorId}`);

    return c.json({ 
      success: true,
      message: 'Session report deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting session report:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get completed sessions for a tutor (to populate the session selector)
app.get('/:tutorId/completed-sessions', async (c) => {
  console.log('=== GET /tutors/:tutorId/completed-sessions called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tutorId = c.req.param('tutorId');
    
    // Verify the user is requesting their own sessions
    if (userId !== tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get all bookings for this tutor
    const allBookings = await kv.getByPrefix('booking_');
    
    // Filter for completed bookings by this tutor
    const completedSessions = (allBookings || [])
      .filter((booking: any) => 
        booking.tutorId === tutorId && 
        booking.status === 'completed'
      )
      .sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 50); // Limit to last 50 sessions

    console.log(`Retrieved ${completedSessions.length} completed sessions for tutor ${tutorId}`);

    return c.json({ 
      success: true,
      sessions: completedSessions 
    });
  } catch (error) {
    console.error('Error fetching completed sessions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all reports for a specific student
app.get('/by-student/:studentId', async (c) => {
  console.log('=== GET /tutor-session-reports/by-student/:studentId called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const studentId = c.req.param('studentId');
    
    console.log('Student reports - userId:', userId, 'studentId:', studentId);
    
    // Verify the user is requesting their own reports
    // Allow both direct match and profile-based ID match
    if (userId !== studentId) {
      const userProfile = await kv.get(`user:${userId}`);
      const profileMatch = userProfile && (
        (userProfile as any).id === studentId || 
        (userProfile as any).userId === studentId
      );
      
      if (!profileMatch) {
        console.log('Authorization failed for student reports');
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    // Get all reports and filter by studentId
    const allReports = await kv.getByPrefix('session_report_');
    const studentReports = (allReports || [])
      .filter((report: any) => report.studentId === studentId)
      .sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

    // Fetch tutor names for each report
    const reportsWithTutorNames = await Promise.all(
      studentReports.map(async (report: any) => {
        try {
          const tutorProfile = await kv.get(`profile_tutor_${report.tutorId}`);
          return {
            ...report,
            tutorName: (tutorProfile as any)?.full_name || (tutorProfile as any)?.firstName || 'Unknown Tutor'
          };
        } catch (error) {
          return { ...report, tutorName: 'Unknown Tutor' };
        }
      })
    );

    console.log(`Retrieved ${studentReports.length} reports for student ${studentId}`);

    return c.json({ 
      success: true,
      reports: reportsWithTutorNames 
    });
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all reports for children of a parent
app.get('/by-parent/:parentId', async (c) => {
  console.log('=== GET /tutor-session-reports/by-parent/:parentId called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const parentId = c.req.param('parentId');
    
    console.log('Parent reports - userId:', userId, 'parentId:', parentId);
    
    // Verify the user is requesting their own children's reports
    // Allow both direct match and profile-based ID match
    if (userId !== parentId) {
      const userProfile = await kv.get(`user:${userId}`);
      const profileMatch = userProfile && (
        (userProfile as any).id === parentId || 
        (userProfile as any).userId === parentId
      );
      
      if (!profileMatch) {
        console.log('Authorization failed for parent reports');
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    const specificStudentId = c.req.query('studentId');

    // Get parent's children - try both parentId and userId as keys
    let children = await kv.get(`parent_children:${parentId}`) as any[] || [];
    
    if (!Array.isArray(children) || children.length === 0) {
      children = await kv.get(`parent_children:${userId}`) as any[] || [];
      console.log('Tried alternate key with userId for children');
    }
    
    // If children is an array of IDs, fetch the full child objects
    let childIds: string[] = [];
    if (Array.isArray(children)) {
      if (children.length > 0 && typeof children[0] === 'string') {
        // It's an array of IDs
        childIds = children;
      } else {
        // It's an array of objects
        childIds = children.map((child: any) => child.id || child);
      }
    }

    if (childIds.length === 0) {
      console.log('No children found for this parent');
      return c.json({ 
        success: true,
        reports: [] 
      });
    }

    console.log(`Found ${childIds.length} children for parent`);

    // Get all reports and filter by children
    const allReports = await kv.getByPrefix('session_report_');
    let parentReports = (allReports || [])
      .filter((report: any) => childIds.includes(report.studentId));

    // If specific student requested, filter further
    if (specificStudentId) {
      parentReports = parentReports.filter((report: any) => report.studentId === specificStudentId);
    }

    // Sort by date
    parentReports.sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Fetch tutor names for each report
    const reportsWithTutorNames = await Promise.all(
      parentReports.map(async (report: any) => {
        try {
          const tutorProfile = await kv.get(`profile_tutor_${report.tutorId}`);
          return {
            ...report,
            tutorName: (tutorProfile as any)?.full_name || (tutorProfile as any)?.firstName || 'Unknown Tutor'
          };
        } catch (error) {
          return { ...report, tutorName: 'Unknown Tutor' };
        }
      })
    );

    console.log(`Retrieved ${parentReports.length} reports for parent ${parentId}'s children`);

    return c.json({ 
      success: true,
      reports: reportsWithTutorNames 
    });
  } catch (error) {
    console.error('Error fetching parent reports:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all reports (admin only)
app.get('/all', async (c) => {
  console.log('=== GET /tutor-session-reports/all called ===');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile || (userProfile as any).role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    // Get all reports
    const allReports = await kv.getByPrefix('session_report_');
    
    // Sort by date
    const sortedReports = (allReports || []).sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Fetch tutor names for each report
    const reportsWithTutorNames = await Promise.all(
      sortedReports.map(async (report: any) => {
        try {
          const tutorProfile = await kv.get(`profile_tutor_${report.tutorId}`);
          return {
            ...report,
            tutorName: (tutorProfile as any)?.full_name || (tutorProfile as any)?.firstName || 'Unknown Tutor'
          };
        } catch (error) {
          return { ...report, tutorName: 'Unknown Tutor' };
        }
      })
    );

    console.log(`Retrieved ${sortedReports.length} total reports for admin`);

    return c.json({ 
      success: true,
      reports: reportsWithTutorNames 
    });
  } catch (error) {
    console.error('Error fetching all reports:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;