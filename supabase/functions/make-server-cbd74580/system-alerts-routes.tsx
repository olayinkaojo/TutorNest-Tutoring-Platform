import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

export const systemAlertsRoutes = (app: Hono, getUserId: Function) => {

  // Get all system alerts (admin only)
  app.get('/make-server-cbd74580/admin/system-alerts', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // TODO: Verify admin role in production
      const user = await kv.get(`user:${userId}`) as any;
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const allAlerts = await kv.getByPrefix('system-alert:');
      const sortedAlerts = allAlerts.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return c.json({ alerts: sortedAlerts });
    } catch (error: any) {
      console.error('Error fetching system alerts:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get daily digest
  app.get('/make-server-cbd74580/admin/daily-digest', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allAlerts = await kv.getByPrefix('system-alert:');
      
      // Filter alerts for today
      const todayAlerts = allAlerts.filter((a: any) => {
        const alertDate = new Date(a.createdAt);
        alertDate.setHours(0, 0, 0, 0);
        return alertDate.getTime() === today.getTime();
      });

      const resolvedToday = allAlerts.filter((a: any) => {
        if (!a.resolvedAt) return false;
        const resolvedDate = new Date(a.resolvedAt);
        resolvedDate.setHours(0, 0, 0, 0);
        return resolvedDate.getTime() === today.getTime();
      });

      const digest = {
        date: today.toISOString(),
        totalAlerts: allAlerts.length,
        newAlerts: todayAlerts.length,
        resolvedAlerts: resolvedToday.length,
        criticalAlerts: allAlerts.filter((a: any) => a.severity === 'critical' && a.status !== 'resolved').length,
        paymentFailures: allAlerts.filter((a: any) => a.type === 'payment_failure' && a.status !== 'resolved').length,
        complianceExpiries: allAlerts.filter((a: any) => 
          (a.type === 'compliance_expiry' || a.type === 'dbs_expiry') && a.status !== 'resolved'
        ).length,
        abuseReports: allAlerts.filter((a: any) => a.type === 'abuse_report' && a.status !== 'resolved').length,
      };

      return c.json({ digest });
    } catch (error: any) {
      console.error('Error generating daily digest:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update alert status
  app.put('/make-server-cbd74580/admin/system-alerts/:alertId/status', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const user = await kv.get(`user:${userId}`) as any;
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const alertId = c.req.param('alertId');
      const { status, notes } = await c.req.json();

      const alert = await kv.get(alertId) as any;
      if (!alert) {
        return c.json({ error: 'Alert not found' }, 404);
      }

      const previousStatus = alert.status;
      alert.status = status;
      alert.updatedAt = new Date().toISOString();

      if (status === 'resolved') {
        alert.resolvedAt = new Date().toISOString();
      }

      // Add to audit trail
      const auditEntry = {
        id: `audit:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        action: `Status changed from ${previousStatus} to ${status}`,
        performedBy: userId,
        performedByName: user.name || user.email,
        timestamp: new Date().toISOString(),
        notes: notes || '',
      };

      alert.auditTrail = alert.auditTrail || [];
      alert.auditTrail.push(auditEntry);

      await kv.set(alertId, alert);

      return c.json({ success: true, alert });
    } catch (error: any) {
      console.error('Error updating alert status:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Create system alert (called by other services)
  app.post('/make-server-cbd74580/admin/system-alerts', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const alertData = await c.req.json();
      
      const alert = {
        id: `system-alert:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        relatedUserId: alertData.relatedUserId,
        relatedUserName: alertData.relatedUserName,
        relatedEntityId: alertData.relatedEntityId,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditTrail: [],
      };

      await kv.set(alert.id, alert);

      // Send real-time notification for critical/high severity alerts
      if (alert.severity === 'critical' || alert.severity === 'high') {
        // TODO: Send real-time alert via WebSocket, email, or SMS
        console.log(`HIGH PRIORITY ALERT: ${alert.title}`);
      }

      return c.json({ alert });
    } catch (error: any) {
      console.error('Error creating system alert:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Scheduled job to check for compliance expiries
  app.post('/make-server-cbd74580/admin/check-compliance', async (c) => {
    try {
      // This would be called by a scheduled job
      const allTutors = await kv.getByPrefix('user:');
      const tutors = allTutors.filter((user: any) => user.role === 'tutor');
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let alertsCreated = 0;

      for (const tutor of tutors) {
        const tutorId = tutor.userId || tutor.id; // Handle both field names
        
        // Check DBS expiry
        if (tutor.dbsCheckExpiry) {
          const expiryDate = new Date(tutor.dbsCheckExpiry);
          
          if (expiryDate <= now) {
            // DBS has expired
            await kv.set(`system-alert:dbs-expired-${tutorId}`, {
              id: `system-alert:dbs-expired-${tutorId}`,
              type: 'dbs_expiry',
              severity: 'critical',
              title: 'DBS Check Expired',
              description: `DBS check for ${tutor.firstName} ${tutor.lastName} has expired`,
              relatedUserId: tutorId,
              relatedUserName: `${tutor.firstName} ${tutor.lastName}`,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            // DBS expiring soon
            await kv.set(`system-alert:dbs-expiring-${tutorId}`, {
              id: `system-alert:dbs-expiring-${tutorId}`,
              type: 'dbs_expiry',
              severity: 'high',
              title: 'DBS Check Expiring Soon',
              description: `DBS check for ${tutor.firstName} ${tutor.lastName} expires on ${expiryDate.toLocaleDateString()}`,
              relatedUserId: tutorId,
              relatedUserName: `${tutor.firstName} ${tutor.lastName}`,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          }
        }

        // Check profile completeness
        if (tutor.verificationStatus === 'verified') {
          const requiredFields = ['firstName', 'lastName', 'subjects', 'hourlyRate', 'dbsCheckExpiry'];
          const missingFields = requiredFields.filter(field => !tutor[field]);
          
          if (missingFields.length > 0) {
            await kv.set(`system-alert:incomplete-profile-${tutorId}`, {
              id: `system-alert:incomplete-profile-${tutorId}`,
              type: 'compliance_expiry',
              severity: 'medium',
              title: 'Incomplete Tutor Profile',
              description: `Tutor ${tutor.firstName} ${tutor.lastName} is missing: ${missingFields.join(', ')}`,
              relatedUserId: tutorId,
              relatedUserName: `${tutor.firstName} ${tutor.lastName}`,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          }
        }
      }

      return c.json({ alertsCreated });
    } catch (error: any) {
      console.error('Error checking compliance:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Scheduled job to check for payment failures
  app.post('/make-server-cbd74580/admin/check-payment-failures', async (c) => {
    try {
      // This would be called by a scheduled job
      const allPayments = await kv.getByPrefix('payment:');
      const failedPayments = allPayments.filter((p: any) => p.status === 'failed');

      let alertsCreated = 0;

      for (const payment of failedPayments) {
        // Check if alert already exists
        const existingAlert = await kv.get(`system-alert:payment-failure-${payment.id}`);
        if (existingAlert) continue;

        await kv.set(`system-alert:payment-failure-${payment.id}`, {
          id: `system-alert:payment-failure-${payment.id}`,
          type: 'payment_failure',
          severity: 'high',
          title: 'Payment Failure',
          description: `Payment of £${payment.amount} failed for booking ${payment.bookingId}. Reason: ${payment.failureReason || 'Unknown'}`,
          relatedUserId: payment.parentId,
          relatedEntityId: payment.id,
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          auditTrail: [],
        });
        alertsCreated++;
      }

      return c.json({ alertsCreated });
    } catch (error: any) {
      console.error('Error checking payment failures:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Scheduled job to check for overdue reports
  app.post('/make-server-cbd74580/admin/check-overdue-reports', async (c) => {
    try {
      const allBookings = await kv.getByPrefix('booking:');
      const completedBookings = allBookings.filter((b: any) => b.status === 'completed');
      const now = new Date();

      let alertsCreated = 0;

      for (const booking of completedBookings) {
        const sessionEnd = new Date(booking.date);
        sessionEnd.setHours(sessionEnd.getHours() + (booking.duration || 1));
        
        const hoursSinceSession = (now.getTime() - sessionEnd.getTime()) / (1000 * 60 * 60);

        // Check if report is overdue (48 hours)
        if (hoursSinceSession > 48) {
          const report = await kv.get(`report:${booking.id}`);
          
          if (!report) {
            // No report exists
            const existingAlert = await kv.get(`system-alert:report-overdue-${booking.id}`);
            if (existingAlert) continue;

            await kv.set(`system-alert:report-overdue-${booking.id}`, {
              id: `system-alert:report-overdue-${booking.id}`,
              type: 'report_overdue',
              severity: 'medium',
              title: 'Session Report Overdue',
              description: `Tutor ${booking.tutorName} has not submitted a report for session on ${new Date(booking.date).toLocaleDateString()}`,
              relatedUserId: booking.tutorId,
              relatedUserName: booking.tutorName,
              relatedEntityId: booking.id,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          }
        }
      }

      return c.json({ alertsCreated });
    } catch (error: any) {
      console.error('Error checking overdue reports:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};