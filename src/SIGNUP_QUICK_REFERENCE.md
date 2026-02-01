# Signup Error Quick Reference

## 🔍 Quick Diagnosis

### Where to Look First

1. **Browser Console (F12)** → See what the client sees
2. **Supabase Dashboard → Edge Functions → Logs** → See what the server sees
3. **Network Tab (F12)** → See if requests are reaching server

---

## 🚨 Common Error Messages

### ❌ "Network error: Unable to connect to server"
**Meaning:** Can't reach the Edge Function  
**Check:**
- [ ] Internet connection working?
- [ ] Edge Function deployed?
- [ ] Correct projectId in `/utils/supabase/info.tsx`?

**Quick Fix:**
```bash
# Check if function is accessible
curl https://YOUR-PROJECT.supabase.co/functions/v1/make-server-cbd74580/signup
```

---

### ❌ "Invalid server response"
**Meaning:** Server returned non-JSON data  
**Check:**
- [ ] Server logs for crashes
- [ ] Server code syntax errors
- [ ] Response format

**Look For:** Error page HTML instead of JSON

---

### ❌ "A user with this email already exists"
**Meaning:** Email already registered (EXPECTED BEHAVIOR)  
**Solution:** User should:
- Use sign-in page
- Or reset password if forgot

---

### ❌ "Please enter a valid email address"
**Meaning:** Email format invalid  
**Examples:**
- ❌ `notanemail`
- ❌ `missing@domain`
- ✅ `user@example.com`

---

### ❌ "Password must be at least 6 characters long"
**Meaning:** Password too short  
**Supabase Requirement:** Minimum 6 characters

---

### ❌ "Email, password, and name are required"
**Meaning:** Missing required fields  
**Check:** All fields filled in the form

---

## 🔧 Quick Diagnostic Commands

### Test Endpoint Health
```bash
curl https://YOUR-PROJECT.supabase.co/functions/v1/make-server-cbd74580/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'
```

**Expected Response:**
```json
{"success":true,"user":{...},"isAdmin":false}
```

**Or (if email exists):**
```json
{"error":"A user with this email already exists..."}
```

---

## 📊 Log Patterns

### ✅ Successful Signup Logs

**Browser Console:**
```
Attempting signup for: user@example.com
Signup response status: 200
Signup response data: { success: true, ... }
```

**Server Logs:**
```
=== SIGNUP ENDPOINT CALLED ===
Signup request for email: user@example.com
User created successfully: abc-123
Signup successful for: user@example.com
```

### ❌ Failed Signup Logs

**Browser Console:**
```
Signup response status: 400
Error from server: Invalid email format
```

**Server Logs:**
```
=== SIGNUP ENDPOINT CALLED ===
Invalid email format: bad-email
```

---

## ⚡ Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Function not deployed | Check Supabase Dashboard → Functions |
| Missing env vars | Check Functions → Settings → Environment Variables |
| User exists | Tell user to sign in instead |
| Network timeout | Check internet, try again |
| Invalid response | Check server logs for errors |

---

## 🎯 Testing Flow

1. **Open Browser DevTools (F12)**
2. **Go to Console tab**
3. **Try signup**
4. **Look for logs starting with:**
   - `Attempting signup for:`
   - `Signup response status:`
   - `Signup response data:`

5. **If error, check:**
   - Status code (400, 500, etc.)
   - Error message
   - Full response data

6. **Then check Supabase logs:**
   - Dashboard → Edge Functions
   - Click on function → Logs
   - Look for `=== SIGNUP ENDPOINT CALLED ===`

---

## 🔐 Environment Variables

**Required in Supabase Dashboard:**

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**How to Check:**
1. Supabase Dashboard
2. Edge Functions
3. Function Settings
4. Environment Variables

**Note:** Already provided by the user, should be set automatically.

---

## 📝 Checklist Before Reporting Bug

- [ ] Checked browser console
- [ ] Checked server logs
- [ ] Verified internet connection
- [ ] Confirmed function is deployed
- [ ] Tested with different email
- [ ] Verified email format is valid
- [ ] Password is at least 6 characters
- [ ] All required fields filled
- [ ] Environment variables exist

---

## 🛠️ Use the Test Utility

For advanced debugging:

1. Add to App.tsx:
```tsx
import { SignupTestUtility } from './components/SignupTestUtility';

if (window.location.pathname === '/test-signup') {
  return <SignupTestUtility />;
}
```

2. Navigate to `/test-signup`
3. Test with different inputs
4. View detailed logs

---

## 📚 Full Documentation

For detailed information, see:
- `/SIGNUP_ERROR_FIX_SUMMARY.md` - Complete fix details
- `/SIGNUP_ERROR_DEBUGGING.md` - Step-by-step debugging

---

## 💡 Pro Tips

1. **Always check both client and server logs**
2. **Use unique email for each test** (to avoid "already exists")
3. **Check Network tab** to see actual request/response
4. **Test with curl** to isolate client vs server issues
5. **Use test utility** for comprehensive debugging

---

## 🆘 Still Stuck?

1. Copy browser console logs
2. Copy server logs from Supabase
3. Note exact steps to reproduce
4. Check if it's user-specific or affects all signups
5. Reference full debugging guide
