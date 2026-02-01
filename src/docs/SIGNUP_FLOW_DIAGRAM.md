# Signup Flow Diagram

## Complete Signup Flow with Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SIGNUP FLOW                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  User clicks │
│   "Sign Up"  │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Select Role:        │
│ - Tutor             │
│ - Parent            │
│ - Student           │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│              ROLE-SPECIFIC SIGNUP COMPONENT                      │
│  TutorSignup.tsx / ParentSignup.tsx / StudentSignup.tsx         │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│ User fills form:    │
│ - Email            │
│ - Password         │
│ - Name             │
│ - Role-specific    │
│   data             │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE VALIDATION                        │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Email format valid?                                           │
│ ✓ Password ≥ 6 chars?                                           │
│ ✓ Passwords match?                                              │
│ ✓ All required fields filled?                                   │
└──────┬──────────────────────────────────────────────────────────┘
       │
       │ ✓ Validation passed
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NETWORK REQUEST                             │
├─────────────────────────────────────────────────────────────────┤
│ console.log('Attempting signup for:', email)                    │
│                                                                  │
│ POST /make-server-cbd74580/signup                               │
│ {                                                                │
│   email: "user@example.com",                                    │
│   password: "******",                                            │
│   name: "Full Name"                                              │
│ }                                                                │
└──────┬──────────────────────────────────────────────────────────┘
       │
       │ Network Error?
       ├────────────────────────────────┐
       │                                 │
       │ ✓ Request sent                 │ ✗ Network Error
       ▼                                 ▼
┌─────────────────────┐      ┌──────────────────────────┐
│   SERVER RECEIVES   │      │ catch (networkError) {   │
│      REQUEST        │      │   throw new Error(       │
└──────┬──────────────┘      │     'Network error:...'  │
       │                     │   )                      │
       ▼                     │ }                        │
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE PROCESSING                        │
│               /supabase/functions/server/index.tsx               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ console.log('=== SIGNUP ENDPOINT CALLED ===')                   │
│ console.log('Signup request for email:', email)                 │
│                                                                  │
│ ┌──────────────────────────────────────────────────┐            │
│ │ Step 1: Validate Input                          │            │
│ │ - Email, password, name present?                 │            │
│ │ - Email format valid?                            │            │
│ │ - Password ≥ 6 chars?                            │            │
│ └──────┬───────────────────────────────────────────┘            │
│        │                                                         │
│        │ ✗ Invalid                                               │
│        ├───────────────────────────────────┐                     │
│        │                                    │                     │
│        │ ✓ Valid                            ▼                     │
│        ▼                          return 400: "Invalid..."       │
│ ┌──────────────────────────────────────────────────┐            │
│ │ Step 2: Check Existing Users                    │            │
│ │ console.log('Checking for existing users...')    │            │
│ │                                                   │            │
│ │ supabase.auth.admin.listUsers()                  │            │
│ └──────┬───────────────────────────────────────────┘            │
│        │                                                         │
│        │ ✗ User exists                                           │
│        ├───────────────────────────────────┐                     │
│        │                                    │                     │
│        │ ✓ New user                         ▼                     │
│        ▼                          return 409: "User exists..."   │
│ ┌──────────────────────────────────────────────────┐            │
│ │ Step 3: Create User in Supabase Auth            │            │
│ │ console.log('Creating user with Supabase Auth...')            │
│ │                                                   │            │
│ │ supabase.auth.admin.createUser({                 │            │
│ │   email, password,                               │            │
│ │   user_metadata: { name },                       │            │
│ │   email_confirm: true                            │            │
│ │ })                                                │            │
│ └──────┬───────────────────────────────────────────┘            │
│        │                                                         │
│        │ ✗ Supabase Error                                        │
│        ├───────────────────────────────────┐                     │
│        │                                    │                     │
│        │ ✓ User created                     ▼                     │
│        ▼                          console.error('Error creating')│
│ console.log('User created successfully')   return 400: error     │
│                                                                  │
│ ┌──────────────────────────────────────────────────┐            │
│ │ Step 4: Create Profile in KV Store              │            │
│ │ console.log('Creating user profile in KV store...')           │
│ │                                                   │            │
│ │ kv.set(`user:${userId}`, {                       │            │
│ │   userId, email, name, role, ...                 │            │
│ │ })                                                │            │
│ └──────┬───────────────────────────────────────────┘            │
│        │                                                         │
│        │ ✗ KV Error (non-fatal)                                  │
│        ├───────────────────────────────────┐                     │
│        │                                    │                     │
│        │ ✓ Profile created                  ▼                     │
│        ▼                          console.error('KV error')      │
│ console.log('User profile created')         (continues anyway)   │
│                                                                  │
│ ┌──────────────────────────────────────────────────┐            │
│ │ Step 5: Return Success                          │            │
│ │ console.log('Signup successful for:', email)     │            │
│ │                                                   │            │
│ │ return 200: {                                    │            │
│ │   success: true,                                 │            │
│ │   user: {...},                                   │            │
│ │   isAdmin: false                                 │            │
│ │ }                                                 │            │
│ └──────┬───────────────────────────────────────────┘            │
│                                                                  │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT RECEIVES RESPONSE                      │
├─────────────────────────────────────────────────────────────────┤
│ console.log('Signup response status:', status)                  │
│ console.log('Signup response data:', data)                      │
│                                                                  │
│ Parse JSON Error?                                                │
│ ├───────────────────────────────────┐                            │
│ │                                    │                            │
│ │ ✓ JSON parsed                      │ ✗ JSON Error               │
│ ▼                                    ▼                            │
│ Check response.ok?           throw 'Invalid response'           │
│                                                                  │
│ ✗ Not OK (4xx/5xx)           ✓ OK (200)                         │
│ ├──────────────────────────┐                                    │
│ │                           │                                    │
│ ▼                           ▼                                    │
│ throw Error(data.error)    Check data.success?                 │
│                                                                  │
│                            ✗ No success flag  ✓ Success         │
│                            ├────────────────┐                    │
│                            │                 │                    │
│                            ▼                 ▼                    │
│                    throw 'Failed...'    Continue to sign in     │
└─────────────────────────────────────────────┬───────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SIGN IN WITH PASSWORD                       │
├─────────────────────────────────────────────────────────────────┤
│ supabase.auth.signInWithPassword({                              │
│   email, password                                                │
│ })                                                               │
│                                                                  │
│ ✗ Sign in error           ✓ Session created                     │
│ ├──────────────────────────┐                                    │
│ │                           │                                    │
│ ▼                           ▼                                    │
│ throw 'Failed to sign in'  Update metadata with role           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE PROFILE (Optional)                   │
├─────────────────────────────────────────────────────────────────┤
│ For tutors: Upload documents, set subjects, etc.               │
│ For parents: Add children info                                  │
│ For students: Set learning preferences                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUCCESS                                    │
├─────────────────────────────────────────────────────────────────┤
│ Show success message                                             │
│ Redirect to dashboard                                            │
│ window.location.reload()                                         │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        ERROR HANDLING POINTS
═══════════════════════════════════════════════════════════════════

1. CLIENT VALIDATION
   ├─ Invalid email format → "Please enter a valid email address"
   ├─ Password too short → "Password must be at least 6 characters long"
   ├─ Passwords don't match → "Passwords do not match"
   └─ Missing fields → "Please fill in all required fields"

2. NETWORK ERRORS
   └─ Cannot reach server → "Network error: Unable to connect to server..."

3. JSON PARSE ERRORS
   └─ Invalid response → "Invalid server response. Please try again..."

4. SERVER VALIDATION
   ├─ Missing fields → 400: "Email, password, and name are required"
   ├─ Invalid email → 400: "Please enter a valid email address"
   └─ Password too short → 400: "Password must be at least 6 characters"

5. DUPLICATE USER
   └─ Email exists → 409: "A user with this email already exists..."

6. SUPABASE AUTH ERRORS
   ├─ Email validation → 400: "Please enter a valid email address"
   ├─ Password validation → 400: "Password must be at least 6 characters"
   └─ Other errors → 400: error.message

7. KV STORE ERRORS (Non-fatal)
   └─ KV error logged, signup continues

8. SIGN IN ERRORS
   └─ "Account created but failed to sign in: {error}"

═══════════════════════════════════════════════════════════════════
                            LOGGING POINTS
═══════════════════════════════════════════════════════════════════

CLIENT LOGS (Browser Console):
├─ "Attempting signup for: {email}"
├─ "Signup response status: {status}"
├─ "Signup response data: {data}"
├─ "Signup failed with status: {status}"
└─ "Error from server: {error}"

SERVER LOGS (Supabase Dashboard):
├─ "=== SIGNUP ENDPOINT CALLED ==="
├─ "Signup request for email: {email} name: {name}"
├─ "Creating Supabase client..."
├─ "Checking for existing users..."
├─ "User already exists: {email}" (if duplicate)
├─ "Creating user with Supabase Auth..."
├─ "User created successfully: {userId}"
├─ "Creating user profile in KV store..."
├─ "User profile created in KV store"
├─ "Signup successful for: {email}"
└─ Error logs with full context

═══════════════════════════════════════════════════════════════════
```

## Key Features

### ✅ Comprehensive Error Handling
- Client-side validation before submission
- Network error detection
- JSON parsing error handling
- Server-side validation and error messages
- Graceful degradation (KV errors don't fail signup)

### ✅ Detailed Logging
- Every step logged on both client and server
- Error context included in all logs
- Easy to trace issues in production

### ✅ User-Friendly Messages
- Specific error messages instead of generic ones
- Actionable guidance (e.g., "Please sign in instead")
- Clear indication of what went wrong

### ✅ Developer-Friendly Debugging
- Console logs in browser
- Server logs in Supabase Dashboard
- Test utility for endpoint testing
- Comprehensive documentation

## Flow Summary

1. **User Input** → Validate client-side
2. **Network Request** → Handle network errors
3. **Server Processing** → Validate, create user, store profile
4. **Response Handling** → Parse JSON, check status, handle errors
5. **Sign In** → Create session
6. **Profile Completion** → Role-specific data (optional)
7. **Success** → Redirect to dashboard

## Error Recovery

At each error point, the system:
1. **Logs** the error with context
2. **Returns** a specific error message
3. **Shows** user-friendly message in UI
4. **Stops** the flow to prevent further issues

This ensures errors are:
- ✅ Caught early
- ✅ Logged completely
- ✅ Communicated clearly
- ✅ Easy to debug
