# TutorNest Booking System - Test Checklist

## Prerequisites Setup

### Environment Variables
- [ ] `GOOGLE_CLIENT_ID` configured in Supabase
- [ ] `GOOGLE_CLIENT_SECRET` configured in Supabase  
- [ ] `GOOGLE_REDIRECT_URI` configured in Supabase
- [ ] Google Calendar API enabled in Google Cloud Console
- [ ] OAuth consent screen configured

### Test Users
- [ ] Create test Parent account
- [ ] Create test Student account (child profile)
- [ ] Create test Tutor account with verified status
- [ ] Set tutor hourly rate

---

## Phase 1: Basic Tutor Availability Setup

### Test 1.1: Set Weekly Availability
- [ ] Login as Tutor
- [ ] Navigate to Availability section
- [ ] Enable Monday, Wednesday, Friday
- [ ] Add time slots:
  - [ ] Monday: 9:00 AM - 5:00 PM
  - [ ] Wednesday: 10:00 AM - 4:00 PM
  - [ ] Friday: 2:00 PM - 6:00 PM
- [ ] Save availability
- [ ] Verify success message appears
- [ ] Refresh page and confirm slots are saved

**Expected Result:** ✓ Tutor availability is saved and persists

---

## Phase 2: Google Calendar Connection

### Test 2.1: Connect Google Calendar (Tutor)
- [ ] Navigate to Settings → Google Calendar
- [ ] Click "Connect Google Calendar"
- [ ] Authorize with Google account
- [ ] Verify redirect back to TutorNest
- [ ] Confirm "Connected" status shows
- [ ] Verify connection date appears

**Expected Result:** ✓ Google Calendar shows as connected

### Test 2.2: Connect Google Calendar (Parent)
- [ ] Login as Parent
- [ ] Navigate to Settings → Google Calendar
- [ ] Click "Connect Google Calendar"
- [ ] Authorize with Google account
- [ ] Verify "Connected" status

**Expected Result:** ✓ Parent's Google Calendar connected

---

## Phase 3: Availability Viewing Without Google Calendar

### Test 3.1: View Basic Availability
- [ ] Disconnect tutor's Google Calendar (if connected)
- [ ] Login as Parent
- [ ] Search for and select the test tutor
- [ ] Navigate to booking calendar
- [ ] Select tomorrow's date (if it's Monday, Wednesday, or Friday)
- [ ] Verify time slots appear based on tutor's schedule

**Expected Result:** ✓ Available slots match tutor's set availability

### Test 3.2: Verify Past Dates Disabled
- [ ] Try to select yesterday's date
- [ ] Verify date is greyed out/disabled
- [ ] Try to select today's date (if time has passed)

**Expected Result:** ✓ Past dates cannot be selected

---

## Phase 4: Google Calendar Blocking

### Test 4.1: Add Personal Event to Tutor's Google Calendar
- [ ] Login to tutor's Google Calendar
- [ ] Create event for tomorrow 11:00 AM - 12:00 PM
- [ ] Title: "Personal Appointment"
- [ ] Save event

### Test 4.2: Verify Blocking in TutorNest
- [ ] Reconnect tutor's Google Calendar in TutorNest
- [ ] Login as Parent in TutorNest
- [ ] View tutor's availability for tomorrow
- [ ] Look at 11:00 AM - 12:00 PM slot

**Expected Result:** ✓ The 11:00 AM - 12:00 PM slot is marked as "Booked" or unavailable

### Test 4.3: Verify Adjacent Slots Available
- [ ] Check 10:00 AM - 11:00 AM slot
- [ ] Check 12:00 PM - 1:00 PM slot

**Expected Result:** ✓ Adjacent slots show as "Available"

---

## Phase 5: Session Booking (Without Google Calendar)

### Test 5.1: Book Session Without Calendar Sync
- [ ] Disconnect both tutor and parent Google Calendars
- [ ] Login as Parent
- [ ] Select tutor and navigate to booking
- [ ] Select date: Tomorrow (available day)
- [ ] Select time slot: 2:00 PM - 3:00 PM
- [ ] Review booking details:
  - [ ] Tutor name correct
  - [ ] Date and time correct
  - [ ] Price calculated correctly
- [ ] Click "Confirm & Pay"
- [ ] Wait for confirmation
- [ ] Verify success message

**Expected Result:** ✓ Booking confirmed, success message displayed

### Test 5.2: Verify Booking in Database
- [ ] Refresh booking calendar
- [ ] Check 2:00 PM - 3:00 PM slot now shows "Booked"
- [ ] Login as Tutor
- [ ] Check "Upcoming Sessions" section
- [ ] Verify booking appears with correct details

**Expected Result:** ✓ Booking visible to both parent and tutor

### Test 5.3: Prevent Double-Booking
- [ ] Login as different parent account
- [ ] Try to book same tutor, same time
- [ ] Verify slot shows as "Booked"
- [ ] Confirm slot is not clickable

**Expected Result:** ✓ Double-booking prevented

---

## Phase 6: Session Booking With Google Calendar

### Test 6.1: Book Session With Full Sync
- [ ] Reconnect both tutor and parent Google Calendars
- [ ] Login as Parent
- [ ] Verify blue banner: "Google Calendar Sync Active"
- [ ] Select tutor and navigate to booking
- [ ] Select date: Day after tomorrow (available day)
- [ ] Select time slot: 3:00 PM - 4:00 PM
- [ ] Confirm booking
- [ ] Wait for success message

**Expected Result:** ✓ Booking confirmed

### Test 6.2: Verify Google Calendar Event (Parent)
- [ ] Open parent's Google Calendar in browser
- [ ] Navigate to booked date
- [ ] Find event at 3:00 PM
- [ ] Verify event details:
  - [ ] Title: "Tutoring Session with [Tutor Name]"
  - [ ] Time: 3:00 PM - 4:00 PM
  - [ ] Description includes student name
  - [ ] Location: "TutorNest Virtual Classroom"
  - [ ] Attendees include tutor email
  - [ ] Google Meet link present

**Expected Result:** ✓ Event created in parent's calendar with all details

### Test 6.3: Verify Google Calendar Event (Tutor)
- [ ] Open tutor's Google Calendar in browser
- [ ] Navigate to booked date
- [ ] Find event at 3:00 PM
- [ ] Verify event details:
  - [ ] Title: "Tutoring Session with [Student Name]"
  - [ ] Time: 3:00 PM - 4:00 PM
  - [ ] Description includes parent name and price
  - [ ] Attendees include parent email
  - [ ] Google Meet link present (same as parent's)

**Expected Result:** ✓ Event created in tutor's calendar with all details

### Test 6.4: Test Meet Link
- [ ] Click Google Meet link from either calendar
- [ ] Verify link opens Google Meet
- [ ] Verify meeting name relates to TutorNest session

**Expected Result:** ✓ Meet link works correctly

---

## Phase 7: Edge Cases & Error Handling

### Test 7.1: Expired Token Handling
- [ ] Wait for Google token to expire (or manually invalidate)
- [ ] Try to book a session
- [ ] Verify appropriate error message
- [ ] Reconnect Google Calendar
- [ ] Retry booking

**Expected Result:** ✓ Graceful error handling, reconnection works

### Test 7.2: Network Error Handling
- [ ] Disable network during booking
- [ ] Attempt to book session
- [ ] Verify error message appears
- [ ] Re-enable network
- [ ] Retry booking

**Expected Result:** ✓ Clear error message, retry successful

### Test 7.3: Race Condition Prevention
- [ ] Open booking page in two browser windows (different parents)
- [ ] Both select same tutor, same slot
- [ ] Both click confirm simultaneously
- [ ] First succeeds, second gets error

**Expected Result:** ✓ Only one booking succeeds, atomic lock works

### Test 7.4: Tutor Has No Availability
- [ ] Login as tutor
- [ ] Disable all days in availability
- [ ] Save changes
- [ ] Login as parent
- [ ] Try to book this tutor

**Expected Result:** ✓ "No available slots" message shown

### Test 7.5: Booking on Unavailable Day
- [ ] Tutor has availability only on Monday
- [ ] Parent tries to book on Tuesday
- [ ] Verify no slots appear

**Expected Result:** ✓ No slots shown for unavailable days

---

## Phase 8: Disconnection & Cleanup

### Test 8.1: Disconnect Google Calendar
- [ ] Login as Parent
- [ ] Navigate to Settings → Google Calendar
- [ ] Click "Disconnect Google Calendar"
- [ ] Confirm disconnection
- [ ] Verify status shows "Not Connected"
- [ ] Refresh page and verify still disconnected

**Expected Result:** ✓ Disconnection successful and persists

### Test 8.2: Book After Disconnection
- [ ] Book a new session (calendar disconnected)
- [ ] Verify booking works normally
- [ ] Check Google Calendar
- [ ] Verify NO new event created

**Expected Result:** ✓ Booking works without calendar sync

### Test 8.3: Existing Events Remain
- [ ] Check previous Google Calendar events
- [ ] Verify events from when calendar was connected remain

**Expected Result:** ✓ Past events not deleted on disconnection

---

## Phase 9: Mobile Responsiveness

### Test 9.1: Mobile Booking Flow
- [ ] Open TutorNest on mobile device/emulator
- [ ] Complete full booking flow
- [ ] Verify calendar picker works
- [ ] Verify slot selection works
- [ ] Verify confirmation dialog displays correctly

**Expected Result:** ✓ Full functionality on mobile

---

## Phase 10: Performance & Scalability

### Test 10.1: Large Availability Schedule
- [ ] Set availability for all 7 days
- [ ] Add multiple slots per day (8+ hours)
- [ ] View availability as parent
- [ ] Measure page load time

**Expected Result:** ✓ Page loads in < 2 seconds

### Test 10.2: Multiple Bookings
- [ ] Create 10+ bookings for the tutor
- [ ] View upcoming sessions
- [ ] Verify all display correctly
- [ ] Verify performance remains good

**Expected Result:** ✓ System handles multiple bookings efficiently

---

## Summary Checklist

### Critical Functionality
- [ ] Tutor can set availability
- [ ] Google Calendar can be connected
- [ ] Availability blocking from Google Calendar works
- [ ] Sessions can be booked
- [ ] Google Calendar events created with Meet links
- [ ] Double-booking prevented
- [ ] Both parties see booking details

### User Experience
- [ ] Clear error messages
- [ ] Success confirmations
- [ ] Loading indicators
- [ ] Mobile responsive
- [ ] Intuitive navigation

### Security & Privacy
- [ ] OAuth flow secure
- [ ] Tokens stored encrypted
- [ ] User emails only shared with session participants
- [ ] Disconnection removes tokens

---

## Issues Found

Document any issues discovered during testing:

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |

---

## Test Completion Sign-off

- **Tester Name:** _______________
- **Date:** _______________
- **Overall Status:** ☐ Pass  ☐ Fail  ☐ Pass with Minor Issues
- **Notes:** _______________
