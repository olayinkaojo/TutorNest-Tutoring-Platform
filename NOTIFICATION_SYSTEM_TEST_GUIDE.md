# Notification System Test Guide

**Status:** Ready for Testing ✅  
**Build:** Passing (3,457 modules)  
**Fixes Applied:** 
- ✅ Main notifications route re-enabled
- ✅ KV key format bug fixed
- ✅ Security checks added to report submission
- ✅ Centralized notification API client created
- ✅ NotificationCenter updated to use API client

---

## Test Scenarios

### Test 1: Verify API Endpoint is Available

**Objective:** Confirm `/notifications/test` endpoint works

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:
```javascript
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/notifications/test', {
  headers: { 'Authorization': `Bearer ${YOUR_AUTH_TOKEN}` }
}).then(r => r.json()).then(console.log);
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Notifications endpoint is working",
  "timestamp": "2026-04-19T16:26:23.287Z"
}
```

**Status:** ✅ Pass/❌ Fail

---

### Test 2: Tutor Submits Report → Parent Receives Notification

**Objective:** Test end-to-end notification flow for session reports

**Prerequisites:**
- Parent and Tutor accounts logged in (separate tabs/browsers)
- Active session booking exists

**Steps:**

1. **Tutor Side:**
   - Navigate to "Session Reports" tab
   - Click "Submit Report" for a completed session
   - Fill form with:
     - Summary: "Student demonstrated strong understanding"
     - Topics: "Algebra basics"
     - Rating: 4/5
   - Click "Submit"
   - Check console for: `Notification created successfully`

2. **Parent Side:**
   - In ParentDashboard, click notification bell icon
   - Verify notification appears:
     - Title: "New Session Report"
     - Message: "[Tutor Name] has submitted a report for [Student Name]'s session"
     - Type: "report"

3. **Verify Notification Details:**
   - Click on notification
   - Verify it contains:
     - Report summary
     - Topics covered
     - Rating given
     - Timestamp

**Expected Result:**
- Notification appears within 2 seconds
- Notification contains all details
- Notification shows as unread (blue background)

**Status:** ✅ Pass/❌ Fail

---

### Test 3: Verify Unread Count Updates

**Objective:** Test unread notification count

**Steps:**
1. Tutor submits report (from Test 2)
2. Parent sees notification center with bell badge showing count
3. Parent clicks a notification to mark it as read
4. Badge count decrements

**Expected Result:**
- Badge shows `1` after new notification
- Badge shows `0` after marking as read
- Badge updates in real-time

**Status:** ✅ Pass/❌ Fail

---

### Test 4: Mark Notification as Read

**Objective:** Test individual notification read status

**Steps:**
1. Get multiple unread notifications (submit 3+ reports)
2. Click on one notification to mark as read
3. Verify:
   - Background color changes from blue to white
   - Font changes from bold to regular
   - Unread count decrements

**Expected Result:**
- Read status updates on notification
- Unread count decrements
- Changes reflected immediately

**Status:** ✅ Pass/❌ Fail

---

### Test 5: Mark All as Read

**Objective:** Test marking all notifications as read

**Steps:**
1. Get multiple unread notifications (submit 5+ reports)
2. Click "Mark All as Read" button in notification center
3. Verify all notifications show as read (no blue background)
4. Verify unread count is 0

**Expected Result:**
- All notifications marked as read
- Unread count becomes 0
- UI updates immediately

**Status:** ✅ Pass/❌ Fail

---

### Test 6: Delete Notification

**Objective:** Test notification deletion

**Steps:**
1. Get a notification
2. Click delete button (X icon)
3. Verify notification is removed from list

**Expected Result:**
- Notification disappears from list
- API successfully deletes from backend
- No errors in console

**Status:** ✅ Pass/❌ Fail

---

### Test 7: Verify Security Check (Unauthorized Report Submission)

**Objective:** Test that only tutors can submit reports

**Prerequisites:**
- Student account logged in

**Steps:**
1. As student, try to access report submission endpoint directly:
```javascript
// In browser console
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/bookings/BOOKING_ID/report', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${STUDENT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ summary: 'Test' })
}).then(r => r.json()).then(console.log);
```

**Expected Result:**
```json
{
  "error": "Only the tutor assigned to this booking can submit reports",
  "status": 403
}
```

**Status:** ✅ Pass/❌ Fail

---

### Test 8: Notification API Client Caching

**Objective:** Test request caching

**Steps:**
1. Open DevTools Network tab
2. Fetch notifications: `notificationAPI.getNotifications(token, userId)`
3. Make same call again within 5 seconds
4. Check Network tab - should see 1 API call, not 2
5. Wait 6 seconds and call again - should see API call (cache expired)

**Expected Result:**
- First call: API request made
- Second call (< 5s): Cached response used, no API call
- Third call (> 5s): New API request made (cache expired)

**Status:** ✅ Pass/❌ Fail

---

### Test 9: Cross-Dashboard Notifications

**Objective:** Test notifications work on all 4 dashboards

**Dashboards to Test:**
1. ✅ Parent Dashboard
2. ✅ Student Dashboard
3. ✅ Tutor Dashboard
4. ✅ Admin Dashboard

**Steps for Each Dashboard:**
1. Login to dashboard
2. Perform action that creates notification (e.g., tutor submits report)
3. Verify notification appears in that dashboard's notification center
4. Verify notification has correct type, title, message

**Expected Result:**
- All 4 dashboards receive notifications
- Notifications have dashboard-specific content
- Notification center works identically on all dashboards

**Status:** 
- Parent: ✅ Pass/❌ Fail
- Student: ✅ Pass/❌ Fail
- Tutor: ✅ Pass/❌ Fail
- Admin: ✅ Pass/❌ Fail

---

### Test 10: Notification Types Display

**Objective:** Test different notification types show correct icons

**Notification Types to Verify:**
- 🔵 **booking** → Calendar icon (blue)
- ⏰ **reminder** → Clock icon (amber)
- 💬 **message** → Chat bubble (green)
- 📄 **report** → File text (purple)
- 💳 **payment** → Dollar sign (green)
- ⚠️ **system** → Alert circle (gray)

**Steps:**
1. Create notifications of each type (simulate or trigger actual events)
2. Verify correct icon appears for each type
3. Verify icon color matches expected

**Expected Result:**
- All notification types display with correct icons
- Colors match notification type
- Icons are distinguishable and clear

**Status:** ✅ Pass/❌ Fail

---

### Test 11: Email Notifications (Currently Not Implemented)

**Objective:** Verify email notification infrastructure

**Status:** ⏳ PENDING IMPLEMENTATION

**Issue:** `sendEmailNotification()` in reports-notifications-routes.tsx currently only logs to console

**Required:**
1. Integrate with SendGrid, Mailgun, or similar
2. Implement email template for:
   - Session report available
   - Session rated
   - Payment processed
   - Booking confirmation
   - Payment failed

---

### Test 12: Real-Time Updates via WebSocket (Currently Not Implemented)

**Objective:** Test real-time notification delivery

**Status:** ⏳ PENDING IMPLEMENTATION

**Issue:** WebSocket server not implemented at `wss://api.tutornest.local/`

**Current Workaround:** 30-second polling in NotificationCenter

**Required:**
1. Implement WebSocket server
2. Connect client to real-time events
3. Remove polling interval
4. Enable instant notifications

---

## Error Scenarios to Test

### Error 1: Invalid Access Token

**Test:**
```javascript
notificationAPI.getNotifications('invalid_token', 'user_123')
```

**Expected:**
```json
{
  "code": "HTTP_401",
  "message": "Invalid or expired JWT token",
  "status": 401
}
```

**Status:** ✅ Pass/❌ Fail

---

### Error 2: Missing User ID

**Test:**
```javascript
notificationAPI.getNotifications(token, null)
```

**Expected:**
```json
{
  "code": "INVALID_INPUT",
  "message": "User ID required",
  "status": 400
}
```

**Status:** ✅ Pass/❌ Fail

---

### Error 3: Network Timeout

**Test:**
1. Simulate network timeout by throttling network to GPRS
2. Call `notificationAPI.getNotifications(token, userId)`
3. Wait 30+ seconds

**Expected:**
- Request aborts after 30 seconds
- Error thrown with "REQUEST_FAILED"
- Graceful error handling

**Status:** ✅ Pass/❌ Fail

---

## Performance Tests

### Performance 1: Initial Load Time

**Objective:** Measure time to load notifications

**Measurement:**
```javascript
console.time('load-notifications');
const notifs = await notificationAPI.getNotifications(token, userId);
console.timeEnd('load-notifications');
```

**Expected:** < 500ms on normal network

**Actual:** ___ ms

**Status:** ✅ Pass/❌ Fail

---

### Performance 2: Cache Hit Speed

**Objective:** Measure cached response time

**Measurement:**
```javascript
// First call - uncached
await notificationAPI.getNotifications(token, userId);

// Second call - cached
console.time('cached-load');
const notifs = await notificationAPI.getNotifications(token, userId);
console.timeEnd('cached-load');
```

**Expected:** < 10ms with caching

**Actual:** ___ ms

**Status:** ✅ Pass/❌ Fail

---

### Performance 3: Multiple Concurrent Requests

**Objective:** Test request deduplication

**Test:**
```javascript
// Make 5 concurrent requests (should deduplicate to 1)
const promises = [];
for (let i = 0; i < 5; i++) {
  promises.push(notificationAPI.getNotifications(token, userId));
}
const results = await Promise.all(promises);

// Check Network tab - should see only 1 API call
```

**Expected:** 1 API call, 5 returned responses

**Actual:** ___ API calls

**Status:** ✅ Pass/❌ Fail

---

## Load Testing

### Load Test 1: Many Notifications

**Objective:** Verify performance with 1000+ notifications

**Setup:**
```javascript
const notificationsArray = [];
for (let i = 0; i < 1000; i++) {
  notificationsArray.push({
    id: `notification_${i}`,
    title: `Notification ${i}`,
    message: `This is notification number ${i}`,
    type: 'system',
    read: i % 2 === 0,
    createdAt: new Date().toISOString()
  });
}
```

**Measurement:**
- Time to render 1000 notifications
- Memory usage
- Scroll performance

**Expected:**
- Render < 2 seconds
- Memory < 50MB
- Smooth scrolling

**Status:** ✅ Pass/❌ Fail

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 120+ | ✅/❌ |
| Firefox 123+ | ✅/❌ |
| Safari 17+ | ✅/❌ |
| Edge 120+ | ✅/❌ |
| Mobile Chrome | ✅/❌ |
| Mobile Safari | ✅/❌ |

---

## Rollback Plan

If critical issues found:

1. **Quick Fix (5 mins):**
   - Disable new notifications route
   - Revert to 30-second polling

2. **Medium Fix (20 mins):**
   - Revert notification API client
   - Use hardcoded URLs temporarily

3. **Full Rollback (30 mins):**
   - Revert all 3 commits
   - Restore previous notification system

**Rollback Command:**
```bash
git revert HEAD~2..HEAD
git push origin main
```

---

## Test Results Summary

| Test | Result | Notes |
|------|--------|-------|
| Test 1: API Endpoint | ✅/❌ | |
| Test 2: Report Flow | ✅/❌ | |
| Test 3: Unread Count | ✅/❌ | |
| Test 4: Mark as Read | ✅/❌ | |
| Test 5: Mark All Read | ✅/❌ | |
| Test 6: Delete | ✅/❌ | |
| Test 7: Security Check | ✅/❌ | |
| Test 8: Caching | ✅/❌ | |
| Test 9: Cross-Dashboard | ✅/❌ | |
| Test 10: Icon Display | ✅/❌ | |
| Test 11: Email (PENDING) | ⏳ | Needs implementation |
| Test 12: WebSocket (PENDING) | ⏳ | Needs implementation |

**Overall Status:** Ready for Testing

---

## Next Steps

1. **Immediate:** Run tests 1-10 to verify core functionality
2. **Short-term:** Implement email notifications (Test 11)
3. **Long-term:** Implement WebSocket for real-time (Test 12)

---

**Test Date:** ___________  
**Tested By:** ___________  
**Approval:** ___________

