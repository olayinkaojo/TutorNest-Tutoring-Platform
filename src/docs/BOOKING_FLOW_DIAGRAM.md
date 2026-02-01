# 📊 TutorNest Booking Flow - Visual Diagram

## Complete Booking System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TUTORNEST BOOKING SYSTEM                     │
│                    with Google Calendar Integration                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                           ┌─────────────────────┐
│   TUTOR SETUP       │                           │   PARENT/STUDENT    │
└─────────────────────┘                           └─────────────────────┘
         │                                                    │
         │ 1. Set Weekly Availability                       │
         ├─────────────────────────────┐                    │
         │                             │                    │
         │  Monday:    9am - 12pm      │                    │
         │             2pm - 5pm       │                    │
         │  Wednesday: 9am - 12pm      │                    │
         │             2pm - 6pm       │                    │
         │  Friday:    9am - 3pm       │                    │
         │                             │                    │
         └─────────────────────────────┘                    │
         │                                                  │
         │ 2. Connect Google Calendar (Optional)            │
         ├──────────────────────────────────┐              │
         │                                  │              │
    ┌────▼─────┐                      ┌────▼────────┐     │
    │  OAuth   │                      │   Google    │     │
    │  Flow    │◄────────────────────►│  Calendar   │     │
    └──────────┘                      └─────────────┘     │
         │                                  │              │
         │ ✓ Connected                      │              │
         │                                  │              │
         └──────────────────────────────────┘              │
                                                           │
                                                           │
┌──────────────────────────────────────────────────────────▼──────┐
│                    AVAILABILITY CALCULATION                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐         ┌────▼────┐         ┌────▼──────┐
    │ TutorNest│         │ Google  │         │  Existing │
    │ Schedule │         │Calendar │         │  Bookings │
    │          │         │  Events │         │           │
    │ Mon 9-5  │    ∩    │ 2-3pm   │    -    │ 10-11am   │
    │ Wed 9-6  │         │ blocked │         │  booked   │
    │ Fri 9-3  │         │         │         │           │
    └──────────┘         └─────────┘         └───────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ AVAILABLE SLOTS │
                    ├─────────────────┤
                    │ ✓ 9am - 10am   │
                    │ ✗ 10am - 11am  │ ← TutorNest booking
                    │ ✓ 11am - 12pm  │
                    │ ✓ 12pm - 1pm   │
                    │ ✗ 2pm - 3pm    │ ← Google Calendar
                    │ ✓ 3pm - 4pm    │
                    │ ✓ 4pm - 5pm    │
                    └─────────────────┘
                              │
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                      BOOKING PROCESS                          │
└───────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐         ┌────▼────┐         ┌────▼──────┐
    │  Parent  │         │  Select │         │  Confirm  │
    │  Selects │────────►│   Time  │────────►│  Booking  │
    │   Date   │         │   Slot  │         │           │
    └──────────┘         └─────────┘         └───────────┘
                                                    │
                                                    │
                              ┌─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Create Booking    │
                    │  in TutorNest DB   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Google Calendar?   │
                    │   Connected?       │
                    └─────────┬──────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
               ┌────▼─────┐         ┌────▼─────┐
               │   YES    │         │    NO    │
               └────┬─────┘         └────┬─────┘
                    │                    │
    ┌───────────────▼───────────────┐    │
    │ Create Calendar Events        │    │
    ├───────────────────────────────┤    │
    │                               │    │
    │  Tutor's Calendar:           │    │
    │  ┌─────────────────────────┐ │    │
    │  │ Tutoring Session with   │ │    │
    │  │ Emma Wilson             │ │    │
    │  │                         │ │    │
    │  │ 3:00 PM - 4:00 PM      │ │    │
    │  │ £45.00                  │ │    │
    │  │                         │ │    │
    │  │ 🎥 Google Meet Link    │ │    │
    │  │ 👥 Attendees: Parent   │ │    │
    │  └─────────────────────────┘ │    │
    │                               │    │
    │  Parent's Calendar:          │    │
    │  ┌─────────────────────────┐ │    │
    │  │ Tutoring Session with   │ │    │
    │  │ Sarah Mathematics       │ │    │
    │  │                         │ │    │
    │  │ 3:00 PM - 4:00 PM      │ │    │
    │  │ For: Emma Wilson        │ │    │
    │  │                         │ │    │
    │  │ 🎥 Same Meet Link      │ │    │
    │  │ 👥 Attendees: Tutor    │ │    │
    │  └─────────────────────────┘ │    │
    └───────────────────────────────┘    │
                    │                    │
                    └────────┬───────────┘
                             │
                    ┌────────▼──────────┐
                    │  ✅ Booking       │
                    │     Confirmed     │
                    │                   │
                    │  - Saved in DB    │
                    │  - Calendar synced│
                    │  - Meet link ready│
                    │  - Both notified  │
                    └───────────────────┘
```

---

## Key Features Flow

### Feature 1: Availability Blocking

```
Tutor has Google Calendar event → Backend checks calendar → Slot marked unavailable → Parent cannot book
```

**Example:**
```
Tutor's Google Calendar:
┌─────────────────────────┐
│ 2:00 PM - 3:00 PM      │
│ Doctor Appointment      │
└─────────────────────────┘
              ↓
TutorNest Availability:
┌─────────────────────────┐
│ 2:00 PM - 3:00 PM      │
│ [⊗ Booked]             │ ← Automatically blocked
└─────────────────────────┘
```

---

### Feature 2: Automatic Event Creation

```
Booking confirmed → Create events for both parties → Generate Meet link → Store event IDs
```

**Result:**
```
Tutor's Calendar              Parent's Calendar
┌──────────────┐             ┌──────────────┐
│  Session     │ ──Same──►   │  Session     │
│  Meet Link   │   Link      │  Meet Link   │
└──────────────┘             └──────────────┘
```

---

### Feature 3: Double-Booking Prevention

```
Parent A books 10am → Slot marked booked → Parent B sees 10am as unavailable → Cannot book same time
```

**Timeline:**
```
10:00 AM Slot

Before booking:
[✓ Available] ← Parent A can book
[✓ Available] ← Parent B can book

After Parent A books:
[⊗ Booked] ← Parent A's booking
[⊗ Booked] ← Parent B sees as unavailable (ATOMIC LOCK)
```

---

## Data Flow

### Backend Process

```
┌─────────────────────────────────────────────────────────────┐
│                    AVAILABILITY ENDPOINT                     │
│         GET /availability/:tutorId/slots?date=YYYY-MM-DD    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐   ┌─────▼─────┐  ┌─────▼─────┐
        │  Get      │   │  Get      │  │  Get      │
        │  Tutor    │   │ Google    │  │ Existing  │
        │ Schedule  │   │ Calendar  │  │ Bookings  │
        └───────────┘   └───────────┘  └───────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Generate Time Slots│
                    │ (1-hour increments)│
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Check Each Slot: │
                    │                    │
                    │ - In TutorNest DB? │
                    │ - In Google Cal?   │
                    │                    │
                    │ Mark available/not │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Return Slot Array  │
                    │ [{date, start, end,│
                    │   available: bool}]│
                    └────────────────────┘
```

### Booking Creation Process

```
┌─────────────────────────────────────────────────────────────┐
│                    BOOKING ENDPOINT                          │
│            POST /bookings/create                             │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ 1. Atomic Check    │
                    │    - Verify slot   │
                    │      still free    │
                    │    - Lock if free  │
                    └─────────┬──────────┘
                              │
                              ├─ If taken → Return error 409
                              │
                    ┌─────────▼──────────┐
                    │ 2. Create Booking  │
                    │    - Generate ID   │
                    │    - Save to DB    │
                    │    - Status: confirmed│
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ 3. Check Calendar  │
                    │    Connections     │
                    └─────────┬──────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
            ┌───────▼────────┐   ┌───────▼────────┐
            │ Tutor Connected?│   │Parent Connected?│
            └───────┬────────┘   └───────┬────────┘
                    │                    │
                    ├─ Yes → Create event
                    │         with Meet
                    │                    │
                    └────────┬───────────┘
                             │
                   ┌─────────▼──────────┐
                   │ 4. Create Google   │
                   │    Calendar Events │
                   │                    │
                   │ - Generate Meet    │
                   │ - Add attendees    │
                   │ - Store event IDs  │
                   └─────────┬──────────┘
                             │
                   ┌─────────▼──────────┐
                   │ 5. Return Success  │
                   │    - Booking ID    │
                   │    - Meet link     │
                   │    - Confirmation  │
                   └────────────────────┘
```

---

## UI Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│                  BOOKING CALENDAR UI                      │
└──────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────▼─────┐   ┌─────▼─────┐  ┌─────▼─────┐
  │ Calendar  │   │   Slots   │  │  Confirm  │
  │  Picker   │   │   List    │  │  Dialog   │
  └───────────┘   └───────────┘  └───────────┘
        │               │               │
        │ Select date   │ Select slot   │ Confirm
        │               │               │
        ├──────────────►│               │
        │               ├──────────────►│
        │               │               │
        │               │               ▼
        │               │         ┌──────────┐
        │               │         │  Create  │
        │               │         │  Booking │
        │               │         └──────────┘
        │               │               │
        │               │               ▼
        │               │         ┌──────────┐
        │               │         │ Success! │
        │               │         │  Show    │
        │               │         │ Message  │
        │               │         └──────────┘
        │               │               │
        │               │◄──────────────┤
        │               │  Refresh slots
        │               │
```

---

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────┐
│                   ERROR SCENARIOS                         │
└──────────────────────────────────────────────────────────┘

1. Slot Already Booked (Race Condition)
   ┌────────────┐
   │ User A     │
   │ books 10am │
   └──────┬─────┘
          │
   ┌──────▼─────┐
   │ Atomic     │
   │ Lock       │
   └──────┬─────┘
          │ ✓ Available
   ┌──────▼─────┐      ┌────────────┐
   │ Book       │      │ User B     │
   │ Confirmed  │      │ tries 10am │
   └────────────┘      └──────┬─────┘
                              │
                       ┌──────▼─────┐
                       │ Atomic     │
                       │ Check      │
                       └──────┬─────┘
                              │ ✗ Taken
                       ┌──────▼─────┐
                       │ Error 409  │
                       │ "Already   │
                       │  booked"   │
                       └────────────┘

2. Google Calendar Token Expired
   ┌──────────────┐
   │ Create Event │
   └──────┬───────┘
          │
   ┌──────▼───────┐
   │ Check Token  │
   └──────┬───────┘
          │ ✗ Expired
   ┌──────▼───────┐
   │ Refresh      │
   │ Token        │
   └──────┬───────┘
          │ ✓ New Token
   ┌──────▼───────┐
   │ Retry Create │
   └──────────────┘

3. Network Error
   ┌──────────────┐
   │ API Request  │
   └──────┬───────┘
          │ ✗ Network Error
   ┌──────▼───────┐
   │ Show Error   │
   │ "Try again"  │
   └──────┬───────┘
          │
   ┌──────▼───────┐
   │ Retry Button │
   └──────────────┘
```

---

## Performance Considerations

```
┌──────────────────────────────────────────────────────────┐
│                  PERFORMANCE METRICS                      │
└──────────────────────────────────────────────────────────┘

Load Availability Slots:
┌────────────────┐
│ Frontend       │ ← 1-2 seconds
│ Fetch request  │
└───────┬────────┘
        │
┌───────▼────────┐
│ Backend        │ ← < 1 second
│ - Get schedule │
│ - Get calendar │
│ - Check bookings│
│ - Generate slots│
└───────┬────────┘
        │
┌───────▼────────┐
│ Return to UI   │ ← Instant
└────────────────┘

Total: ~1-2 seconds ✅

Create Booking:
┌────────────────┐
│ Submit booking │
└───────┬────────┘
        │
┌───────▼────────┐
│ Save to DB     │ ← < 1 second
└───────┬────────┘
        │
┌───────▼────────┐
│ Create Google  │ ← 1-3 seconds
│ Calendar events│ (non-blocking)
└───────┬────────┘
        │
┌───────▼────────┐
│ Return success │ ← Instant
└────────────────┘

Total: ~2-3 seconds ✅
```

---

## Security Flow

```
┌──────────────────────────────────────────────────────────┐
│                   SECURITY MEASURES                       │
└──────────────────────────────────────────────────────────┘

Authentication:
┌────────────┐     ┌────────────┐     ┌────────────┐
│ User Login │────►│ Supabase   │────►│ JWT Token  │
│            │     │ Auth       │     │ Generated  │
└────────────┘     └────────────┘     └─────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │ All requests│
                                      │ include     │
                                      │ Bearer token│
                                      └─────────────┘

Authorization:
┌────────────┐     ┌────────────┐     ┌────────────┐
│ API Request│────►│ Verify     │────►│ Check Role │
│            │     │ Token      │     │ Permission │
└────────────┘     └────────────┘     └─────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │ Process     │
                                      │ Request     │
                                      └─────────────┘

Google OAuth:
┌────────────┐     ┌────────────┐     ┌────────────┐
│ Connect    │────►│ Google     │────►│ OAuth Code │
│ Calendar   │     │ OAuth 2.0  │     │ Exchange   │
└────────────┘     └────────────┘     └─────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │ Store token │
                                      │ encrypted   │
                                      └─────────────┘
```

---

## Summary

This comprehensive booking system provides:

✅ **Smart availability** with Google Calendar blocking
✅ **Automatic event creation** with Meet links
✅ **Double-booking prevention** with atomic locks
✅ **Professional UX** with clear feedback
✅ **Security** with JWT and OAuth 2.0
✅ **Performance** with optimized queries
✅ **Reliability** with error handling

**Total development time saved:** Weeks of work automated through this implementation!
