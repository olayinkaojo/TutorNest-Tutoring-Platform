# Tutor Dashboard Comprehensive Audit

## Critical Issue Identified: Role-Based Data Isolation Bug

### The Problem

When a user has both **parent** and **tutor** roles, the Tutor Dashboard incorrectly displays **parent-booked sessions** instead of only **tutor-provided sessions**.

**Current Behavior:**
- User books a session as a parent: `bookings` table has `{user_id: userA, tutor_id: tutorB, ...}`
- Same user switches to tutor role
- Dashboard fetches `/bookings?tutorId=userA`
- Gets ALL bookings involving userA in ANY role, including their parent bookings

**Expected Behavior:**
- Tutor Dashboard should ONLY show bookings where `tutor_id = userA` (sessions they're providing)
- Parent bookings (where `user_id = userA`) should NOT appear
- Only show students who booked WITH this tutor, not sessions they booked for their own students

### Root Cause Analysis

**Location:** `/supabase/functions/make-server-cbd74580/db.tsx`, line 154

```typescript
// BUGGY CODE - returns all bookings regardless of role context
export async function getBookingsByUserId(userId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .or(`user_id.eq.${userId},tutor_id.eq.${userId},student_id.eq.${userId}`)
    // ↑ This includes bookings from ALL roles!
}
```

**Location:** `/src/components/TutorDashboard.tsx`, line 279-283

```typescript
// Calls generic endpoint that doesn't filter by tutor role
const bookingsResponse = await fetch(
  `/bookings?tutorId=${tutorId}`, // Passes tutorId but endpoint doesn't use it
  // The endpoint still returns all bookings involving this ID
);
```

**Location:** `/supabase/functions/make-server-cbd74580/booking-routes.tsx`, line 28-33

```typescript
// Endpoint doesn't distinguish between query param meanings
const targetId = c.req.query('studentId') || c.req.query('tutorId') || user.id;
const rawBookings = await db.getBookingsByUserId(targetId);
// ↑ Ignores the semantic meaning of the query parameter
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ TutorDashboard.tsx                                              │
│ fetchDashboardData(accessToken)                                 │
│  └─> tutorId = profile.id                                       │
│  └─> fetch("/bookings?tutorId=tutorId")                         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ booking-routes.tsx: GET /bookings                               │
│  └─> targetId = query.tutorId || query.studentId || user.id    │
│  └─> rawBookings = db.getBookingsByUserId(targetId) ❌ BUG HERE │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ db.tsx: getBookingsByUserId(userId)                             │
│  └─> SELECT * FROM bookings WHERE                              │
│      user_id = userId OR                                        │
│      tutor_id = userId OR                                       │
│      student_id = userId  ❌ RETURNS ALL ROLES                  │
└─────────────────────────────────────────────────────────────────┘
              │
              ↓
         Returns:
    ├─ Bookings as PARENT (user_id = userId) ❌ WRONG
    ├─ Bookings as TUTOR (tutor_id = userId) ✓ CORRECT
    └─ Bookings as STUDENT (student_id = userId) ❌ WRONG
```

## Solution Architecture

### Step 1: Add Role-Specific Database Functions

Create new functions in `db.tsx`:

```typescript
// Returns only bookings where user is the TUTOR (providing tutoring)
export async function getBookingsByTutorId(tutorId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('date', { ascending: true });
  // Returns only sessions they're teaching
}

// Returns only bookings where user is the STUDENT (receiving tutoring)
export async function getBookingsByStudentId(studentId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: true });
  // Returns only sessions they're attending
}
```

### Step 2: Update Booking Routes Endpoint

Modify `/bookings` endpoint in `booking-routes.tsx` to use role-specific queries:

```typescript
app.get('/bookings', async (c) => {
  // ...
  
  // Use semantic query parameters to fetch role-specific data
  if (c.req.query('tutorId')) {
    // Tutor viewing their own teaching sessions
    rawBookings = await db.getBookingsByTutorId(c.req.query('tutorId'));
  } else if (c.req.query('studentId')) {
    // Student viewing their own sessions
    rawBookings = await db.getBookingsByStudentId(c.req.query('studentId'));
  } else {
    // Default: authenticated user's bookings (all roles)
    rawBookings = await db.getBookingsByUserId(user.id);
  }
  
  // ... rest of enrichment logic
});
```

### Step 3: Verify TutorDashboard Query

Ensure TutorDashboard passes correct context:

```typescript
// TutorDashboard.tsx - already correct
const bookingsResponse = await fetch(
  `/bookings?tutorId=${tutorId}`, // ✓ Will now correctly fetch tutor bookings only
  { headers: { 'Authorization': `Bearer ${accessToken}` } }
);
```

## Expected Results After Fix

### Scenario 1: User switches from Parent to Tutor role

**Before Fix:**
```
Parent Dashboard: Shows bookings they booked
  ├─ Math lesson with tutor John (tutorId=john)
  └─ English lesson with tutor Sarah (tutorId=sarah)

Switch to Tutor Role

Tutor Dashboard: INCORRECTLY shows same bookings
  ├─ Math lesson with tutor John ❌ NOT THEIR SESSION
  └─ English lesson with tutor Sarah ❌ NOT THEIR SESSION
  
User sees their own parent bookings, confused about student list
```

**After Fix:**
```
Parent Dashboard: Shows bookings they booked ✓
  ├─ Math lesson with tutor John (tutorId=john)
  └─ English lesson with tutor Sarah (tutorId=sarah)

Switch to Tutor Role

Tutor Dashboard: CORRECTLY shows their tutor sessions
  ├─ Math lesson with student Alice (userId=parent_of_alice)
  └─ Math lesson with student Bob (userId=parent_of_bob)
  
User sees THEIR students, can track teaching activity
```

### Scenario 2: User is active tutor with parent role

**Before Fix:**
```
Has 5 active tutor students, teaches 8 sessions/week
But dashboard shows:
  - 3 of their own parent bookings (where they hired tutors)
  - 5 of their student's bookings (where their kids have tutors)
  - All mixed together, can't tell which are theirs to teach
```

**After Fix:**
```
Tutor Dashboard correctly shows:
  - Only the 8 sessions/week they're TEACHING
  - Only their 5 students they're tutoring
  - Clear view of their tutor schedule and workload
```

## Implementation Status

### Changes Needed

1. **db.tsx** - Add two new functions:
   - [ ] `getBookingsByTutorId(tutorId)` - fetches only tutor bookings
   - [ ] `getBookingsByStudentId(studentId)` - fetches only student bookings

2. **booking-routes.tsx** - Update /bookings endpoint:
   - [ ] Add conditional logic to use role-specific query based on params
   - [ ] Maintain backward compatibility

3. **TutorDashboard.tsx** - Verify:
   - [ ] Already passes `?tutorId=` correctly
   - [ ] No additional changes needed (will work after endpoint fix)

4. **ParentDashboard.tsx** - Verify:
   - [ ] Uses correct query params when needed
   - [ ] No unintended data leakage

### Testing Checklist

After implementing fixes:

- [ ] Create test account with parent + tutor roles
- [ ] As parent: book a session with another tutor
- [ ] Switch to tutor role
- [ ] Verify parent-booked sessions don't appear in tutor dashboard
- [ ] Have another parent book the test account as tutor
- [ ] Verify that booking appears in tutor dashboard
- [ ] Verify tutor can see their student list (parents who booked them)
- [ ] Verify parent can still see their bookings in parent dashboard
- [ ] Test with multiple parent/tutor bookings
- [ ] Test pagination if applicable
- [ ] Test filtering/sorting still works after fix

## Security Implications

**Current State:**
- ⚠️ POTENTIAL DATA LEAK: Users can see bookings they shouldn't
- ⚠️ CONFUSING UX: Mixed data by role creates confusion
- ⚠️ INCORRECT ANALYTICS: Dashboard stats might double-count

**After Fix:**
- ✅ PROPER ISOLATION: Each role only sees relevant bookings
- ✅ CLEAR UX: Users see only their sessions in each role
- ✅ ACCURATE STATS: Tutor sees only their teaching workload

## Performance Considerations

**Database Indexes (Already Present):**
- `bookings_tutor_date` - covers tutor queries
- `bookings_student_date` - covers student queries
- `bookings_user_id` - covers user queries

**After Fix:**
- Tutor queries will use `bookings_tutor_date` with faster single-column equality
- Student queries will use similar indexes
- Reduces query result set size
- **Performance Impact:** POSITIVE - more specific queries = faster

## Related Components That May Need Verification

1. **BookingManager.tsx** - displays bookings, verify it shows correct role context
2. **ParentDashboard.tsx** - ensure parent bookings still load correctly
3. **StudentDashboard.tsx** - verify student bookings not affected
4. **Booking history/analytics** - verify stats not inflated by role confusion

## Deployment Checklist

- [ ] Implement db.tsx new functions
- [ ] Update booking-routes.tsx endpoint
- [ ] Build and test locally
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Manual testing with multi-role account
- [ ] Monitor error logs post-deployment
- [ ] Verify no analytics data corruption
- [ ] Commit with message: "fix: Isolate booking queries by user role"

## Estimated Effort

- Backend changes: ~30 minutes (add 2 DB functions, update 1 endpoint)
- Testing: ~30 minutes (create test scenarios)
- Deployment: ~15 minutes (build, test, deploy)
- **Total: ~1.5 hours**

---

## Next Steps

1. Implement role-specific database functions
2. Update endpoint logic
3. Test thoroughly with multi-role account
4. Deploy and monitor
