# Email System - Implementation Hooks Guide

## Quick Reference: Where to Wire Each Email

This guide shows exactly where to add email sending calls in the backend routes.

---

## 🎯 HIGH PRIORITY: Do These First

### 1. Session Reminders (24h & 1h)

**File:** `supabase/functions/make-server-cbd74580/notifications-routes.tsx`

**Current State:** In-app notifications created (line 380-470)

**Location to Add Email:**

```typescript
// Lines 388-395: 24-hour reminder
if (!tutorPrefs || tutorPrefs.inApp.sessionReminder24h) {
  // Existing: Create in-app notification
  // ADD THIS:
  const emailResult = await sendEmail({
    to: tutorEmail,
    ...emailTemplates.sessionReminder(
      tutorName,
      studentName,
      formattedDate,
      formattedTime,
      meetLink
    )
  });
  if (!emailResult.success) console.warn("24h reminder email failed:", emailResult.error);
}

// Lines 431-440: 1-hour reminder (same pattern)
if (!tutorPrefs || tutorPrefs.inApp.sessionReminder1h) {
  // Existing: Create in-app notification
  // ADD THIS:
  const emailResult = await sendEmail({
    to: tutorEmail,
    ...emailTemplates.sessionReminder(
      tutorName,
      studentName,
      formattedDate,
      formattedTime,
      meetLink
    )
  });
}
```

---

### 2. Payment Failed Notification

**File:** `supabase/functions/make-server-cbd74580/payment-routes.tsx`

**Location:** After payment processing fails (around line 400-500)

**Add:**

```typescript
// After payment.error or charge failure
if (paymentFailed) {
  // Get parent email from KV
  const parentEmail = (await kv.get(`user:${parentId}`))?.email;
  
  if (parentEmail) {
    const retryLink = `${BASE_URL}/payments/retry?bookingId=${bookingId}`;
    const emailResult = await sendEmail({
      to: parentEmail,
      ...emailTemplates.paymentFailedNotification(
        parentName,
        amount,
        retryLink
      )
    });
    console.log("Payment failed email sent:", emailResult.success);
  }
}
```

---

### 3. Session Completion Prompt

**File:** Create new or add to `supabase/functions/make-server-cbd74580/session-routes.tsx`

**Trigger:** 5 minutes after `booking.endTime`

**Implementation:**

```typescript
// Run this as a scheduled function that triggers:
// - When current time >= booking.endTime + 5 minutes
// - AND session not yet reported

app.post('/sessions/send-completion-prompts', async (c) => {
  try {
    // Get all completed sessions without reports (last 24 hours)
    const completedSessions = await db.getUnreportedSessions();
    
    for (const session of completedSessions) {
      const tutor = await kv.get(`user:${session.tutorId}`);
      const tutorEmail = tutor?.email;
      
      if (tutorEmail && !session.completionEmailSent) {
        const dashboardLink = `${BASE_URL}/tutor/sessions/${session.id}`;
        
        await sendEmail({
          to: tutorEmail,
          ...emailTemplates.sessionCompletionPrompt(
            tutor.firstName,
            session.studentName,
            formatDate(session.endTime),
            dashboardLink
          )
        });
        
        // Mark email as sent
        await db.updateSession(session.id, { completionEmailSent: true });
      }
    }
    
    return c.json({ sent: completedSessions.length });
  } catch (error) {
    console.error("Error sending completion prompts:", error);
    return c.json({ error: error.message }, 500);
  }
});
```

---

### 4. Review Request Emails

**File:** `supabase/functions/make-server-cbd74580/booking-routes.tsx` or new `review-routes.tsx`

**Trigger:** 48 hours after session completion

**Implementation:**

```typescript
// Add to notifications-routes or create scheduled job

async function sendReviewRequests() {
  try {
    // Get sessions completed 48 hours ago
    const sessions = await db.getSessionsForReview(); // Sessions from 48h ago
    
    for (const session of sessions) {
      // Parent review request
      const parentEmail = (await kv.get(`user:${session.parentId}`))?.email;
      if (parentEmail && !session.parentReviewEmailSent) {
        const reviewLink = `${BASE_URL}/reviews/write?bookingId=${session.id}&type=parent`;
        
        await sendEmail({
          to: parentEmail,
          ...emailTemplates.parentReviewRequest(
            parentName,
            session.studentName,
            session.tutorName,
            reviewLink
          )
        });
        
        await db.updateSession(session.id, { parentReviewEmailSent: true });
      }
      
      // Student review request
      if (session.studentId) {
        const studentEmail = (await kv.get(`user:${session.studentId}`))?.email;
        if (studentEmail && !session.studentReviewEmailSent) {
          const reviewLink = `${BASE_URL}/reviews/write?bookingId=${session.id}&type=student`;
          
          await sendEmail({
            to: studentEmail,
            ...emailTemplates.tutorReviewRequest(
              session.studentName,
              session.tutorName,
              reviewLink
            )
          });
          
          await db.updateSession(session.id, { studentReviewEmailSent: true });
        }
      }
    }
  } catch (error) {
    console.error("Error sending review requests:", error);
  }
}
```

---

## 📋 MEDIUM PRIORITY: Do These Next

### 5. Booking Cancellation Emails

**File:** `supabase/functions/make-server-cbd74580/booking-routes.tsx`

**Location:** DELETE `/bookings/:id` endpoint (after successful deletion)

**Add:**

```typescript
app.delete('/bookings/:id', async (c) => {
  try {
    const bookingId = c.req.param('id');
    const booking = await db.getBooking(bookingId);
    
    // ... existing deletion logic ...
    
    // Send cancellation emails
    
    // Parent notification
    const parentEmail = (await kv.get(`user:${booking.parentId}`))?.email;
    if (parentEmail) {
      const refundAmount = await calculateRefund(booking);
      
      await sendEmail({
        to: parentEmail,
        ...emailTemplates.bookingCancelledParent(
          parentName,
          booking.studentName,
          booking.tutorName,
          refundAmount,
          formatDate(booking.startTime),
          formatTime(booking.startTime)
        )
      });
    }
    
    // Tutor notification
    const tutorEmail = (await kv.get(`user:${booking.tutorId}`))?.email;
    if (tutorEmail) {
      const cancellationReason = c.req.query('reason') || 'User requested cancellation';
      
      await sendEmail({
        to: tutorEmail,
        ...emailTemplates.bookingCancelledTutor(
          tutorName,
          booking.studentName,
          parentName,
          formatDate(booking.startTime),
          formatTime(booking.startTime),
          cancellationReason
        )
      });
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});
```

---

### 6. Document Sharing Notification

**File:** `supabase/functions/make-server-cbd74580/documents-routes.tsx`

**Location:** After document upload with recipient (line ~150)

**Add:**

```typescript
// After successful file upload and sharing

if (doc.sharedWithId) {
  const recipient = await kv.get(`user:${doc.sharedWithId}`);
  const recipientEmail = recipient?.email;
  
  if (recipientEmail) {
    const uploader = await kv.get(`user:${uploadedByUserId}`);
    const documentLink = `${BASE_URL}/documents/${doc.id}`;
    
    await sendEmail({
      to: recipientEmail,
      ...emailTemplates.documentSharedNotification(
        recipient.firstName,
        uploader.firstName,
        doc.fileName,
        documentLink
      )
    });
  }
}
```

---

### 7. Weekly Earnings Summary (Tutors)

**File:** Create scheduled cron job

**Location:** New file: `supabase/functions/make-server-cbd74580/scheduled-emails.tsx`

**Implementation:**

```typescript
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

const app = new Hono();

// Triggered by Vercel Cron (every Sunday 9 AM UTC)
app.post('/scheduled/weekly-earnings', async (c) => {
  try {
    // Get all tutors with earnings in past 7 days
    const tutorsWithEarnings = await db.getTutorsWithWeeklyEarnings();
    
    for (const tutor of tutorsWithEarnings) {
      const tutorData = await kv.get(`user:${tutor.id}`);
      
      if (tutorData?.email) {
        const emailResult = await sendEmail({
          to: tutorData.email,
          ...emailTemplates.weeklyEarningsSummary(
            tutorData.firstName,
            tutor.totalEarnings,
            tutor.sessionsCompleted,
            tutor.averageRating || '5.0',
            `${BASE_URL}/tutor/earnings/withdraw`
          )
        });
        
        console.log(`Weekly earnings email to ${tutor.id}:`, emailResult.success);
      }
    }
    
    return c.json({ emailsSent: tutorsWithEarnings.length });
  } catch (error) {
    console.error("Error sending weekly earnings emails:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Triggered by Vercel Cron (every Friday 6 PM local time)
app.post('/scheduled/student-performance', async (c) => {
  try {
    const parents = await db.getAllParentsWithActiveBookings();
    
    for (const parent of parents) {
      const parentData = await kv.get(`user:${parent.id}`);
      
      for (const child of parent.children) {
        // Get child's session data
        const sessions = await db.getSessionsForStudent(child.id, { days: 7 });
        const reports = await db.getSessionReports(sessions.map(s => s.id));
        
        const totalHours = sessions.length; // Assuming 1 hour sessions
        const topicsLearned = extractTopics(reports);
        const progressScore = calculateProgress(reports);
        
        const emailResult = await sendEmail({
          to: parentData.email,
          ...emailTemplates.studentPerformanceSummary(
            parentData.firstName,
            child.firstName,
            sessions[0]?.tutorName || 'Your Tutor',
            totalHours,
            topicsLearned,
            progressScore,
            `${BASE_URL}/parent/child/${child.id}/reports`
          )
        });
        
        console.log(`Performance email to ${parent.id}:`, emailResult.success);
      }
    }
    
    return c.json({ emailsSent: parents.length });
  } catch (error) {
    console.error("Error sending performance summaries:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
```

**Add to vercel.json:**
```json
{
  "functions": {
    "supabase/functions/make-server-cbd74580/scheduled-emails.tsx": {
      "memory": 256,
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/scheduled/weekly-earnings",
      "schedule": "0 9 * * 0"
    },
    {
      "path": "/api/scheduled/student-performance", 
      "schedule": "0 18 * * 5"
    }
  ]
}
```

---

### 8. Badge/Achievement Notifications

**File:** `supabase/functions/make-server-cbd74580/achievement-service.tsx`

**Location:** After badge awarded (line 83)

**Add:**

```typescript
// After: const added = await addBadgeToUser(userId, badgeId);

if (added) {
  const user = await kv.get(`user:${userId}`);
  const badge = BADGES_BY_ID[badgeId];
  
  if (user?.email && badge) {
    const emailResult = await sendEmail({
      to: user.email,
      ...emailTemplates.badgeEarned(
        user.firstName,
        badge.name,
        badge.description,
        badge.icon,
        `${BASE_URL}/achievements/badges`
      )
    });
    
    console.log(`Badge email for ${userId}:`, emailResult.success);
  }
}
```

---

## 🟢 LOW PRIORITY: Polish Features

### 9. Inactive Account Reminder

**Trigger:** Every 2 weeks for users inactive 30+ days

```typescript
app.post('/scheduled/inactive-reminders', async (c) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const inactiveUsers = await db.getInactiveUsers(thirtyDaysAgo);
  
  for (const user of inactiveUsers) {
    const daysSinceLogin = Math.floor((Date.now() - user.lastLogin) / (24 * 60 * 60 * 1000));
    
    const emailResult = await sendEmail({
      to: user.email,
      ...emailTemplates.inactiveAccountReminder(
        user.firstName,
        daysSinceLogin,
        `${BASE_URL}/app`
      )
    });
  }
});
```

---

### 10. Account Deletion Confirmation

**File:** `supabase/functions/make-server-cbd74580/user-routes.tsx`

**Location:** DELETE `/users/:id` endpoint

```typescript
// After successful deletion
await sendEmail({
  to: userEmail,
  ...emailTemplates.accountDeletionConfirmed(userName)
});
```

---

## ✅ Testing the Implementations

### Test Checklist

- [ ] Send session reminder 24h before test booking
- [ ] Verify email includes meet link and times
- [ ] Test payment failure flow
- [ ] Verify refund notification sent
- [ ] Cancel a booking and check both emails
- [ ] Share a document and verify notification
- [ ] Trigger badge award and check email
- [ ] Test inactive account email
- [ ] Verify all links work in emails
- [ ] Check emails on mobile
- [ ] Verify no duplicate emails sent

---

## 🔗 Environment Setup

Before testing, ensure these are set in Vercel:

```
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@tutornest.org
BASE_URL=https://tutornest.org
```

---

## 📊 Monitoring

After implementing, add logging to track:

1. Email send success rate per type
2. Email open rates (via Resend webhooks)
3. Failed email attempts with reasons
4. Duplicate email detection
5. Email delivery time (send → delivered)

---

**Status:** 🟢 Implementation Guide Ready
**Last Updated:** May 2026
