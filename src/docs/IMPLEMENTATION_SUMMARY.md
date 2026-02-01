# Child Profile Implementation Summary

## Quick Answer to Your Question

### Are children visible in Admin dashboard?
**YES** ✅ - Children SHOULD be visible in the admin dashboard.

### How do children access the app?
**Through parent login with profile switching** - Children DO NOT have separate login credentials.

---

## What We've Implemented

### 1. Admin Dashboard Component
**File:** `/components/admin/ChildProfileManagement.tsx`

**Features:**
- View all child profiles across the platform
- Search by child name or parent name
- Filter by status (active/inactive)
- See parent-child relationships
- View session statistics per child
- Monitor subscription tier compliance
- Identify parents at their child limit

**Why it's important:**
- Support tickets need to know which child is involved
- Moderation and safeguarding require visibility
- Analytics need to track actual student usage
- DSAR (data subject access requests) require admin access

### 2. Parent Profile Switcher Component
**File:** `/components/parent/ChildProfileSwitcher.tsx`

**Features:**
- Dropdown showing all parent's children
- Click to switch active profile
- Display each child's upcoming sessions and progress
- "Add Another Child" button (if under subscription limit)
- Visual indication of active child
- Shows subscription tier limit status

**User Experience:**
```
Parent logs in → Sees "Active Profile: Emma Smith ▼"
Clicks dropdown → Shows all children + stats
Selects child → Dashboard updates to show that child's data
Books session → Automatically books for active child
```

### 3. Architecture Documentation
**File:** `/docs/CHILD_PROFILE_ARCHITECTURE.md`

**Covers:**
- Why children don't have separate logins (COPPA/GDPR compliance)
- Database schema for child profiles
- Subscription tier enforcement (1, 2, or 4 children)
- API endpoints for parents and admins
- Security and privacy considerations
- Migration path if you already have child users
- Complete testing checklist

---

## Key Architectural Decisions

### ✅ Children DO NOT Have Login Credentials

**Reasons:**
1. **COPPA Compliance:** US law requires parental consent for children under 13
2. **GDPR/PECR Compliance:** UK/EU law requires parental consent for children under 13
3. **Safeguarding:** Parents maintain full oversight of all interactions
4. **Security:** No child passwords to manage or potentially compromise
5. **Simpler UX:** One family account for the entire household

### ✅ Children ARE Visible in Admin Dashboard

**Reasons:**
1. **Support:** "Which child is this ticket about?"
2. **Moderation:** Track interactions and sessions per child
3. **Analytics:** Understand platform usage by actual students
4. **Compliance:** Required for GDPR, safeguarding, and data protection
5. **Reporting:** Session quality and tutor performance per child

### ✅ Profile Switching for Access

**How it works:**
1. Parent has ONE login (their email/password)
2. Parent adds children (up to subscription limit)
3. Parent switches between child profiles in dashboard
4. Dashboard shows active child's sessions, progress, tutors
5. All bookings/actions are for the active child
6. Parent can switch to another child anytime

---

## Database Schema (Key Tables)

### Child Profiles Table
```sql
child_profiles
├── id (UUID, primary key)
├── parent_id (references users.id)
├── first_name
├── last_name
├── date_of_birth
├── age (computed)
├── year_group
├── learning_preferences (JSONB)
├── status (active/inactive)
└── created_at
```

### Sessions Table (Updated)
```sql
sessions
├── id (UUID, primary key)
├── child_id (references child_profiles.id) ← Links to child, not parent
├── parent_id (references users.id) ← For billing/communication
├── tutor_id (references users.id)
├── scheduled_time
└── status
```

---

## Subscription Tier Enforcement

### Limits by Tier
- **Basic (£29.99/mo):** 1 child maximum
- **Standard (£59.99/mo):** 2 children maximum
- **Premium (£99.99/mo):** 4 children maximum

### Backend Validation
When parent tries to add a child:
1. Check their current subscription tier
2. Count existing children for this parent
3. If at limit → Show error: "Upgrade to add more children"
4. If under limit → Allow child profile creation

**Example:**
```typescript
// Parent on Standard tier (limit: 2 children)
// Already has 2 children
// Tries to add 3rd child → ❌ BLOCKED

"You have reached your limit of 2 children for the Standard tier.
Upgrade to Premium to add up to 4 children."
```

---

## User Flows

### Parent Adding a Child

1. Parent logs in to their account
2. Goes to "Family" or "Children" section
3. Clicks "Add Child"
4. Fills in child details:
   - First name
   - Last name
   - Date of birth
   - Year group
   - Learning preferences (optional)
   - Special educational needs (optional)
5. System validates subscription limit
6. Child profile created
7. Parent can now switch to this child

### Parent Booking a Session

1. Parent logs in
2. Selects child from profile switcher (e.g., "Emma")
3. Browses available tutors
4. Finds tutor for Maths
5. Clicks "Book Session"
6. Selects date/time
7. Confirms booking
8. **Session is created with:**
   - `child_id`: Emma's ID
   - `parent_id`: Parent's ID
   - `tutor_id`: Selected tutor's ID

### Tutor Teaching a Session

1. Tutor logs in
2. Sees upcoming session:
   ```
   Mathematics • Monday 3:00 PM
   Student: Emma Smith (Age 8, Year 3)
   Parent: John Smith
   Learning Preferences: Visual learner, Dyslexia support
   ```
3. Tutor prepares age-appropriate materials
4. Conducts session
5. Adds session notes for Emma specifically
6. Emma's progress is tracked separately from siblings

### Admin Supporting a Parent

1. Admin receives support ticket:
   ```
   "My daughter's session didn't start on time"
   ```
2. Admin searches for parent email
3. Sees parent has 2 children: Emma (8) and Oliver (10)
4. Checks recent sessions for both children
5. Identifies issue with Emma's Maths session
6. Contacts tutor and resolves
7. Updates ticket with resolution

---

## What Gets Displayed Where

### Parent Dashboard (When Logged In)
```
┌─────────────────────────────────────┐
│ Active Profile: Emma Smith ▼        │
│ Age 8 • Year 3                      │
│                                     │
│ Upcoming Sessions (2)               │
│ ├─ Maths with Ms. Johnson - Mon    │
│ └─ English with Mr. Brown - Wed    │
│                                     │
│ Recent Progress                     │
│ ├─ Maths: 75% ↑                    │
│ └─ English: 82% ↑                  │
│                                     │
│ Current Tutors (2)                  │
│ ├─ Ms. Johnson (Mathematics)        │
│ └─ Mr. Brown (English)             │
└─────────────────────────────────────┘
```

### Admin Dashboard (Child Profiles View)
```
┌─────────────────────────────────────┐
│ Child Profiles (156)                │
│ [Search: ___________] [Filter: All]│
│                                     │
│ Emma Smith (Age 8)        [Active] │
│ Parent: John Smith                  │
│ Sessions: 2 upcoming, 15 completed  │
│ Tutors: Ms. Johnson, Mr. Brown      │
│                                     │
│ Oliver Smith (Age 10)     [Active] │
│ Parent: John Smith                  │
│ Sessions: 1 upcoming, 22 completed  │
│ Tutors: Dr. Williams                │
└─────────────────────────────────────┘
```

### Tutor Dashboard (Upcoming Session)
```
┌─────────────────────────────────────┐
│ Mathematics Session                 │
│ Monday, 3:00 PM - 4:00 PM          │
│                                     │
│ Student Information:                │
│ Emma Smith (Age 8, Year 3)         │
│                                     │
│ Parent: John Smith                  │
│ Contact: john.smith@email.com       │
│                                     │
│ Learning Profile:                   │
│ • Visual learner                    │
│ • Dyslexia support needed          │
│ • Prefers step-by-step              │
│                                     │
│ Previous Sessions: 15               │
│ Current Progress: 75%               │
└─────────────────────────────────────┘
```

---

## Security & Privacy

### What Each Role Can See

**Parents:**
- ✅ All data for their own children only
- ✅ Messages between their children and tutors
- ✅ Session reports and progress for their children
- ❌ Cannot see other families' children
- ❌ Cannot see other children's data

**Tutors:**
- ✅ Profile info for children they teach
- ✅ Learning preferences and SEN needs
- ✅ Session history for their sessions only
- ❌ Cannot see children they don't teach
- ❌ Cannot see other tutors' session notes
- ❌ Cannot see parent payment information

**Admins:**
- ✅ All child profiles (for support and moderation)
- ✅ Parent-child relationships
- ✅ Session statistics across platform
- ✅ Access necessary for platform operation
- ⚠️ Access is logged and audited

### Data Protection (GDPR)

**Data Subject Access Request (DSAR):**
Parent can request export of their child's data:
- Child profile information
- All sessions (past and upcoming)
- Session notes and progress reports
- Messages with tutors
- Learning preferences and SEN information

**Right to Erasure:**
Parent can delete child profile:
- Child profile deleted
- Sessions cancelled (with tutor notification)
- Historical data retained 30 days for disputes
- After 30 days: permanent deletion

**Data Minimization:**
Only collect necessary child data:
- ✅ Name, age, year group (essential)
- ✅ Learning preferences (improves service)
- ✅ SEN needs (safeguarding)
- ❌ No behavioral tracking for ads
- ❌ No direct marketing to children

---

## Next Steps for Implementation

### 1. Database Setup
- [ ] Create `child_profiles` table
- [ ] Add `child_id` to `sessions` table
- [ ] Create indexes for performance
- [ ] Set up foreign key constraints

### 2. Backend API
- [ ] `GET /api/parent/children` - List parent's children
- [ ] `POST /api/parent/children` - Add child (with limit check)
- [ ] `PUT /api/parent/children/:id` - Update child profile
- [ ] `DELETE /api/parent/children/:id` - Delete child profile
- [ ] `GET /admin/child-profiles` - List all children (admin)
- [ ] Update session creation to require `child_id`

### 3. Frontend Components
- [ ] Integrate `ChildProfileSwitcher` in parent dashboard
- [ ] Integrate `ChildProfileManagement` in admin dashboard
- [ ] Update session booking flow to use active child
- [ ] Update tutor session view to show child info
- [ ] Add "Add Child" form for parents

### 4. Subscription Enforcement
- [ ] Check child limit on profile creation
- [ ] Show upgrade prompt when at limit
- [ ] Update subscription change flow (what happens to excess children?)

### 5. Testing
- [ ] Test parent can add/edit/delete children
- [ ] Test subscription limits enforced
- [ ] Test profile switching updates dashboard
- [ ] Test sessions linked to correct child
- [ ] Test admin can see all children
- [ ] Test DSAR export includes child data

---

## Common Questions

**Q: Can children log in themselves?**
**A:** No. This is intentional for safety and compliance. Children access the platform through their parent's account.

**Q: Are children counted as separate users in analytics?**
**A:** Yes and no. They're counted as student profiles (not user accounts) but tracked separately for session/progress analytics.

**Q: What happens if a parent downgrades from Premium (4 children) to Standard (2 children)?**
**A:** System should prevent downgrade if they have >2 children, OR allow it but set 2 children as "inactive" (parent chooses which).

**Q: Can a child have multiple parents (divorced/separated)?**
**A:** Future feature. Currently one parent owns the profile, but could add "Authorized Users" who can also manage.

**Q: What age should we switch from child profile to full user account?**
**A:** Recommend 13 (COPPA age). Build a "Graduate to User Account" feature for 13th birthday.

**Q: How do referral rewards work with multiple children?**
**A:** Reward goes to parent account. Parent refers another parent → parent gets £25 credit applied to their subscription.

---

## Summary

### ✅ What We Built

1. **Admin component** to view all child profiles
2. **Parent component** to switch between children
3. **Architecture documentation** explaining the design
4. **Database schema** for child profiles
5. **Security model** with role-based access

### ✅ How It Works

- Parents log in (one account per family)
- Parents add children (up to subscription limit)
- Parents switch between child profiles
- All actions (booking, viewing) are for active child
- Admins see all children for support
- Tutors see children they teach

### ✅ Why This Design

- **Legal compliance** (COPPA/GDPR)
- **Child safety** (parental oversight)
- **Clear student identity** (tutors know who they're teaching)
- **Platform visibility** (admins can support effectively)
- **Scalable subscription** (charge per children count)

---

## Integration Checklist

To integrate this into your TutorNest platform:

- [ ] Add child profile table to database
- [ ] Implement backend API endpoints
- [ ] Add `ChildProfileSwitcher` to parent dashboard header
- [ ] Add `ChildProfileManagement` to admin dashboard
- [ ] Update session booking to use active child ID
- [ ] Update tutor session view to show child details
- [ ] Enforce subscription limits on child creation
- [ ] Test all user flows
- [ ] Update privacy policy to explain child profiles
- [ ] Train support team on new architecture

**Estimated effort:** 2-3 days of development + testing
