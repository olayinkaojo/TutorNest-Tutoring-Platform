# Role Switching Feature - Implementation Guide

## Overview

TutorNest now supports **multi-role user accounts**, similar to Fiverr's buyer/seller switching model. Users can hold multiple roles (Parent, Tutor, Student, Admin) simultaneously and easily switch between them without signing out or creating separate accounts.

---

## ✅ **What's Implemented**

### 1. **Role Switcher UI Component** (`/components/RoleSwitcher.tsx`)
- **Fiverr-style interface** with dropdown menu
- **Color-coded roles:**
  - 🟣 **Parent Mode** - Purple (#625d9c)
  - 🟢 **Tutor Mode** - Green (#5d9827)
  - 🔴 **Admin Mode** - Red (#dc2626)
  - 🔵 **Student Mode** - Blue (#2563eb)
- Shows **current active role** with icon and label
- Dropdown displays all **available roles** for the user
- Auto-hides when user has only one role

### 2. **Add Role Feature** (`/components/AddRoleCard.tsx`)
- **Prominent cards** in dashboard overview tabs
- Shows benefits of each role with checkmarks
- **One-click role addition** with automatic redirection
- Handles role-specific signup flows:
  - **Tutor role** → Redirects to tutor signup & verification
  - **Parent role** → Creates parent profile immediately
  - **Student role** → Redirects to student signup

### 3. **Backend API** (`/supabase/functions/server/role-management-routes.tsx`)
Complete role management endpoints:
- `GET /user-roles/:userId` - Fetch all roles for a user
- `POST /add-role` - Add a new role to user account
- `POST /switch-role` - Switch between existing roles
- `GET /role-profile/:userId/:role` - Get profile for specific role
- `POST /initialize-roles` - Initialize roles during signup

### 4. **Data Architecture**
Each user can have multiple profiles stored separately:
```
user_roles:{userId} → ['parent', 'tutor']
profile_parent_{userId} → { parent profile data }
profile_tutor_{userId} → { tutor profile data }
```

### 5. **Integration Points**
- **App.tsx** - Central role switching logic and state management
- **ParentDashboard.tsx** - RoleSwitcher in header + AddRoleCard in overview
- **TutorDashboard.tsx** - RoleSwitcher in header + AddRoleCard in overview
- **AdminDashboard.tsx** - RoleSwitcher in header (admin can view other roles)

---

## 🎯 **User Flow Examples**

### **Example 1: Tutor wants to become a Parent**
1. Tutor logs in and goes to **Overview tab**
2. Scrolls to **"Account Roles"** card
3. Sees **"Become a Parent on TutorNest"** card with benefits
4. Clicks **"+ Add Parent Role"**
5. Parent role is added immediately
6. **RoleSwitcher** appears in header
7. Can now switch between Tutor and Parent dashboards instantly

### **Example 2: Parent wants to become a Tutor**
1. Parent logs in and goes to **Overview tab**
2. Sees **"Become a Tutor on TutorNest"** card
3. Clicks **"+ Add Tutor Role"**
4. Redirected to **tutor signup flow**
5. Completes tutor profile and document verification
6. Once approved, **RoleSwitcher** appears
7. Can switch between Parent and Tutor modes

### **Example 3: Switching Roles**
1. User with multiple roles sees **RoleSwitcher** in header
2. Shows current role (e.g., "Viewing as Parent Mode")
3. Clicks dropdown to see all available roles
4. Selects "Tutor Mode"
5. **Instantly switches** to Tutor Dashboard
6. All data and permissions change accordingly

---

## 🔧 **Technical Details**

### **Role Validation**
```typescript
// Only parent, tutor, and student roles can be added
if (!['parent', 'tutor', 'student'].includes(newRole)) {
  return error('Invalid role');
}

// Check if role already exists
if (existingRoles.includes(newRole)) {
  return error('Role already exists');
}
```

### **Profile Management**
Each role maintains its own profile:
```typescript
const profileKey = `profile_${role}_${userId}`;
await kv.set(profileKey, {
  ...roleData,
  userId,
  role,
  createdAt: new Date().toISOString(),
  status: role === 'tutor' ? 'pending_approval' : 'active',
});
```

### **Role Switching**
```typescript
const handleRoleSwitch = async (newRole: string) => {
  const response = await fetch('/role-management/switch-role', {
    method: 'POST',
    body: JSON.stringify({ userId, targetRole: newRole }),
  });
  
  if (response.ok) {
    const data = await response.json();
    setProfile(data.profile); // Updates entire app state
  }
};
```

---

## 🎨 **UI/UX Design**

### **Location of Add Role Cards**
- **Parent Dashboard** → Overview tab, bottom section
- **Tutor Dashboard** → Overview tab, bottom section
- **Card Style:**
  - Border color matches role color
  - Background tint matches role color
  - Icon with role-specific styling
  - Clear benefit list with checkmarks
  - Prominent call-to-action button

### **RoleSwitcher Display Logic**
```typescript
// Only show if user has multiple roles
{availableRoles.length > 1 && onRoleSwitch && (
  <RoleSwitcher
    currentRole={profile.role}
    availableRoles={availableRoles}
    onRoleSwitch={onRoleSwitch}
    userName={profile.name}
  />
)}
```

---

## 🚀 **Benefits**

### **For Users:**
- ✅ **No duplicate accounts** needed
- ✅ **Seamless switching** between roles
- ✅ **Single login** for all activities
- ✅ **Clear visual distinction** between roles
- ✅ **Easy role expansion** without hassle

### **For Platform:**
- ✅ **Better user retention** (users don't need multiple emails)
- ✅ **Increased engagement** (easier to try different roles)
- ✅ **Cleaner data architecture** (one user = one account)
- ✅ **Reduced support tickets** (no confusion about accounts)

---

## 🔐 **Security Considerations**

### **Role Verification**
- **Tutor role** requires full verification before activation
- **Parent role** is active immediately (no verification needed)
- **Student role** requires parent approval if under 18
- **Admin role** cannot be self-added (backend only)

### **Authorization Checks**
- Users can only add roles to **their own account**
- Users can only switch to roles **they have access to**
- Each role has **separate permissions** and data access
- Role switching validates **profile existence** before switching

---

## 📝 **Testing Checklist**

- [ ] Create account as Parent
- [ ] Add Tutor role from Parent dashboard
- [ ] Complete tutor verification
- [ ] Switch between Parent and Tutor modes
- [ ] Verify data isolation (parent children ≠ tutor students)
- [ ] Add Student role
- [ ] Switch between all three roles
- [ ] Verify RoleSwitcher only shows when multiple roles exist
- [ ] Test role addition error handling
- [ ] Verify proper redirection after role addition

---

## 🎯 **Future Enhancements**

### **Potential Improvements:**
1. **Role Activity Indicators** - Show unread notifications per role
2. **Quick Actions per Role** - Shortcuts in RoleSwitcher dropdown
3. **Role Analytics** - Track which roles users use most
4. **Role Recommendations** - Suggest roles based on usage patterns
5. **Role-Specific Onboarding** - Tailored tutorials for each new role
6. **Role Badges** - Visual indicators of role completion/verification

---

## 📞 **Support & Troubleshooting**

### **Common Issues:**

**Issue:** RoleSwitcher not appearing
- **Solution:** User only has one role. Check `availableRoles` array.

**Issue:** Role addition fails
- **Solution:** Check if role already exists or if user is unauthorized.

**Issue:** Profile not found after role switch
- **Solution:** Verify profile was created for that role during addition.

**Issue:** Stuck on "pending_approval" for tutor
- **Solution:** Tutor verification must be completed by admin.

---

## 🎉 **Summary**

The role-switching feature provides a seamless, Fiverr-like experience for TutorNest users who want to participate in multiple ways. Whether someone starts as a parent and later decides to become a tutor, or a tutor wants to book lessons for their own children, the system handles it elegantly with clear visual design and smooth transitions.

**Key Takeaway:** One account, multiple roles, zero friction! 🚀
