# Google Calendar Integration & Booking System Guide

## Overview

TutorNest features a comprehensive booking system with Google Calendar integration that enables:
- **Automatic availability blocking** from tutor's Google Calendar
- **Automatic event creation** when sessions are booked
- **Google Meet links** for virtual classroom sessions
- **Bidirectional sync** between TutorNest and Google Calendar

---

## How It Works

### 1. **Tutor Setup**

#### Step 1: Set Weekly Availability
Tutors first set their recurring weekly availability in TutorNest:
- Navigate to **Tutor Dashboard → Availability**
- Enable days of the week they're available
- Add time slots in 15-minute increments
- Save availability schedule

#### Step 2: Connect Google Calendar (Optional but Recommended)
- Navigate to **Tutor Dashboard → Settings → Google Calendar**
- Click **"Connect Google Calendar"**
- Authorize TutorNest to access your calendar
- Once connected, TutorNest will:
  - Block times when you have existing Google Calendar events
  - Automatically add booked TutorNest sessions to your calendar
  - Create Google Meet links for each session

### 2. **How Availability Blocking Works**

When a parent/student views available time slots:

**Without Google Calendar:**
- Shows slots based only on tutor's TutorNest availability
- Only blocks times already booked through TutorNest

**With Google Calendar Connected:**
- Shows slots based on tutor's TutorNest availability
- **Automatically blocks** times when tutor has other Google Calendar events
- Prevents double-booking across platforms
- Real-time sync ensures accuracy

**Example:**
- Tutor sets availability: Monday 9:00 AM - 5:00 PM
- Tutor has a doctor's appointment in Google Calendar: Monday 2:00 PM - 3:00 PM
- Parents will see availability from 9:00 AM - 2:00 PM and 3:00 PM - 5:00 PM
- The 2:00 PM - 3:00 PM slot is automatically blocked

### 3. **Booking Flow**

#### For Parents:
1. **Search for tutors** and select a tutor
2. **View tutor's availability** on the booking calendar
3. **Select a date** - calendar shows available slots considering:
   - Tutor's set weekly availability
   - Existing TutorNest bookings
   - Tutor's Google Calendar events (if connected)
4. **Select a time slot** - only available slots are clickable
5. **Review booking details** including price
6. **Confirm and pay**

#### After Booking Confirmation:
- Booking is saved in TutorNest database
- If parent has Google Calendar connected:
  - Event automatically created in parent's calendar
  - Includes session details and Meet link
- If tutor has Google Calendar connected:
  - Event automatically created in tutor's calendar
  - Includes student details and Meet link
- Both receive email confirmations (when email is configured)

### 4. **Google Calendar Event Details**

Events created include:
- **Summary:** "Tutoring Session with [Name]"
- **Description:** Session details, subject, price
- **Time:** Exact session start and end time
- **Location:** "TutorNest Virtual Classroom"
- **Attendees:** Tutor and parent/student emails
- **Google Meet Link:** Automatic video conferencing link
- **Reminders:**
  - Email reminder: 24 hours before
  - Popup reminder: 30 minutes before

### 5. **Technical Implementation**

#### Backend Routes:

**Availability Check with Google Calendar Blocking:**
```
GET /availability/:tutorId/slots?date=YYYY-MM-DD
```
- Fetches tutor's weekly schedule for that day
- Retrieves tutor's Google Calendar events for that date
- Generates 1-hour slots
- Marks slots as unavailable if:
  - Already booked in TutorNest
  - Conflicts with Google Calendar events

**Create Booking with Calendar Sync:**
```
POST /bookings/create
Body: { tutorId, studentId, date, startTime, endTime, price }
```
- Validates slot availability (atomic check)
- Creates booking in TutorNest
- Creates Google Calendar events for both parties (if connected)
- Generates Google Meet link
- Returns booking confirmation

**Google Calendar Connection:**
```
GET /google-calendar/auth-url
POST /google-calendar/exchange-token
GET /google-calendar/status
POST /google-calendar/disconnect
```

#### Frontend Components:

- **BookingCalendar.tsx:** Main booking interface with calendar and slot selection
- **TutorAvailabilityManager.tsx:** Tutor's weekly schedule management
- **GoogleCalendarSetup.tsx:** OAuth connection flow and status display

---

## User Benefits

### For Tutors:
✅ Prevents double-booking automatically
✅ All sessions in one calendar (Google + TutorNest)
✅ Google Meet links created automatically
✅ Email and popup reminders before sessions
✅ No manual calendar management needed

### For Parents/Students:
✅ See only truly available time slots
✅ Sessions automatically added to their calendar
✅ Google Meet links for easy joining
✅ Reminders ensure no missed sessions
✅ Professional booking experience

---

## Configuration Requirements

### Google OAuth Setup:

To enable Google Calendar integration, configure these environment variables:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/google-callback
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI
6. Copy Client ID and Client Secret
7. Set environment variables in Supabase

### Required OAuth Scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

---

## Future Enhancements

Potential improvements to consider:
- **Webhook sync:** Real-time updates when Google Calendar changes
- **Multiple calendars:** Support for checking multiple Google calendars
- **Recurring sessions:** Automatically book weekly recurring sessions
- **Cancellation sync:** Cancel Google Calendar event when booking cancelled
- **Reschedule sync:** Update Google Calendar event when booking rescheduled
- **Calendar selection:** Allow users to choose which calendar to use

---

## Testing the Integration

### Test Scenario 1: Basic Booking Without Google Calendar
1. Tutor sets availability for tomorrow
2. Parent books a session
3. ✓ Booking appears in TutorNest for both parties

### Test Scenario 2: Booking With Google Calendar
1. Tutor connects Google Calendar
2. Tutor sets availability for tomorrow
3. Parent connects Google Calendar
4. Parent books a session
5. ✓ Event appears in both calendars with Meet link

### Test Scenario 3: Availability Blocking
1. Tutor connects Google Calendar
2. Tutor adds personal event in Google Calendar for tomorrow 2-3 PM
3. Tutor sets TutorNest availability tomorrow 9 AM - 5 PM
4. Parent views availability
5. ✓ 2-3 PM slot is blocked/unavailable

### Test Scenario 4: Conflict Prevention
1. Parent A books tutor for tomorrow 10 AM
2. Parent B tries to book same tutor, same time
3. ✓ Slot shows as unavailable for Parent B

---

## Troubleshooting

### Issue: "Google Calendar not connected or token expired"
**Solution:** Reconnect Google Calendar in Settings

### Issue: Slots showing as available but booking fails
**Solution:** Likely a race condition - refresh the page and try again

### Issue: Google Calendar event not created
**Solution:** Check:
- OAuth credentials are configured
- User has valid Google Calendar connection
- User granted necessary permissions

### Issue: Wrong timezone in calendar
**Solution:** Verify timezone setting in TutorAvailabilityManager (default: Europe/London)

---

## Security & Privacy

- OAuth tokens are encrypted and stored securely in the KV store
- Tokens are automatically refreshed when needed
- Users can disconnect Google Calendar at any time
- Only calendar events related to TutorNest sessions are created
- User email addresses are only shared with session participants
- Full compliance with Google's OAuth policies

---

## Summary

The Google Calendar integration transforms TutorNest from a simple booking platform into a professional scheduling solution that seamlessly integrates with users' existing workflows, prevents double-booking, and provides a superior user experience through automated calendar management and video conferencing links.
