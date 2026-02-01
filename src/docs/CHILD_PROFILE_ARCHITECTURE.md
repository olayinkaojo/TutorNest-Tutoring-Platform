# Child Profile Architecture

## Overview

TutorNest implements a **parent-managed child profile system** where children do not have separate login credentials. This architecture prioritizes child safety, COPPA/GDPR compliance, and parental oversight.

## Key Design Decisions

### ✅ Children DO NOT Have Separate Logins

**Why:**
- **COPPA Compliance:** US law requires parental consent for children under 13
- **GDPR/PECR Compliance:** UK/EU law requires parental consent for children under 13
- **Safeguarding:** Parents maintain oversight of all interactions
- **Simpler UX:** One family account, multiple child profiles
- **Security:** Reduces attack surface (no child passwords to manage)

### ✅ Children ARE Visible in Admin Dashboard

**Why:**
- **Support:** Admins need to see which child is involved in support tickets
- **Moderation:** Track sessions and interactions per child
- **Analytics:** Understand platform usage by actual students
- **Compliance:** Full visibility for safeguarding and data protection
- **Reporting:** Session quality and tutor performance per child

### ✅ Access Method: Profile Switching

**How it works:**
1. Parent logs in with their credentials
2. Parent sees "Child Profile Switcher" in dashboard
3. Parent selects which child profile to view/manage
4. Dashboard shows selected child's sessions, progress, etc.
5. Parent books sessions for that specific child
6. Parent can switch to another child anytime

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- 'parent', 'tutor', 'admin', etc.
  -- ... other fields
);
```

### Child Profiles Table
```sql
CREATE TABLE child_profiles (
  id UUID PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  year_group TEXT,
  learning_preferences JSONB,
  status TEXT DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure subscription limits
  CONSTRAINT valid_parent CHECK (
    (SELECT role FROM users WHERE id = parent_id) = 'parent'
  )
);

-- Index for quick parent lookups
CREATE INDEX idx_child_profiles_parent ON child_profiles(parent_id);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  -- Link to child, not parent
  child_id UUID NOT NULL REFERENCES child_profiles(id),
  tutor_id UUID NOT NULL REFERENCES users(id),
  parent_id UUID NOT NULL REFERENCES users(id),
  -- ... other fields
);
```

---

## Subscription Tier Enforcement

### Tier Limits
- **Basic (£29.99/mo):** 1 child
- **Standard (£59.99/mo):** 2 children
- **Premium (£99.99/mo):** 4 children

### Backend Validation
```typescript
// When adding a child
async function addChild(parentId: string, childData: ChildData) {
  // Get parent's subscription
  const subscription = await getSubscription(parentId);
  
  // Get current child count
  const childCount = await db
    .select({ count: sql`count(*)` })
    .from(childProfiles)
    .where(eq(childProfiles.parentId, parentId));
  
  // Check limit
  const limits = { basic: 1, standard: 2, premium: 4 };
  if (childCount >= limits[subscription.tier]) {
    throw new Error(`Child limit reached for ${subscription.tier} tier`);
  }
  
  // Create child profile
  return await db.insert(childProfiles).values({
    parentId,
    ...childData
  });
}
```

---

## Admin Dashboard Visibility

### Child Profile Management Component
Location: `/components/admin/ChildProfileManagement.tsx`

**Features:**
- View all child profiles across platform
- Filter by status (active/inactive)
- Search by child name or parent name
- See parent-child relationships
- View session statistics per child
- Monitor subscription tier compliance
- Track which parents are at their child limit

**Key Information Displayed:**
- Child's full name and age
- Parent's name and email
- Session count (total, completed, upcoming)
- Current tutors
- Learning preferences and SEN needs
- Profile creation date

**Why This Matters:**
- Support tickets: "Which child is this about?"
- Safeguarding: Monitor all child interactions
- Analytics: Usage patterns per age group
- Compliance: GDPR data subject access requests

---

## Parent Dashboard Experience

### Profile Switcher Component
Location: `/components/parent/ChildProfileSwitcher.tsx`

**User Flow:**
1. Parent logs in → sees their dashboard
2. Top of dashboard shows "Active Profile" switcher
3. Click switcher → dropdown shows all their children
4. Select child → dashboard updates to show that child's:
   - Upcoming sessions
   - Completed sessions  
   - Progress reports
   - Current tutors
   - Messages from tutors
5. "Book Session" → automatically books for active child
6. Can switch to another child anytime

**Visual Design:**
```
┌─────────────────────────────────────┐
│ Active Profile: Emma Smith ▼        │
│ Age 8 • Year 3                      │
│ 📅 2 upcoming  ✓ 15 completed       │
└─────────────────────────────────────┘
        ↓ (click to expand)
┌─────────────────────────────────────┐
│ ✓ Emma Smith (Age 8)    [Active]   │
│   2 upcoming • 75% progress         │
├─────────────────────────────────────┤
│   Oliver Smith (Age 10)             │
│   1 upcoming • 82% progress         │
├─────────────────────────────────────┤
│ + Add Another Child                 │
│   (2 of 4 - Premium tier)           │
└─────────────────────────────────────┘
```

---

## Session Booking Flow

### With Child Profiles

**Before (Without Child Profiles):**
```
Parent books session → Session linked to parent user ID
Problem: Who is the actual student?
```

**After (With Child Profiles):**
```
1. Parent selects child profile (e.g., Emma)
2. Parent browses tutors
3. Parent clicks "Book Session"
4. System creates session with:
   - child_id: Emma's ID
   - parent_id: Parent's ID
   - tutor_id: Selected tutor's ID
5. Tutor sees: "Session with Emma Smith (parent: John Smith)"
```

### Benefits:
- ✅ Clear who the student is
- ✅ Separate progress tracking per child
- ✅ Different tutors can teach different children
- ✅ Tutor preparation: knows student's age, learning style, SEN needs

---

## Tutor's View

### Session Details
When tutor sees upcoming session:
```
┌─────────────────────────────────────┐
│ Mathematics • Monday 3:00 PM        │
│                                     │
│ Student: Emma Smith (Age 8, Year 3) │
│ Parent: John Smith                  │
│ john.smith@email.com                │
│                                     │
│ Learning Preferences:               │
│ • Visual learner                    │
│ • Dyslexia support                  │
│ • Prefers step-by-step explanations │
│                                     │
│ Previous Sessions: 15 completed     │
│ Progress: 75%                       │
└─────────────────────────────────────┘
```

### Why Tutors Need This:
- Prepare age-appropriate materials
- Review previous session notes for this specific child
- Adapt teaching style to child's learning preferences
- Be aware of SEN needs in advance

---

## API Endpoints

### For Parents

**Get My Children**
```
GET /api/parent/children
Authorization: Bearer {parent_access_token}

Response:
{
  "children": [
    {
      "id": "child-123",
      "firstName": "Emma",
      "lastName": "Smith",
      "age": 8,
      "yearGroup": "3",
      "upcomingSessions": 2,
      "completedSessions": 15
    },
    {
      "id": "child-456",
      "firstName": "Oliver",
      "lastName": "Smith",
      "age": 10,
      "yearGroup": "5",
      "upcomingSessions": 1,
      "completedSessions": 22
    }
  ],
  "limit": 4,
  "subscriptionTier": "premium"
}
```

**Add Child**
```
POST /api/parent/children
Authorization: Bearer {parent_access_token}

Request:
{
  "firstName": "Emma",
  "lastName": "Smith",
  "dateOfBirth": "2015-06-15",
  "yearGroup": "3",
  "learningPreferences": {
    "subjects": ["Mathematics", "English"],
    "learningStyle": "Visual",
    "specialNeeds": ["Dyslexia"]
  }
}

Response:
{
  "id": "child-123",
  "message": "Child profile created successfully"
}

Errors:
- 403: Child limit reached for your subscription tier
- 400: Invalid data
```

### For Admins

**Get All Child Profiles**
```
GET /admin/child-profiles
Authorization: Bearer {admin_access_token}

Query params:
- status: active | inactive | all
- search: string (searches child name, parent name, parent email)
- page: number
- limit: number

Response:
{
  "profiles": [...],
  "total": 156,
  "page": 1,
  "pages": 16
}
```

---

## Security & Privacy

### Data Protection

**What Parents Can See:**
- ✅ All data for their own children
- ✅ Messages between their children and tutors
- ✅ Session reports for their children
- ❌ Other families' children
- ❌ Tutor's other students

**What Tutors Can See:**
- ✅ Profile info for children they teach
- ✅ Learning preferences and SEN needs
- ✅ Session history for their sessions only
- ❌ Other tutors' session notes
- ❌ Parent's payment information

**What Admins Can See:**
- ✅ All child profiles (for support)
- ✅ Parent-child relationships
- ✅ Session statistics
- ✅ Limited to necessary info for platform operation

### GDPR Compliance

**Data Subject Access Requests (DSAR):**
- Parent makes request on behalf of child
- Export includes:
  - Child profile data
  - All sessions (past and upcoming)
  - Session notes and reports
  - Messages with tutors
  - Learning preferences and SEN info

**Right to Erasure:**
- Parent can delete child profile
- Cascading delete: sessions, messages, reports
- Retention: 30 days for dispute resolution
- Tutor notified of cancelled sessions

**Data Minimization:**
- Only collect necessary child data
- No direct marketing to children
- No behavioral tracking for advertising
- SEN data encrypted at rest

---

## Migration Path (If Already Have Child Users)

If you already have children as separate users with login credentials:

### Option 1: Convert to Child Profiles
```sql
-- 1. Create child profiles from existing child users
INSERT INTO child_profiles (id, parent_id, first_name, last_name, date_of_birth, created_at)
SELECT 
  u.id,
  pc.parent_id, -- from parent_children relationship table
  u.first_name,
  u.last_name,
  u.date_of_birth,
  u.created_at
FROM users u
JOIN parent_children pc ON u.id = pc.child_id
WHERE u.role = 'child';

-- 2. Update sessions to reference child_profile instead of user
UPDATE sessions
SET child_id = user_id
WHERE user_id IN (SELECT id FROM users WHERE role = 'child');

-- 3. Disable child user accounts (don't delete for audit trail)
UPDATE users
SET status = 'migrated_to_child_profile'
WHERE role = 'child';
```

### Option 2: Hybrid Approach (13+ Can Keep Login)
- Children under 13: Convert to child profiles
- Children 13+: Keep as users but link to parent for oversight
- Gradual migration as children age out

---

## Testing Checklist

### Parent Experience
- [ ] Parent can add child (within subscription limit)
- [ ] Parent cannot exceed child limit
- [ ] Parent can switch between children
- [ ] Dashboard updates when switching children
- [ ] Sessions booked for correct child
- [ ] Parent sees correct child's progress
- [ ] Parent can edit child profile
- [ ] Parent can delete child profile

### Admin Experience
- [ ] All child profiles visible in dashboard
- [ ] Search by child name works
- [ ] Search by parent name works
- [ ] Filter by status works
- [ ] Session stats accurate per child
- [ ] Parent-child relationships correct
- [ ] Subscription limits enforced

### Tutor Experience
- [ ] Tutor sees child name in session
- [ ] Tutor sees child's learning preferences
- [ ] Tutor can add session notes for specific child
- [ ] Progress tracking per child works

### Security
- [ ] Parent cannot see other families' children
- [ ] Tutor cannot see children they don't teach
- [ ] Child limit enforcement works
- [ ] DSAR export includes child data
- [ ] Child profile deletion works correctly

---

## FAQs

**Q: What if a child turns 13 and wants their own account?**
A: The parent can convert the child profile to a full user account. We'd need to build a "Graduate to User Account" feature that:
1. Creates user account from child profile
2. Links to parent for billing
3. Gives child their own login
4. Parent retains oversight capability

**Q: Can siblings share a child profile?**
A: No. Each child must have their own profile for:
- Accurate progress tracking
- Age-appropriate content
- Individual learning preferences
- Safeguarding requirements

**Q: What if parent wants to transfer child to another parent account?**
A: Requires admin approval:
1. New parent sends request
2. Original parent approves
3. Admin reviews
4. Child profile transferred
5. Session history preserved

**Q: Can grandparents/guardians book sessions?**
A: Yes, with "Authorized User" feature:
1. Parent adds guardian email
2. Guardian creates account
3. Linked to parent's subscription
4. Can switch between authorized children
5. Parent retains primary control

**Q: How do we handle divorced parents?**
A: Both parents can have access:
1. Shared custody: Both parents linked to child
2. Each parent sees child's full schedule
3. Either can book sessions
4. Billing to designated parent
5. Communication visible to both

---

## Summary

**Child profiles are:**
- ✅ Managed by parents (no separate logins)
- ✅ Visible in admin dashboard
- ✅ Accessed via profile switching
- ✅ Enforced by subscription limits
- ✅ COPPA/GDPR compliant
- ✅ Safeguarding-first design

**This architecture ensures:**
- Child safety and parental oversight
- Clear student identity for tutors
- Platform-wide visibility for support
- Legal compliance
- Scalable subscription model
