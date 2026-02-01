# 🚀 Quick Start: Testing Google Calendar Booking (5 Minutes)

## Fastest Way to Test Everything

### Step 1: Setup Test Data (1 minute)

1. **Login as Admin** (create admin account if needed)
2. **Go to Admin Dashboard → Overview tab**
3. **Scroll down** to "Test Data Setup - Google Calendar Booking Demo"
4. **Click "Create Test Data"** button
5. **Wait 30-60 seconds** for completion
6. **Save these credentials:**
   ```
   Tutor:  test.tutor@tutornest.demo  / TestTutor123!
   Parent: test.parent@tutornest.demo / TestParent123!
   ```

✅ **You now have:** Tutor with availability + Parent with child profile

---

### Step 2: Connect Google Calendar (2 minutes)

**As Tutor:**
1. Sign out, sign in as tutor
2. Settings → Google Calendar → Connect
3. Authorize with your Google account
4. Verify "Connected ✓" status

**As Parent:**
1. Sign out, sign in as parent
2. Settings → Google Calendar → Connect
3. Authorize with Google account
4. Verify "Connected ✓" status

✅ **Both calendars connected**

---

### Step 3: Test Blocking (1 minute)

1. **Open Google Calendar** (tutor's account)
2. **Add event for tomorrow:** 2:00 PM - 3:00 PM "Personal Appointment"
3. **In TutorNest as Parent:**
   - Search for tutor
   - Book session
   - Select tomorrow
   - **Verify:** 2:00 PM - 3:00 PM shows as "Booked" ✅

---

### Step 4: Book a Session (1 minute)

1. **Still as parent**
2. **Select time:** 3:00 PM - 4:00 PM (should be available)
3. **Confirm booking**
4. **Wait for success message**
5. **Check both Google Calendars:**
   - Both have event at 3:00 PM ✅
   - Both have same Meet link ✅

---

## 🎉 Success!

You just verified:
- ✅ Tutor availability works
- ✅ Google Calendar blocks unavailable times
- ✅ Bookings create calendar events
- ✅ Meet links are generated
- ✅ Both parties get synced events

**Total time:** ~5 minutes

---

## What to Test Next

### Quick Tests (5 more minutes)

1. **Double-booking prevention:**
   - Try booking same time as different parent
   - Should be blocked ✅

2. **Disconnect calendar:**
   - Settings → Disconnect
   - Book new session
   - No calendar event created ✅

3. **Mobile view:**
   - Open on phone
   - Complete booking flow ✅

---

## Full Test Guide

For comprehensive testing with all scenarios, see:
📄 `/docs/STEP_BY_STEP_TESTING_GUIDE.md` (20 test scenarios, 60 minutes)

---

## Test Data Details

The automated setup creates:

**Tutor: Sarah Mathematics**
- Subjects: Mathematics, Physics, Chemistry
- Rate: £45/hour
- Availability: Mon-Fri with various time slots
- Verified status

**Parent: James Wilson**
- Standard subscription (2 children)
- Phone: +44 7700 900123

**Student: Emma Wilson**
- Year 9
- Subjects: Mathematics, Physics
- Learning goals set

---

## Troubleshooting

### Test data creation fails
- Check backend logs
- Verify Supabase connection
- Try manual account creation

### Google Calendar not blocking
- Verify connection status shows "Connected"
- Check event exists in Google Calendar
- Wait 1-2 seconds and refresh

### No Meet link in event
- Verify event was created after enhancement
- Check "conferenceData" in event details
- New bookings will have links

---

## Clean Up

To remove test data:
1. Admin Dashboard → Overview
2. Test Data Setup card
3. "Clear Test Data" button
4. Or manually delete from Admin User Management

---

## Production Checklist

Before going live:

- [ ] Set production Google OAuth credentials
- [ ] Configure proper redirect URIs
- [ ] Test with real Google accounts
- [ ] Verify email notifications work
- [ ] Set up payment gateway
- [ ] Test timezone handling
- [ ] Review security settings
- [ ] Set up monitoring/logging

---

## Key Features Demonstrated

### Smart Availability
- Manual weekly schedule ✅
- Google Calendar blocking ✅
- Double-booking prevention ✅

### Calendar Sync
- Automatic event creation ✅
- Google Meet links ✅
- Both parties synced ✅
- Event details included ✅

### User Experience
- Intuitive booking flow ✅
- Clear availability display ✅
- Loading indicators ✅
- Success confirmations ✅

---

## Questions?

- Full technical guide: `/docs/GOOGLE_CALENDAR_BOOKING_GUIDE.md`
- Complete test checklist: `/docs/BOOKING_SYSTEM_TEST_CHECKLIST.md`
- Detailed walkthrough: `/docs/STEP_BY_STEP_TESTING_GUIDE.md`

**Happy Testing! 🎉**
