# Session Reports Verification & Testing Plan

**Status:** Phase 1 Verification In Progress  
**Date:** April 19, 2026  
**Priority:** High - Session reports are critical to parent/tutor communication

---

## Current Architecture

### Frontend Components
- **SessionReportsViewer** - Main viewer (parent/admin/student view)
- **PostSessionReport** - Tutor report submission form
- **ViewSessionReport** - Parent report viewing interface
- **BookingManager** - Integration point for listing past sessions

### Backend Endpoints
1. `POST /bookings/:bookingId/report` - Submit/update report
2. `GET /bookings/:bookingId/report` - Get single report
3. `GET /bookings/:ids/reports` - **NEW** Batch fetch reports
4. `POST /bookings/:bookingId/rate-session` - Parent session rating
5. `GET /tutor-session-reports/:tutorId` - Get tutor's reports
6. `GET /tutor-session-reports/by-student/:studentId` - Get reports by student
7. `GET /tutor-session-reports/by-parent/:parentId` - Get reports by parent
8. `GET /tutor-session-reports/all` - Admin get all reports

### WebSocket Integration
- ✅ Implemented in `useWebSocket.ts` hook
- ✅ Events: `REPORT_SUBMITTED`, `REPORT_UPDATED`
- ✅ SessionReportsViewer has real-time handler
- ⏳ WebSocket server implementation pending

### Data Flow
```
Tutor creates session report
    ↓
POST /bookings/:id/report
    ↓
Backend stores in KV: session_report_{bookingId}
Backend creates notification for parent
    ↓
Parent receives notification
    ↓
GET /bookings/:ids/reports (batch fetch)
    ↓
Parent views report in SessionReportsViewer
    ↓
Parent rates session (optional)
    ↓
Notification sent to tutor
```

---

## Verification Tasks

### Task 1: Batch Reports Endpoint ✅ READY TO TEST

**Endpoint:** `GET /bookings/:ids/reports`  
**Status:** Implemented at line 401 of booking-routes.tsx  
**Expected Behavior:**
- Takes comma-separated booking IDs in path parameter
- Returns all reports in single batch
- Handles missing reports gracefully

**Test Cases:**
1. Single booking: `GET /bookings/booking123/reports`
2. Multiple bookings: `GET /bookings/id1,id2,id3/reports`
3. Mixed (some exist, some don't)
4. Empty IDs: should return 400 error
5. No auth token: should return 401 error

**Expected Response Format:**
```json
{
  "bookingIds": ["id1", "id2", "id3"],
  "count": 3,
  "reports": [
    { "bookingId": "id1", "tutorName": "John", ... },
    { "bookingId": "id2", "tutorName": "Jane", ... }
  ],
  "missing": [
    { "bookingId": "id3", "error": "Report not found" }
  ]
}
```

**Frontend Usage:**
```typescript
const reportsData = await parentAPI.getBookingReports(token, bookingIds);
// Used in BookingManager.tsx line 122
```

**Verification Checklist:**
- [ ] Endpoint returns correct response structure
- [ ] Handles partial batch (some reports exist, some don't)
- [ ] Performance: fetches all reports in <500ms
- [ ] Error handling: returns proper status codes
- [ ] Authorization: validates access token


### Task 2: Refund Calculation Endpoint ✅ READY TO TEST

**Endpoint:** `POST /bookings/:bookingId/calculate-refund`  
**Status:** Implemented at line 294 of booking-routes.tsx  
**Expected Behavior:**
- Calculates refund based on cancellation time
- Returns percentage and amount
- Shows refund policy

**Refund Policy:**
- >24 hours before: 100% refund
- <24 hours before: 50% refund
- Session already started: 0% refund

**Test Cases:**
1. Booking >24 hours away: should return 100%
2. Booking <24 hours away: should return 50%
3. Booking in past: should return 0%
4. Invalid booking: should return 404
5. Non-confirmed booking: should return 400

**Expected Response Format:**
```json
{
  "refundAmount": "50.00",
  "refundPercentage": 50,
  "policy": "Half refund - cancelled <24 hours before booking",
  "bookingId": "xyz",
  "hoursUntilBooking": 12
}
```

**Frontend Usage:**
```typescript
const refund = await parentAPI.calculateRefund(token, bookingId);
// Used in BookingManager.tsx for cancellation preview
```

**Verification Checklist:**
- [ ] Correctly calculates refund percentages
- [ ] Returns accurate refund amounts
- [ ] Handles edge cases (midnight crossings)
- [ ] Authorization validates
- [ ] Error messages are clear


### Task 3: Real-Time Updates Verification

**Status:** Client-side ✅, Server-side ⏳ pending

**What's Done:**
- SessionReportsViewer has WebSocket handler (line 92-108)
- Event listener for REPORT_SUBMITTED and REPORT_UPDATED
- Handles live refresh without page reload

**What's Missing:**
- WebSocket server at `wss://api.tutornest.local/` not implemented yet
- When reports are submitted, no real-time push to clients

**Verification Checklist:**
- [ ] Submit report as tutor
- [ ] Parent receives real-time notification (without refresh)
- [ ] SessionReportsViewer updates automatically
- [ ] Connection status indicator shows green (connected)
- [ ] On disconnect: shows gray WiFi icon, falls back gracefully


### Task 4: Notification System Integration

**Current Status:**
- ✅ Backend creates notification on report submission
- ✅ GET /notifications/:userId retrieves notifications
- ⚠️ Student NOT notified when parent rates session
- ⚠️ Tutor NOT notified when parent rates session

**Issue Details:**
When parent rates a session via POST /bookings/:bookingId/rate-session:
- Backend receives rating
- But NO notification is created for tutor
- This breaks two-way feedback loop

**Affected Files:**
- reports-notifications-routes.tsx line 95 (rate-session endpoint)
- Missing logic to create notification for tutor

**Verification Checklist:**
- [ ] Report submitted → Parent gets notification ✅
- [ ] Parent rates session → Tutor gets notification ⏳
- [ ] Notifications persist across sessions
- [ ] Notification count updates correctly


### Task 5: Data Validation on Backend

**Current Status:**
- ✅ Access token validation present
- ✅ Booking existence check
- ❌ No Zod validation on request body
- ❌ No field size limits
- ❌ No HTML/injection prevention

**Issues:**
- User can submit extremely long report text (no max length)
- No validation of rating values (could send rating=999)
- No protection against XSS in report text
- Student engagement/comprehension scores not validated

**Affected Endpoints:**
- POST /bookings/:bookingId/report (line 17 in reports-notifications-routes.tsx)
- POST /bookings/:bookingId/rate-session (line 95)

**Verification Checklist:**
- [ ] Report text truncated at max length (e.g., 5000 chars)
- [ ] Rating values validated (1-5 or equivalent)
- [ ] HTML/scripts removed from text fields
- [ ] Engagement/comprehension scores validated (0-100)
- [ ] Error messages don't reveal sensitive info


### Task 6: End-to-End Data Flow

**Test Scenario:**
1. Parent opens dashboard with 5 past bookings
2. Batch API fetches all 5 reports at once
3. Reports display in SessionReportsViewer
4. Parent clicks "Rate Session" on one report
5. Rating submitted to backend
6. Tutor is notified (pending implementation)
7. Tutor receives notification on their dashboard
8. Tutor clicks notification to view parent feedback

**Verification Steps:**
```
[ ] CREATE TEST DATA
    - 5 completed bookings with different times
    - 3 bookings with reports, 2 without
    - Mix of tutor-submitted and pending reports

[ ] TEST PARENT FLOW
    - Login as parent
    - Navigate to Bookings → Past
    - Verify batch fetch executes
    - View 5 booking cards
    - Check DevTools Network tab: should see 1 batch call, not 5 individual calls
    - Click "View Report" on first 3
    - Click "Rate Session"
    - Submit 4-star rating

[ ] TEST TUTOR FLOW
    - Login as tutor
    - Check notification center
    - Verify notification for parent rating received
    - Click notification
    - View parent feedback
    - Optionally reply to feedback

[ ] VERIFY DATA PERSISTENCE
    - Refresh page
    - Reports still visible
    - Ratings still showing
    - Notifications still in history

[ ] TEST ERROR CASES
    - Invalid booking ID
    - Expired access token
    - Network failure (check error boundary)
    - Report submission with empty fields
```

**Success Metrics:**
- ✅ Batch fetch reduces API calls from N to 1
- ✅ All data displays correctly
- ✅ Notifications deliver to recipient
- ✅ No errors in console
- ✅ Page loads in <2 seconds

---

## Outstanding Issues to Fix

### Issue 1: Missing Tutor Notification on Rating (⏳ PENDING)

**File:** `supabase/functions/make-server-cbd74580/reports-notifications-routes.tsx`  
**Line:** 95 (rate-session endpoint)

**Problem:**
```tsx
app.post('/bookings/:bookingId/rate-session', async (c) => {
  // ... gets booking and rating ...
  // BUT: No code to notify tutor!
  return c.json({ success: true });
});
```

**Solution:**
After line 120 (after saving rating), add:
```tsx
// Create notification for tutor
const booking = await kv.get(`booking:${bookingId}`);
await kv.set(`notification:${booking.tutorId}:${Date.now()}`, {
  type: 'RATING_RECEIVED',
  bookingId,
  rating: body.rating,
  feedback: body.feedback,
  parentName: body.parentName,
  createdAt: new Date().toISOString()
});
```

### Issue 2: No Student Notification on Report Submission (⏳ PENDING)

**File:** `supabase/functions/make-server-cbd74580/reports-notifications-routes.tsx`  
**Line:** 17 (submit report endpoint)

**Problem:**
Only parent is notified when tutor submits report. Student should also get a notification.

**Solution:**
Add after parent notification (around line 70):
```tsx
// Also notify student
await kv.set(`notification:${report.studentId}:${Date.now()}`, {
  type: 'REPORT_AVAILABLE',
  bookingId,
  reportSubmittedAt: new Date().toISOString(),
  tutorName: report.tutorName
});
```

### Issue 3: No Input Validation with Zod (⏳ PENDING)

**Files Affected:**
- reports-notifications-routes.tsx (POST /bookings/:id/report)
- reports-notifications-routes.tsx (POST /bookings/:id/rate-session)

**Problem:**
Report body can contain:
- Empty strings
- Extremely long text (no limits)
- Injection attempts (unescaped HTML)
- Invalid rating values (e.g., 999)

**Solution:**
Create validation schema:
```tsx
import { z } from 'zod';

const reportSchema = z.object({
  summary: z.string().min(10).max(500),
  topics: z.string().max(1000),
  rating: z.number().min(1).max(5),
  engagement: z.number().min(0).max(100),
  // ... other fields
});

// In endpoint:
const validated = reportSchema.parse(c.req.json());
```

### Issue 4: WebSocket Server Not Implemented (⏳ PENDING)

**Status:** Client code ready, server not running

**What's Needed:**
```
wss://api.tutornest.local/
  /reports (for real-time report updates)
  /bookings (for booking changes)
```

**Expected Events:**
```
{
  "type": "REPORT_SUBMITTED",
  "bookingId": "xyz",
  "tutorId": "abc",
  "timestamp": "2026-04-19T16:07:28Z"
}

{
  "type": "REPORT_UPDATED",
  "bookingId": "xyz",
  "rating": 4,
  "feedback": "Great session!"
}
```

---

## Testing Checklist

### Unit Tests (Frontend)
- [ ] parentAPI.getBookingReports with multiple IDs
- [ ] parentAPI.calculateRefund with different times
- [ ] SessionReportsViewer real-time handler
- [ ] Error boundary catches report errors

### Integration Tests
- [ ] Create booking → Submit report → View report
- [ ] Rating submission → Tutor notification
- [ ] Batch fetch vs N individual fetches (performance)
- [ ] WebSocket reconnection on network failure

### E2E Tests
- [ ] Full parent dashboard flow
- [ ] Full tutor dashboard flow  
- [ ] Admin viewing all reports
- [ ] Error recovery scenarios

### Performance Tests
- [ ] Batch fetch with 100 bookings: <1s
- [ ] Report display with large text: <500ms
- [ ] Real-time updates: <100ms latency
- [ ] Memory usage: no leaks over 10 minute session

---

## Deployment Checklist

Before deploying to production:

- [ ] All endpoints tested with valid/invalid data
- [ ] Error boundaries working
- [ ] WebSocket server ready (if real-time needed)
- [ ] Notification system tested end-to-end
- [ ] Database migrations applied
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

## Next Steps

### Immediate (Today)
1. ✅ Test batch reports endpoint
2. ✅ Test refund calculation endpoint
3. ⏳ Fix missing tutor rating notification
4. ⏳ Add student report notification

### Short-term (This week)
1. ⏳ Add Zod validation to backend
2. ⏳ Implement WebSocket server
3. ⏳ E2E testing with real users

### Medium-term (This sprint)
1. ⏳ PDF export for reports
2. ⏳ Report analytics dashboard
3. ⏳ Performance optimization

---

## Questions & Assumptions

1. **Q: Should reports be paginated?**
   A: Currently fetches all; consider pagination for parents with 100+ bookings

2. **Q: Report storage location?**
   A: Currently uses KV store (session_report_{bookingId}); need to verify persistence

3. **Q: WebSocket URL?**
   A: Assumed wss://api.tutornest.local/; needs confirmation

4. **Q: Maximum report text length?**
   A: Assumed 5000 chars; should define based on UX requirements

5. **Q: Rating scale?**
   A: Assumed 1-5; verify with product team

---

## Contact

For issues or questions, refer to:
- PHASE1_DEPLOYMENT_GUIDE.md (deployment)
- WEBSOCKET_IMPLEMENTATION_GUIDE.md (real-time)
- SESSION_REPORTS_AUDIT.md (original audit)

---

**Last Updated:** April 19, 2026  
**Owner:** Copilot  
**Status:** Phase 1 Verification - In Progress
