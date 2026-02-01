# Signup Error Debugging Guide

## Recent Fix Applied
We've enhanced error handling and logging throughout the signup flow to help identify the root cause of signup failures.

## Changes Made

### 1. Server-Side Improvements (`/supabase/functions/server/index.tsx`)
- ✅ Added comprehensive console logging at every step
- ✅ Enhanced error messages with more context
- ✅ Added validation for missing environment variables
- ✅ Better error handling for Supabase Auth failures
- ✅ Graceful handling of KV store errors (won't fail signup)
- ✅ Detailed logging of all error conditions

### 2. Client-Side Improvements
Enhanced all signup components with better error handling:

#### TutorSignup.tsx
- ✅ Added network error handling
- ✅ Added JSON parsing error handling
- ✅ Enhanced console logging for debugging
- ✅ Better error messages for users

#### ParentSignup.tsx
- ✅ Added network error handling
- ✅ Added JSON parsing error handling
- ✅ Enhanced console logging for debugging
- ✅ Better error messages for users

#### StudentSignup.tsx
- ✅ Enhanced logging for independent signup
- ✅ Enhanced logging for dependent signup
- ✅ Better error messages for both flows

## How to Debug Signup Errors

### Step 1: Check Browser Console
Open the browser developer console (F12) and look for:
1. **Network error messages**: "Network error: Unable to connect to server"
   - This means the server is not reachable
   - Check if the Supabase function is deployed
   
2. **JSON parsing errors**: "Invalid server response"
   - The server returned something that's not valid JSON
   - Check server logs for what was actually returned

3. **Signup response data**: Look for console logs showing:
   ```
   Attempting signup for: user@example.com
   Signup response status: 400 (or 500, etc.)
   Signup response data: { error: "..." }
   ```

### Step 2: Check Server Logs
In Supabase Dashboard → Edge Functions → Logs, look for:

1. **Initial request log**:
   ```
   === SIGNUP ENDPOINT CALLED ===
   Signup request for email: user@example.com name: Full Name
   ```

2. **Validation errors**:
   ```
   Missing required fields: email, password, or name
   Invalid email format: invalid-email
   Password too short
   ```

3. **Supabase Auth errors**:
   ```
   Error creating user with Supabase Auth: { ... }
   Error details: { ... }
   ```

4. **KV Store errors**:
   ```
   Error creating user profile in KV store: { ... }
   ```
   Note: KV store errors won't fail the signup

5. **Success log**:
   ```
   User created successfully: user-id-here
   User profile created in KV store
   Signup successful for: user@example.com
   ```

### Step 3: Common Error Patterns

#### Error: "Failed to create account"
**Possible causes:**
1. ❌ Server function not deployed
2. ❌ Missing environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. ❌ Supabase Auth API error
4. ❌ Network connectivity issue

**How to fix:**
- Check that the function is deployed in Supabase Dashboard
- Verify environment variables are set correctly
- Check Supabase project status
- Test network connectivity

#### Error: "A user with this email already exists"
**Possible causes:**
1. ✅ Email already registered (expected behavior)
2. ✅ User should sign in instead of signing up

**How to fix:**
- User should use the sign-in page
- Or use password reset if they forgot their password

#### Error: "Network error: Unable to connect to server"
**Possible causes:**
1. ❌ Edge function not deployed
2. ❌ Internet connection issue
3. ❌ CORS issue
4. ❌ Wrong project ID in environment

**How to fix:**
- Deploy the edge function
- Check internet connection
- Verify CORS is enabled in server (should be set by default)
- Check that projectId in utils/supabase/info.tsx is correct

#### Error: "Invalid server response"
**Possible causes:**
1. ❌ Server crashed and returned HTML error page
2. ❌ Server returned non-JSON response
3. ❌ Parsing error in server code

**How to fix:**
- Check server logs for crashes
- Ensure all server responses are JSON
- Look for syntax errors in server code

### Step 4: Environment Variables Check

The server requires these environment variables to be set in Supabase:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

To verify:
1. Go to Supabase Dashboard → Edge Functions
2. Click on the function settings
3. Check that all three variables are set

### Step 5: Test the Endpoint Directly

You can test the signup endpoint using curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-cbd74580/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": { ... },
  "isAdmin": false
}
```

## Error Message Reference

### Client Error Messages (4xx)

| Status | Error Message | Meaning |
|--------|--------------|---------|
| 400 | "Email, password, and name are required" | Missing required fields |
| 400 | "Please enter a valid email address" | Invalid email format |
| 400 | "Password must be at least 6 characters long" | Password too short |
| 409 | "A user with this email already exists" | Duplicate email |

### Server Error Messages (5xx)

| Status | Error Message | Meaning |
|--------|--------------|---------|
| 500 | "Failed to create account - no user data returned" | Supabase Auth returned empty data |
| 500 | "Internal server error" | Unexpected server error |

## Testing Checklist

Before reporting a signup error, verify:

- [ ] Browser console shows detailed logs
- [ ] Server logs show the request was received
- [ ] All required fields are filled in
- [ ] Email format is valid
- [ ] Password is at least 6 characters
- [ ] Email is not already registered
- [ ] Internet connection is working
- [ ] Supabase project is active
- [ ] Edge function is deployed
- [ ] Environment variables are set

## Next Steps

If the error persists after checking all of the above:

1. **Capture the exact error message** from both:
   - Browser console
   - Server logs (from Supabase Dashboard)

2. **Note the exact steps** that lead to the error

3. **Check if it's user-specific** by testing with a different email

4. **Verify the timing** - does it happen consistently or intermittently?

## Quick Fix Commands

If you need to redeploy the function:
1. Make sure your changes are saved
2. The function will auto-deploy on file changes in Figma Make

If you need to clear user data:
1. Users are stored in Supabase Auth (Dashboard → Authentication → Users)
2. User profiles are stored in KV store with key `user:{userId}`
