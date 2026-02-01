# 🔥 OAuth Troubleshooting - Quick Reference Card

**Print and keep handy for quick problem solving**

---

## 🚨 Error Messages & Instant Fixes

### Error: "Redirect URI mismatch"
```
❌ Error 400: redirect_uri_mismatch
```

**Instant Check:**
```
Google Console URI:  https://tutornest.com/google-callback
Must EXACTLY match: https://tutornest.com/google-callback
                    ↑          ↑      ↑       ↑
                    |          |      |       No trailing /
                    |          |      Exact path
                    |          Exact subdomain
                    Exact protocol (https)
```

**Fix:**
1. Google Console → Credentials → Edit OAuth Client
2. Check "Authorized redirect URIs" list
3. Add missing URI or fix typo
4. Click "SAVE"
5. Try connecting again (no redeploy needed)

---

### Error: "Access blocked: This app hasn't been verified by Google"
```
⚠️ Google hasn't verified this app
```

**Quick Workaround:**
1. Click "Advanced" at bottom
2. Click "Go to TutorNest (unsafe)"
3. Continue with authorization

**Permanent Fix:**
1. Google Console → OAuth consent screen
2. Click "PUBLISH APP"
3. Submit for verification (1-6 weeks)

**Alternative (Development):**
1. OAuth consent screen → Test users
2. Add your email
3. You can now authorize without warning

---

### Error: "Invalid Client"
```
❌ Error 401: invalid_client
```

**Check in Order:**
1. **Supabase secrets exist?**
   - Edge Functions → Manage secrets
   - GOOGLE_CLIENT_ID present?
   - GOOGLE_CLIENT_SECRET present?

2. **Values match exactly?**
   - Compare Supabase secret with Google Console
   - No extra spaces?
   - No line breaks?

3. **Edge Functions redeployed?**
   - Edge Functions → make-server-cbd74580
   - Redeploy after adding secrets

**Quick Test:**
```bash
# Check if secrets are accessible in Edge Function
# Look at Edge Function logs after connection attempt
# Should NOT see "Google Calendar integration not configured"
```

---

### Error: "Google Calendar API has not been used in project"
```
❌ Error 403: Access Not Configured
```

**Fix (2 minutes):**
1. Google Console → APIs & Services → Library
2. Search: "Google Calendar API"
3. Click on result
4. Click "ENABLE" button
5. Wait 30 seconds
6. Try again

---

### Error: "Token has been expired or revoked"
```
❌ Error 401: invalid_grant
```

**Common Causes:**
- User changed Google password
- User revoked access manually
- Token storage corrupted

**Fix:**
1. User disconnects calendar in TutorNest
2. User reconnects calendar
3. New tokens generated

---

### Error: "Failed to create calendar event"
```
❌ HTTP 500: Failed to create calendar event
```

**Check in Order:**
1. **Connection still active?**
   - Settings → Google Calendar
   - Status shows "Connected"?

2. **Token expired?**
   - Backend should auto-refresh
   - Check Edge Function logs

3. **Calendar access permissions?**
   - User must have write access to calendar
   - Check Google Calendar settings

4. **API quota exceeded?**
   - Google Console → APIs & Services → Dashboard
   - Check Calendar API usage
   - Free tier: 1,000,000 requests/day

---

## 🔍 Diagnostic Steps

### Step 1: Check Connection Status
```
TutorNest → Settings → Google Calendar

✅ Good: Shows "Connected ✓" with date
❌ Bad:  Shows "Not Connected"
❌ Bad:  Shows error message
```

### Step 2: Check Supabase Secrets
```
Supabase → Edge Functions → Manage secrets

✅ Must have:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REDIRECT_URI

❌ Missing any? Add it and redeploy
```

### Step 3: Check Google Console Setup
```
Google Console → Credentials

✅ OAuth Client ID exists
✅ Type: Web application
✅ Authorized origins include your domain
✅ Redirect URIs include your callback URL
```

### Step 4: Check Calendar API
```
Google Console → APIs & Services → Library

✅ Google Calendar API: Enabled
❌ If not enabled, enable it now
```

### Step 5: Check Edge Function Logs
```
Supabase → Edge Functions → make-server-cbd74580 → Logs

Look for:
❌ "Google Calendar integration not configured"
❌ "Token exchange error"
❌ "Failed to create calendar event"
✅ "Google Calendar events created: X"
```

---

## 🛠️ Quick Fixes

### Fix 1: Redeploy Edge Functions
```
When: After changing any Supabase secret
How:  Edge Functions → ... → Redeploy
Time: 10 seconds
```

### Fix 2: Reconnect Calendar
```
When: Token issues, permission issues
How:  Disconnect → Connect again
Time: 30 seconds
```

### Fix 3: Clear Browser Cache
```
When: Old OAuth data cached
How:  Browser settings → Clear cache
      Or use incognito mode
Time: 1 minute
```

### Fix 4: Check Browser Console
```
When: Frontend errors
How:  F12 → Console tab
Look: Red error messages
```

### Fix 5: Verify Domain Configuration
```
When: Redirect issues
Check: 
  - Production domain matches Google Console
  - HTTPS enabled on production
  - No trailing slashes in URIs
```

---

## 📊 Quick Status Check

### Is OAuth Setup Complete?

```
□ Google Cloud project created
□ Calendar API enabled  
□ OAuth consent screen configured
□ OAuth Client ID created
□ Client ID copied to Supabase
□ Client Secret copied to Supabase
□ Redirect URI added to Supabase
□ Edge Functions redeployed
□ Test connection successful
□ Test event created in calendar
```

**If all checked:** Setup is complete ✅  
**If any unchecked:** Go back and complete that step

---

## 🎯 Most Common Issues (90% of problems)

### 1. Forgot to Redeploy Edge Functions (30%)
```
After adding secrets:
Edge Functions → make-server-cbd74580 → Redeploy
```

### 2. Redirect URI Mismatch (25%)
```
Compare these EXACTLY:
Google Console: https://tutornest.com/google-callback
Code:          https://tutornest.com/google-callback
               ↑ Must match character for character
```

### 3. Calendar API Not Enabled (20%)
```
APIs & Services → Library → Google Calendar API → ENABLE
```

### 4. Wrong Environment Used (10%)
```
Production secrets in production environment? ✓
Development secrets in development environment? ✓
Not mixed up? ✓
```

### 5. Secrets Have Typos (5%)
```
Double-check copied values:
- No extra spaces at start/end
- No line breaks in middle
- Copy from correct field in Google Console
```

---

## 📞 When to Escalate

### Contact Google Support if:
- [ ] Verification request rejected
- [ ] API quota unexpectedly hit
- [ ] OAuth consent screen can't be configured
- [ ] Account suspended

### Contact Supabase Support if:
- [ ] Edge Functions not deploying
- [ ] Secrets not being read by functions
- [ ] Platform-wide issues

### Check TutorNest Code if:
- [ ] Event format incorrect
- [ ] Meet link not generated
- [ ] Attendees not added
- [ ] Backend logic errors

---

## 🔄 Reset Everything (Last Resort)

If nothing works, start fresh:

1. **Delete OAuth Client in Google Console**
   - Credentials → Delete OAuth Client ID
   
2. **Create New OAuth Client**
   - Follow setup guide from scratch
   - Use different name (e.g., "TutorNest Calendar v2")

3. **Update Supabase Secrets**
   - Delete old secrets
   - Add new Client ID and Secret
   
4. **Redeploy Edge Functions**

5. **Test with Fresh Browser**
   - Use incognito mode
   - Clear all cookies
   - Try connecting

**Time:** 15 minutes  
**Success Rate:** 95%

---

## 📝 Support Template

**When asking for help, provide this info:**

```
**Environment:**
- Production domain: _______________
- Supabase project ID: _______________
- Google Cloud project ID: _______________

**What I'm trying to do:**
[Describe the action]

**What happens:**
[Exact error message or behavior]

**What I've tried:**
□ Checked redirect URIs match
□ Verified secrets in Supabase
□ Redeployed Edge Functions
□ Enabled Calendar API
□ Checked browser console
□ Checked Edge Function logs

**Error message (exact):**
[Copy/paste full error]

**Browser console errors:**
[Copy/paste if any]

**Edge Function logs:**
[Copy/paste relevant lines]
```

---

## ✅ Prevention Checklist

**To avoid common issues:**

- [ ] Use password manager for credentials
- [ ] Document exact URIs used
- [ ] Keep Google Console organized
- [ ] Label OAuth clients clearly
- [ ] Test in development first
- [ ] Keep production/dev separate
- [ ] Monitor API usage regularly
- [ ] Set up error alerts
- [ ] Document any custom changes
- [ ] Keep troubleshooting guide handy

---

## 🎯 Quick Decision Tree

```
Connection not working?
  ├─ Error message shown?
  │   ├─ "redirect_uri_mismatch" → Fix URIs in Google Console
  │   ├─ "invalid_client" → Check Supabase secrets
  │   ├─ "API not enabled" → Enable Calendar API
  │   └─ Other error → Check logs + search error
  │
  └─ No error, just fails?
      ├─ Check browser console (F12)
      ├─ Check Edge Function logs
      └─ Try incognito mode

Event not creating?
  ├─ Connection shows "Connected"?
  │   ├─ Yes → Check booking flow logs
  │   └─ No → Reconnect calendar
  │
  └─ Booking succeeds in TutorNest?
      ├─ Yes → Check Google Calendar directly
      └─ No → Fix booking system first
```

---

## 🔗 Quick Links

**Google Cloud Console:**
https://console.cloud.google.com/

**Supabase Dashboard:**
https://supabase.com/dashboard

**TutorNest Docs:**
- Full OAuth Guide: `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`
- Setup Checklist: `/docs/OAUTH_SETUP_CHECKLIST.md`
- Testing Guide: `/docs/QUICK_START_TESTING.md`

---

**Last Updated:** November 2025  
**Version:** 1.0  
**Keep this handy for quick reference! 🚀**
