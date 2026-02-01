# 🔍 Role Assignment Logging System

## Overview
Comprehensive logging has been added throughout the signup and role assignment flow to track exactly when and how user roles are set, preventing future role assignment issues.

## Logging Locations

### 1. **Signup Endpoint** (`/make-server-cbd74580/signup`)
**Location:** `/supabase/functions/server/index.tsx` (lines 725-752)

Logs when initial user profile is created:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 SIGNUP: Creating initial user profile in KV store
User ID: [user-id]
Email: [email]
Is Admin: [true/false]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Setting role to ADMIN for admin email
  OR
⏸️  NO ROLE SET - Will be set by specific signup flow (parent/tutor/student)
✅ Initial profile saved to KV store: [profile-json]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. **Profile Update Endpoint** (`PUT /make-server-cbd74580/profiles/:userId`)
**Location:** `/supabase/functions/server/index.tsx` (lines 989-1140)

Logs when profile is updated with role:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 PUT /profiles/:userId - Profile Update Request
Target User ID: [user-id]
Requester ID: [requester-id]
Profile data received: [full-profile-data-json]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Existing profile: [existing-profile-json or NONE]
🎭 Role determination:
  - profileData.role: [role from request]
  - existingProfile?.role: [role from existing profile]
  - FINAL ROLE: [determined role]
✅ Role assigned: [role]
💾 Main profile saved to user:[user-id]
Profile summary: [summary-json]
💾 Role-specific profile saved to: profile_[role]_[user-id]
📋 Current user_roles: [roles-array]
✅ Initialized user_roles for [user-id] with role: [role]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Profile update complete for user: [user-id]
Final role: [role]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. **Parent Signup Component**
**Location:** `/components/ParentSignup.tsx` (lines 203-223)

Logs from frontend when creating parent profile:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍👩‍👧 PARENT SIGNUP: Creating parent profile via PUT endpoint
User ID: [user-id]
Profile data being sent: [profile-data-json]
ROLE in profileData: parent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Parent profile created successfully!
Profile result: [result-json]
Final role: [role]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. **Tutor Signup Component**
**Location:** `/components/TutorSignup.tsx` (lines 467-488)

Logs from frontend when creating tutor profile:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍🏫 TUTOR SIGNUP: Creating/updating tutor profile via PUT endpoint
User ID: [user-id]
Profile data being sent: [profile-data-json]
ROLE in profileData: tutor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tutor profile created/updated successfully!
Profile result: [result-json]
Final role: [role]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. **Student Signup (Independent)**
**Location:** `/supabase/functions/server/student-auth-routes.tsx` (lines 313-322)

Logs when creating independent student profile:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 INDEPENDENT STUDENT SIGNUP: Creating student profile
User ID: [user-id]
Email: [email]
Role: student
Profile: [profile-json]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Independent student profile saved to KV store
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6. **Get Profile Endpoint**
**Location:** `/supabase/functions/server/index.tsx` (lines 857-873)

Logs when profile is fetched:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 GET /profile called
User ID: [user-id]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Profile found in KV store
Profile role: [role]
Profile summary: [summary-json]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## How to Use for Debugging

### To track a user's role assignment:

1. **Open Browser Console** (F12 or Cmd+Option+J)
2. **Watch for log sections** marked with `━━━━━━━` borders
3. **Look for role-related emojis:**
   - 📝 = Initial signup
   - 🔄 = Profile update
   - 👨‍👩‍👧 = Parent signup
   - 👨‍🏫 = Tutor signup
   - 🎓 = Student signup
   - 📖 = Profile fetch
   - 🎭 = Role determination
   - ✅ = Success
   - ❌ = Error
   - ⚠️ = Warning

### Example: Tracking parent signup

Look for this sequence:
```
1. 📝 SIGNUP: Creating initial user profile (NO ROLE SET)
2. 👨‍👩‍👧 PARENT SIGNUP: Creating parent profile (role: parent)
3. 🔄 PUT /profiles/:userId (receives role: parent)
4. 🎭 Role determination (FINAL ROLE: parent)
5. ✅ Profile update complete (Final role: parent)
6. 📖 GET /profile (Profile role: parent)
```

## Benefits

1. **Full Visibility:** Every step of role assignment is logged
2. **Easy Debugging:** Visual separators and emojis make logs easy to scan
3. **Complete Context:** Full JSON objects are logged for inspection
4. **Error Prevention:** Catches missing roles before they cause issues
5. **Audit Trail:** Can trace exactly what happened during signup

## Related Files

- `/supabase/functions/server/index.tsx` - Main signup and profile endpoints
- `/supabase/functions/server/student-auth-routes.tsx` - Student-specific routes
- `/components/ParentSignup.tsx` - Parent signup form
- `/components/TutorSignup.tsx` - Tutor signup form
- `/components/StudentSignup.tsx` - Student signup form

## Testing

To verify logging is working:
1. Create a new test account (any role)
2. Open browser console
3. Watch for the log sequence
4. Verify role is correctly set at each step
5. Check that final role matches intended role
