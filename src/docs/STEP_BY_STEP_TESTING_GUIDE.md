# 🧪 TutorNest Google Calendar Booking - Step-by-Step Testing Guide

## Quick Start: Automated Test Data Setup

### Step 0: Create Test Data (5 minutes)

1. **Access Test Data Setup Component**
   - You can add this component to your Admin Dashboard or create a temporary route
   - Component located at: `/components/TestDataSetup.tsx`

2. **Create Test Accounts**
   - Click "Create Test Data" button
   - Wait for setup to complete (30-60 seconds)
   - Save the credentials shown:
     - **Tutor:** test.tutor@tutornest.demo / TestTutor123!
     - **Parent:** test.parent@tutornest.demo / TestParent123!

3. **What Gets Created:**
   - ✅ Tutor account (Sarah Mathematics) with £45/hour rate
   - ✅ Parent account (James Wilson)
   - ✅ Student profile (Emma Wilson, Year 9)
   - ✅ Full tutor availability schedule (Mon-Fri)

---

## Scenario 1: Basic Booking Without Google Calendar (10 minutes)

### Objective: Test the core booking functionality

### Step 1: Login as Tutor (2 minutes)

1. **Sign Out** if currently logged in
2. **Sign In** with:
   - Email: `test.tutor@tutornest.demo`
   - Password: `TestTutor123!`

3. **Verify Tutor Dashboard Loads**
   - You should see: "Welcome, Sarah!"
   - Dashboard shows: Availability section

### Step 2: Review Tutor Availability (2 minutes)

1. **Navigate to Availability Section**
   - Click on "Availability" in the dashboard navigation

2. **Verify Pre-Set Schedule:**
   - ✅ Monday: 9:00 AM - 12:00 PM, 2:00 PM - 5:00 PM
   - ✅ Tuesday: 10:00 AM - 4:00 PM
   - ✅ Wednesday: 9:00 AM - 12:00 PM, 2:00 PM - 6:00 PM
   - ✅ Thursday: 10:00 AM - 4:00 PM
   - ✅ Friday: 9:00 AM - 3:00 PM
   - ✅ Saturday & Sunday: Disabled

3. **Expected View:**
   ```
   Weekly Availability
   ├─ Monday [✓ Enabled]
   │  ├─ 09:00 to 12:00
   │  └─ 14:00 to 17:00
   ├─ Tuesday [✓ Enabled]
   │  └─ 10:00 to 16:00
   ...
   ```

### Step 3: Sign Out and Login as Parent (1 minute)

1. **Sign Out** (top right menu)
2. **Sign In** with:
   - Email: `test.parent@tutornest.demo`
   - Password: `TestParent123!`

3. **Verify Parent Dashboard Loads**
   - You should see: "Welcome, James!"
   - Child profile: Emma Wilson should be visible

### Step 4: Search for Tutor (2 minutes)

1. **Navigate to Find Tutors** (or Tutor Search)

2. **Search for "Sarah Mathematics"**
   - Use search bar or filters
   - Subject filter: Mathematics

3. **Click on Sarah's Profile**
   - View tutor details:
     - ✅ Name: Sarah Mathematics
     - ✅ Rate: £45.00/hour
     - ✅ Subjects: Mathematics, Physics, Chemistry
     - ✅ Qualifications shown

### Step 5: Book a Session (3 minutes)

1. **Click "Book Session" or "Schedule Lesson"**

2. **Booking Calendar Opens:**
   - Calendar view on the left
   - Available time slots on the right

3. **Select Tomorrow's Date** (if it's Monday-Friday)
   - Click on tomorrow's date in the calendar
   - Wait for slots to load (1-2 seconds)

4. **Expected: Available Slots Appear**
   ```
   Available Time Slots
   Monday, [Date]
   
   [✓ Available] 09:00 AM - 10:00 AM
   [✓ Available] 10:00 AM - 11:00 AM
   [✓ Available] 11:00 AM - 12:00 PM
   [✓ Available] 02:00 PM - 03:00 PM
   [✓ Available] 03:00 PM - 04:00 PM
   [✓ Available] 04:00 PM - 05:00 PM
   ```

5. **Select Time Slot: 10:00 AM - 11:00 AM**
   - Click on the slot
   - Confirmation dialog appears

6. **Review Booking Details:**
   ```
   Confirm Booking
   
   Tutor: Sarah Mathematics
   Date & Time: Monday, [Date]
                10:00 AM - 11:00 AM
   Price: £45.00 (£45.00/hour)
   
   Cancellation Policy: [Details shown]
   ```

7. **Click "Confirm & Pay £45.00"**
   - Loading spinner appears
   - Wait 1-2 seconds

8. **Expected: Success Message**
   ```
   ✅ Booking confirmed! You will receive a confirmation email shortly.
   ```

### Step 6: Verify Booking (2 minutes)

1. **Refresh the booking calendar**
   - Select tomorrow's date again
   - Look for 10:00 AM - 11:00 AM slot

2. **Expected: Slot Now Shows "Booked"**
   ```
   [⊗ Booked] 10:00 AM - 11:00 AM
   ```

3. **Navigate to "My Bookings" or "Upcoming Sessions"**
   - Verify booking appears:
     - ✅ Tutor: Sarah Mathematics
     - ✅ Date: Tomorrow
     - ✅ Time: 10:00 AM - 11:00 AM
     - ✅ Price: £45.00
     - ✅ Status: Confirmed

### Step 7: Verify from Tutor Side (2 minutes)

1. **Sign Out**
2. **Sign In as Tutor** (test.tutor@tutornest.demo)

3. **Navigate to "Upcoming Sessions"**
   - Verify booking appears:
     - ✅ Student: Emma Wilson
     - ✅ Parent: James Wilson
     - ✅ Date & Time: Tomorrow, 10:00 AM - 11:00 AM
     - ✅ Price: £45.00

✅ **Scenario 1 Complete!** Basic booking works without Google Calendar.

---

## Scenario 2: Google Calendar Integration - Blocking (20 minutes)

### Objective: Test Google Calendar availability blocking

### Step 8: Connect Tutor's Google Calendar (5 minutes)

1. **Still Logged in as Tutor**

2. **Navigate to Settings → Google Calendar**
   - Or look for "Connect Google Calendar" option

3. **Click "Connect Google Calendar"**
   - Opens Google OAuth consent screen
   - Select your Google account (use a test Google account if possible)

4. **Grant Permissions:**
   - Allow TutorNest to:
     - See, edit, share, and permanently delete all calendars
     - (This is standard for calendar apps)
   - Click "Allow" or "Continue"

5. **Redirected Back to TutorNest**
   - Expected: "Google Calendar connected successfully!"
   - Status shows: "Connected ✓"
   - Connected date shown

6. **Verify Connection:**
   ```
   Google Calendar Integration
   Status: [✓ Active] Connected
   Connected on: [Today's Date]
   ```

### Step 9: Add Personal Event in Google Calendar (3 minutes)

1. **Open Google Calendar** in a new browser tab
   - Go to: calendar.google.com
   - Use the same account you connected to TutorNest

2. **Navigate to Tomorrow** (same date as our booking test)

3. **Create New Event:**
   - Click on 2:00 PM slot
   - **Title:** "Personal Appointment"
   - **Time:** 2:00 PM - 3:00 PM
   - Click "Save"

4. **Verify Event Created:**
   - Event appears in your Google Calendar
   - Shows "Personal Appointment" at 2:00 PM

### Step 10: Test Availability Blocking (5 minutes)

1. **Return to TutorNest**

2. **Sign Out**

3. **Sign In as Parent** (test.parent@tutornest.demo)

4. **Navigate to Book Session with Sarah**
   - Find Tutors → Sarah Mathematics → Book Session

5. **Select Tomorrow's Date**
   - Same date where you added the Google Calendar event

6. **Check Available Slots:**

   **Expected Result:**
   ```
   Available Time Slots
   
   [✓ Available] 09:00 AM - 10:00 AM
   [⊗ Booked]    10:00 AM - 11:00 AM  ← Our TutorNest booking
   [✓ Available] 11:00 AM - 12:00 PM
   [⊗ Booked]    02:00 PM - 03:00 PM  ← Google Calendar event!
   [✓ Available] 03:00 PM - 04:00 PM
   [✓ Available] 04:00 PM - 05:00 PM
   ```

7. **CRITICAL CHECK: 2:00 PM - 3:00 PM should be BLOCKED**
   - This proves Google Calendar integration is working!
   - The slot is blocked because of the "Personal Appointment"

8. **Try Clicking on 2:00 PM - 3:00 PM slot**
   - Expected: Button is disabled/greyed out
   - Cannot select this time

### Step 11: Book Another Session in Available Slot (3 minutes)

1. **Select: 3:00 PM - 4:00 PM** (should be available)

2. **Confirm Booking**
   - Review details
   - Click "Confirm & Pay £45.00"

3. **Expected: Success**
   - Booking confirmed
   - Session created for 3:00 PM - 4:00 PM

4. **Refresh and Verify:**
   - 3:00 PM - 4:00 PM now shows "Booked"
   - 2:00 PM - 3:00 PM still shows "Booked" (Google Calendar event)

### Step 12: Verify in Google Calendar (4 minutes)

1. **Go Back to Google Calendar**
   - Navigate to tomorrow's date

2. **Expected: You Should See:**
   ```
   Tomorrow
   ├─ 10:00 AM - 11:00 AM: Tutoring Session with Emma Wilson
   ├─ 02:00 PM - 03:00 PM: Personal Appointment
   └─ 03:00 PM - 04:00 PM: Tutoring Session with Emma Wilson
   ```

3. **Click on "Tutoring Session with Emma Wilson" at 3:00 PM**

4. **Verify Event Details:**
   - ✅ Title: "Tutoring Session with Emma Wilson"
   - ✅ Time: 3:00 PM - 4:00 PM
   - ✅ Description: Includes student name, subject, price
   - ✅ Location: "TutorNest Virtual Classroom"
   - ✅ Attendees: Shows parent's email
   - ✅ **Google Meet Link Present!** (Important!)

5. **Click the Meet Link**
   - Opens Google Meet interface
   - Meeting name relates to the session

✅ **Scenario 2 Complete!** Google Calendar blocking and event creation work!

---

## Scenario 3: Parent Google Calendar Sync (10 minutes)

### Objective: Test bidirectional calendar sync

### Step 13: Connect Parent's Google Calendar (5 minutes)

1. **Logged in as Parent** (test.parent@tutornest.demo)

2. **Navigate to Settings → Google Calendar**

3. **Click "Connect Google Calendar"**
   - Use a DIFFERENT Google account than the tutor's
   - (Or use the same if testing with one account)

4. **Grant Permissions**
   - Click "Allow"

5. **Verify Connection:**
   - Status: "Connected ✓"

6. **Notice on Booking Page:**
   - When you go to book again, you should see:
   ```
   ℹ️ Google Calendar Sync Active: Your booking will be 
   automatically added to your Google Calendar with a Meet 
   link for the virtual classroom.
   ```

### Step 14: Book with Both Calendars Connected (3 minutes)

1. **Book Another Session:**
   - Date: Tomorrow
   - Time: 11:00 AM - 12:00 PM

2. **Confirm Booking**

3. **Expected: Success message**

### Step 15: Verify Both Calendars Updated (2 minutes)

**Parent's Google Calendar:**
1. Open parent's Google Calendar
2. Navigate to tomorrow
3. **Expected: Event at 11:00 AM**
   - Title: "Tutoring Session with Sarah Mathematics"
   - Description: For Emma Wilson
   - Meet link present

**Tutor's Google Calendar:**
1. Open tutor's Google Calendar (in different browser/tab)
2. Navigate to tomorrow
3. **Expected: Event at 11:00 AM**
   - Title: "Tutoring Session with Emma Wilson"
   - Description: Includes parent name and price
   - **Same Meet link as parent's event**

✅ **Scenario 3 Complete!** Bidirectional sync works perfectly!

---

## Scenario 4: Advanced Features (15 minutes)

### Step 16: Test Double-Booking Prevention (3 minutes)

1. **Create Another Parent Account** (or use incognito browser)
   - Email: parent2@example.com
   - Password: TestParent456!

2. **Try to Book Sarah at 11:00 AM tomorrow**
   - Same time as existing booking

3. **Expected Result:**
   - Slot shows as "Booked"
   - Cannot be selected
   - **System prevents double-booking!**

### Step 17: Test Multiple Day Booking (3 minutes)

1. **As Parent, Book Multiple Sessions:**
   - Monday 9:00 AM
   - Wednesday 2:00 PM
   - Friday 10:00 AM

2. **Verify All in Calendar:**
   - All three sessions appear in Google Calendar
   - All have Meet links
   - All show correct details

### Step 18: Test Availability Update (4 minutes)

1. **Login as Tutor**

2. **Modify Availability:**
   - Disable Tuesday completely
   - Change Wednesday to 10:00 AM - 3:00 PM only

3. **Save Changes**

4. **Login as Parent**

5. **Check Next Tuesday:**
   - Expected: "No available slots for this date"

6. **Check Next Wednesday:**
   - Expected: Only slots from 10:00 AM - 3:00 PM shown
   - 3:00 PM - 6:00 PM no longer available

### Step 19: Test Mobile Responsive (3 minutes)

1. **Open TutorNest on Mobile Device** or resize browser to mobile size

2. **Navigate Through Booking Flow:**
   - Search tutor ✓
   - View profile ✓
   - Open booking calendar ✓
   - Select date ✓
   - View slots ✓
   - Confirm booking ✓

3. **Verify:**
   - Calendar picker works on mobile
   - Slots list is scrollable
   - Confirmation dialog fits screen
   - All buttons are tappable

### Step 20: Test Google Calendar Disconnection (2 minutes)

1. **Login as Parent**

2. **Navigate to Settings → Google Calendar**

3. **Click "Disconnect Google Calendar"**
   - Confirm disconnection

4. **Verify:**
   - Status shows "Not Connected"
   - Previous events remain in Google Calendar
   - New bookings won't sync to calendar

5. **Book One More Session**
   - Booking works normally
   - Check Google Calendar: NO new event created
   - **Proves disconnection works properly**

✅ **Scenario 4 Complete!** All advanced features work correctly!

---

## Final Verification Checklist

Go through this quick checklist to ensure everything works:

### Core Booking Features
- [ ] Tutor can set weekly availability
- [ ] Parent can view tutor profile
- [ ] Parent can see available time slots
- [ ] Slots are generated in 1-hour increments
- [ ] Past dates are disabled
- [ ] Booking confirmation works
- [ ] Double-booking is prevented
- [ ] Both parties see the booking

### Google Calendar Integration
- [ ] Tutor can connect Google Calendar
- [ ] Parent can connect Google Calendar
- [ ] Connection status displays correctly
- [ ] Google Calendar events block TutorNest slots
- [ ] TutorNest bookings create Google Calendar events
- [ ] Events include correct details
- [ ] Google Meet links are generated
- [ ] Same Meet link for both parties
- [ ] Disconnection works properly

### User Experience
- [ ] Loading spinners appear during operations
- [ ] Success messages display
- [ ] Error messages are clear
- [ ] Mobile responsive
- [ ] Intuitive navigation
- [ ] Professional appearance

### Edge Cases
- [ ] No availability = no slots shown
- [ ] Conflicting times blocked properly
- [ ] Multiple bookings handled correctly
- [ ] Timezone handled properly (Europe/London)

---

## Common Issues & Solutions

### Issue: "Failed to fetch available slots"
**Solution:** 
- Check tutor has set availability for that day
- Verify network connection
- Check browser console for errors

### Issue: Google Calendar not blocking slots
**Solution:**
- Verify tutor's Google Calendar is connected
- Check "Connected" status shows
- Wait a few seconds and refresh
- Verify event exists in Google Calendar

### Issue: No Meet link in calendar event
**Solution:**
- Event was created before enhancement
- Delete old event and create new booking
- New bookings will have Meet links

### Issue: Wrong timezone
**Solution:**
- Default is Europe/London
- Verify in TutorAvailabilityManager
- Check Google Calendar timezone settings

---

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time | Acceptable Time |
|-----------|--------------|-----------------|
| Load available slots | < 1 second | < 2 seconds |
| Create booking | < 2 seconds | < 5 seconds |
| Create calendar event | < 3 seconds | < 10 seconds |
| Check calendar status | < 1 second | < 2 seconds |

---

## Next Steps After Testing

Once testing is complete:

1. **Document any bugs found**
2. **Note user experience improvements**
3. **Consider additional features:**
   - Recurring bookings
   - Session packages
   - Automatic reminders
   - Rescheduling functionality
   - Cancellation with calendar update

4. **Production readiness:**
   - Set up production Google OAuth credentials
   - Configure email notifications
   - Set up payment gateway
   - Configure proper domain redirects

---

## Questions to Consider

After testing, think about:

- Does the booking flow feel intuitive?
- Are there too many or too few steps?
- Is the calendar picker easy to use?
- Are time slots clearly displayed?
- Is the Google Calendar benefit clear to users?
- Would you use this system yourself?

---

## Support

If you encounter issues during testing:

1. Check browser console for error messages
2. Verify API routes are responding
3. Check Supabase logs for backend errors
4. Review the comprehensive guide: `/docs/GOOGLE_CALENDAR_BOOKING_GUIDE.md`

---

**Happy Testing! 🎉**

You now have a fully functional booking system with Google Calendar integration that prevents double-booking and provides a professional user experience!
