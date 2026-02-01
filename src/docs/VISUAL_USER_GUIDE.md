# Visual User Guide - Child Profile System

## What You'll See Now

---

## 🎯 Parent Dashboard Experience

### 1. **Before Adding Children**

```
┌─────────────────────────────────────────────────────────┐
│ TutorNest Logo                    Welcome, John Smith  │
└─────────────────────────────────────────────────────────┘

Parent Dashboard
Manage your children's learning journey and track their progress

[No Child Profile Switcher shown yet]

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Add Child  │ │ Book       │ │ Subscript  │ │ Find       │
│            │ │ Lesson     │ │ ion        │ │ Tutors     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

Your Children
┌─────────────────────────────────────────────────────────┐
│                                                           │
│                  👥 No children added yet                │
│                                                           │
│             [+ Add Your First Child] ← Click here        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### 2. **After Adding First Child**

```
┌─────────────────────────────────────────────────────────┐
│ TutorNest Logo                    Welcome, John Smith  │
└─────────────────────────────────────────────────────────┘

Parent Dashboard
Manage your children's learning journey and track their progress

🆕 CHILD PROFILE SWITCHER APPEARS:
┌─────────────────────────────────────────────────────────┐
│ Active Profile: Emma Smith ▼                            │
│ Age 8 • Year 3                                          │
│ 📅 0 upcoming  ✓ 0 completed                            │
└─────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Add Child  │ │ Book       │ │ Subscript  │ │ Find       │
│            │ │ Lesson     │ │ ion        │ │ Tutors     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

Your Children
┌──────────────────────────────────────┐  [+ Add Another Child]
│ Emma Smith                           │
│ Year 3                               │
│                                      │
│ Subjects: Mathematics, English       │
│                                      │
│ Learning Goals: Improve reading      │
│                                      │
│      0 Lessons    0 Achievements     │
└──────────────────────────────────────┘
```

---

### 3. **After Adding Multiple Children**

```
Parent Dashboard

🆕 CLICK TO OPEN DROPDOWN:
┌─────────────────────────────────────────────────────────┐
│ Active Profile: Emma Smith ▼     ← Click here          │
│ Age 8 • Year 3                                          │
│ 📅 2 upcoming  ✓ 15 completed                           │
└─────────────────────────────────────────────────────────┘
                    ↓ Opens dropdown ↓

┌─────────────────────────────────────────────────────────┐
│ ✓ Emma Smith (Age 8)              [Active]             │
│   2 upcoming • 75% progress                             │
├─────────────────────────────────────────────────────────┤
│   Oliver Smith (Age 10)           ← Click to switch    │
│   1 upcoming • 82% progress                             │
├─────────────────────────────────────────────────────────┤
│ + Add Another Child                                     │
│   (2 of 4 - Premium tier)         ← Shows limit        │
└─────────────────────────────────────────────────────────┘
```

---

### 4. **When At Subscription Limit**

```
Parent Dashboard

CHILD PROFILE SWITCHER:
┌─────────────────────────────────────────────────────────┐
│ Active Profile: Emma Smith ▼                            │
│ Age 8 • Year 3                                          │
│ 📅 2 upcoming  ✓ 15 completed                           │
└─────────────────────────────────────────────────────────┘
                    ↓ Opens dropdown ↓

┌─────────────────────────────────────────────────────────┐
│ ✓ Emma Smith (Age 8)              [Active]             │
│   2 upcoming • 75% progress                             │
├─────────────────────────────────────────────────────────┤
│   Oliver Smith (Age 10)                                 │
│   1 upcoming • 82% progress                             │
├─────────────────────────────────────────────────────────┤
│ ⚠️ You've reached your limit of 2 children             │
│    for the Standard tier. Upgrade to add more.         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Admin Dashboard Experience

### 1. **Admin Dashboard Tabs**

```
┌─────────────────────────────────────────────────────────┐
│ TutorNest Logo                  Admin: Administrator   │
└─────────────────────────────────────────────────────────┘

Admin Dashboard
Manage platform operations, monitor alerts, and oversee compliance

[Overview] [Alerts] [Notifications] [Users] [Verification] 
[Analytics] [Activity] [Disputes] [Coupons] [Tax Reports] 
🆕 [Child Profiles] ← NEW TAB
```

---

### 2. **Child Profiles Tab - Overview**

```
Child Profile Management
Student profiles managed by parents

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 👥 156      │ │ 👤 89       │ │ 📚 1,234    │ │ 📅 7.9      │
│ Child       │ │ Parent      │ │ Sessions    │ │ Avg per     │
│ Profiles    │ │ Accounts    │ │ Booked      │ │ Child       │
│ 142 active  │ │ 12 at limit │ │ Total       │ │ Sessions    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

ℹ️ Child Profile Architecture
• No Separate Logins: Children do not have login credentials
• Parent-Managed: Parents switch between child profiles
• Subscription Limits: Basic (1), Standard (2), Premium (4)
• Admin Visibility: All child profiles visible for support
• Session Booking: Parents book sessions for specific children

┌──────────────────────────────────────────────────────────┐
│ [Search: ___________________] [Filter: All Status ▼]    │
└──────────────────────────────────────────────────────────┘
```

---

### 3. **Child Profiles List**

```
Child Profiles (156)                    │  Child Details
────────────────────────────────────────┼───────────────────────
┌──────────────────────────────────┐   │  Emma Smith
│ 👤 Emma Smith         [Active]   │◄──┼  Age 8 • Year 3
│    Age 8 • Year 3                │   │  [Active]
│    Parent: John Smith            │   │
│    📚 15 completed  📅 2 upcoming│   │  Parent Information
└──────────────────────────────────┘   │  ┌────────────────────┐
                                        │  │ Name: John Smith   │
┌──────────────────────────────────┐   │  │ Email: john@email  │
│ 👤 Oliver Smith       [Active]   │   │  │ Created: Jan 15    │
│    Age 10 • Year 5               │   │  └────────────────────┘
│    Parent: John Smith            │   │
│    📚 22 completed  📅 1 upcoming│   │  Session Statistics
└──────────────────────────────────┘   │  ┌──┐ ┌──┐ ┌──┐ ┌──┐
                                        │  │17│ │15│ │2 │ │18h│
┌──────────────────────────────────┐   │  └──┘ └──┘ └──┘ └──┘
│ 👤 Sophie Brown       [Active]   │   │  Total Completed Up- Hours
│    Age 9 • Year 4                │   │               coming
│    Parent: Mary Brown            │   │
│    📚 8 completed  📅 3 upcoming │   │  Current Tutors
└──────────────────────────────────┘   │  ┌────────────────────┐
                                        │  │ Ms. Johnson        │
                                        │  │ [Mathematics]      │
                                        │  ├────────────────────┤
                                        │  │ Mr. Brown          │
                                        │  │ [English]          │
                                        │  └────────────────────┘
```

---

### 4. **Parent-Child Summaries**

```
Parent Accounts with Children

┌─────────────────────────────────────────────────────────┐
│ John Smith                              [standard]      │
│ john.smith@email.com                    2 / 2 At limit  │
│                                                          │
│ Children:                                                │
│ • Emma Smith (Age 8)    • Oliver Smith (Age 10)        │
│                                                          │
│ ⚠️ Parent has reached child limit for Standard tier.   │
│    They need to upgrade to add more children.           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Mary Brown                              [premium]       │
│ mary.brown@email.com                    1 / 4           │
│                                         3 remaining      │
│ Children:                                                │
│ • Sophie Brown (Age 9)                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ David Wilson                            [basic]         │
│ david.wilson@email.com                  1 / 1 At limit  │
│                                                          │
│ Children:                                                │
│ • Thomas Wilson (Age 7)                                 │
│                                                          │
│ ⚠️ Parent has reached child limit for Basic tier.      │
│    They need to upgrade to add more children.           │
└─────────────────────────────────────────────────────────┘
```

---

### 5. **How It Works Section**

```
How Child Profiles Work

For Parents:                        For Admins:
• Parent logs in                    • View all child profiles
• Can add children                  • See parent relationships
• Switches between profiles         • Monitor session activity
• Books sessions for children       • Support requests
• Views progress per child          • Safeguarding compliance
• All actions logged                • COPPA/GDPR compliant
```

---

## 🎬 User Flows

### Parent Adding First Child

```
Step 1: Login as Parent
    ↓
Step 2: See "No children added yet"
    ↓
Step 3: Click [+ Add Your First Child]
    ↓
Step 4: Fill in dialog:
        • First Name: Emma
        • Last Name: Smith
        • Date of Birth: 2015-06-15
        • Year Group: 3
        • Subjects: Mathematics, English
        • Learning Goals: (optional)
    ↓
Step 5: Click [Add Child]
    ↓
Step 6: ✅ Child Profile Switcher appears!
    ↓
Step 7: Child card shows in "Your Children"
```

---

### Parent Switching Between Children

```
Step 1: Parent sees Child Profile Switcher
        ┌─────────────────────────────────┐
        │ Active Profile: Emma Smith ▼    │
        └─────────────────────────────────┘
    ↓
Step 2: Click on dropdown arrow
    ↓
Step 3: Dropdown opens showing all children
    ↓
Step 4: Click "Oliver Smith"
    ↓
Step 5: Switcher updates:
        ┌─────────────────────────────────┐
        │ Active Profile: Oliver Smith ▼  │
        └─────────────────────────────────┘
    ↓
Step 6: Dashboard now shows Oliver's data
        • Oliver's upcoming sessions
        • Oliver's progress
        • Oliver's tutors
```

---

### Admin Viewing Child Profiles

```
Step 1: Login as Admin
    ↓
Step 2: Go to Admin Dashboard
    ↓
Step 3: Click [Child Profiles] tab
    ↓
Step 4: See list of all children
    ↓
Step 5: Search "Emma" in search box
    ↓
Step 6: Click on Emma Smith's card
    ↓
Step 7: Right panel shows Emma's details:
        • Age, year group
        • Parent: John Smith
        • Session statistics
        • Current tutors
        • Learning preferences
```

---

## 🎨 Visual Indicators

### Status Badges

```
[Active]     ← Green badge - child is actively learning
[Inactive]   ← Gray badge - child profile paused
```

### Session Counts

```
📅 2 upcoming   ← Blue - scheduled sessions
✓ 15 completed ← Green - finished sessions
```

### Subscription Limits

```
2 / 2        ← Red background - at limit
1 / 4        ← Green background - under limit
```

### Progress

```
75% progress ← Percentage with visual bar
```

---

## 💡 Key Visual Differences

### Before Implementation:
```
Parent Dashboard
- No profile switcher
- Just a list of children cards
- No indication of active child
- No subscription limits shown
```

### After Implementation:
```
Parent Dashboard
- ✨ Prominent profile switcher at top
- Active child clearly indicated
- Easy dropdown to switch
- Subscription limits displayed
- Session counts per child
```

### Admin Dashboard Before:
```
- No child profiles tab
- No visibility into children
```

### Admin Dashboard After:
```
- ✨ New "Child Profiles" tab
- Complete child management interface
- Search and filter capabilities
- Parent-child relationship view
- Session statistics
- Subscription compliance monitoring
```

---

## 🚀 What Parents Will Love

1. **One-Click Switching** - Toggle between children instantly
2. **At-a-Glance Stats** - See each child's sessions without digging
3. **Clear Limits** - Know exactly how many children they can add
4. **Easy Add** - "+ Add Another Child" button right in the dropdown
5. **Visual Feedback** - Active child clearly marked with badge

---

## 🛡️ What Admins Will Love

1. **Complete Visibility** - See all children across platform
2. **Quick Search** - Find any child by name instantly
3. **Parent Context** - Always know which parent manages a child
4. **Session Tracking** - Monitor learning activity per child
5. **Compliance Monitoring** - Track subscription limits
6. **Support Ready** - All info needed for support tickets

---

## 📱 Responsive Design

### Desktop
```
┌──────────────────────────────────────────────────────────┐
│ [Child Switcher - Full Width]                            │
└──────────────────────────────────────────────────────────┘
```

### Mobile
```
┌─────────────────┐
│ Active Profile  │
│ Emma Smith ▼    │
│ Age 8 • Year 3  │
│ 📅 2  ✓ 15      │
└─────────────────┘
```

---

## 🎯 Summary

### Visual Changes You'll See:

**Parent Dashboard:**
- ✅ Child Profile Switcher (new component at top)
- ✅ Active child indicator
- ✅ Dropdown with all children
- ✅ Session counts per child
- ✅ Subscription limit display

**Admin Dashboard:**
- ✅ New "Child Profiles" tab
- ✅ Comprehensive child management interface
- ✅ Stats dashboard
- ✅ Search and filter controls
- ✅ Split view (list + details)

**Overall Experience:**
- ✅ Clear, intuitive interface
- ✅ Brand colors (#625d9c purple, #5d9827 green)
- ✅ Consistent with TutorNest design
- ✅ Responsive across devices
- ✅ Accessibility compliant
