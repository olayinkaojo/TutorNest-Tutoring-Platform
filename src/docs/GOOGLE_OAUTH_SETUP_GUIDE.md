# 🔐 Google OAuth Setup Guide for TutorNest Production

## Overview

This guide will walk you through setting up Google OAuth 2.0 credentials for the TutorNest Google Calendar integration in **production**. This is required for the booking system's calendar sync features to work.

**Time Required:** 15-20 minutes  
**Cost:** Free (Google Cloud free tier)  
**Prerequisites:** Google account with admin access

---

## 📋 What You'll Need

- [ ] Google account (can be personal or business)
- [ ] Access to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Access to your Supabase project dashboard
- [ ] Your production domain name (e.g., tutornest.com)

---

## 🚀 Step-by-Step Setup

### Part 1: Google Cloud Console Setup (10 minutes)

#### Step 1: Create or Select a Google Cloud Project

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the **project dropdown** at the top (says "Select a project" or shows current project)
   - Click **"NEW PROJECT"** button
   - **Project Name:** Enter "TutorNest Production" (or your preferred name)
   - **Location:** Leave as "No organization" (unless you have a Google Workspace org)
   - Click **"CREATE"**
   - Wait 10-15 seconds for project creation

3. **Select Your New Project**
   - Click the **project dropdown** again
   - Select **"TutorNest Production"** from the list
   - Verify it shows at the top of the console

**✅ Checkpoint:** You should see "TutorNest Production" at the top of the Google Cloud Console

---

#### Step 2: Enable Google Calendar API

1. **Navigate to APIs & Services**
   - In the left sidebar, click ☰ (hamburger menu)
   - Hover over **"APIs & Services"**
   - Click **"Library"**

2. **Search for Calendar API**
   - In the search box, type: **"Google Calendar API"**
   - Click on **"Google Calendar API"** in the results

3. **Enable the API**
   - Click the blue **"ENABLE"** button
   - Wait 5-10 seconds for activation
   - You'll be redirected to the API overview page

**✅ Checkpoint:** You should see "API enabled" with a green checkmark

---

#### Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen**
   - In the left sidebar, click **"OAuth consent screen"**
   - (Or go to: APIs & Services → OAuth consent screen)

2. **Choose User Type**
   - Select **"External"** (allows any Google user to connect)
   - Click **"CREATE"**

3. **Fill in App Information (Page 1)**

   **App Information:**
   - **App name:** `TutorNest`
   - **User support email:** Your email (e.g., support@tutornest.com)
   - **App logo:** (Optional) Upload your TutorNest logo (120x120px PNG)

   **App Domain:**
   - **Application home page:** `https://tutornest.com` (your domain)
   - **Application privacy policy:** `https://tutornest.com/privacy` (create this page)
   - **Application terms of service:** `https://tutornest.com/terms` (create this page)

   **Authorized Domains:**
   - Click **"ADD DOMAIN"**
   - Enter: `tutornest.com` (your domain, without https://)
   - If using Supabase: Also add `supabase.co`

   **Developer Contact Information:**
   - **Email addresses:** Your email (e.g., dev@tutornest.com)

   - Click **"SAVE AND CONTINUE"**

4. **Configure Scopes (Page 2)**
   - Click **"ADD OR REMOVE SCOPES"**
   - In the filter box, search for: `calendar`
   - **Select these scopes:**
     - ✅ `https://www.googleapis.com/auth/calendar` - See, edit, share, and permanently delete all calendars
     - ✅ `https://www.googleapis.com/auth/calendar.events` - View and edit events on all your calendars

   - Click **"UPDATE"** at the bottom
   - Verify 2 scopes are listed
   - Click **"SAVE AND CONTINUE"**

5. **Test Users (Page 3)**
   - For production: Skip this (no test users needed)
   - Click **"SAVE AND CONTINUE"**

6. **Summary (Page 4)**
   - Review all information
   - Click **"BACK TO DASHBOARD"**

**✅ Checkpoint:** OAuth consent screen configured with 2 calendar scopes

---

#### Step 4: Create OAuth 2.0 Credentials

1. **Navigate to Credentials**
   - In the left sidebar, click **"Credentials"**
   - (Or go to: APIs & Services → Credentials)

2. **Create OAuth Client ID**
   - Click **"+ CREATE CREDENTIALS"** at the top
   - Select **"OAuth client ID"** from the dropdown

3. **Configure OAuth Client**

   **Application type:**
   - Select: **"Web application"**

   **Name:**
   - Enter: `TutorNest Calendar Integration`

   **Authorized JavaScript origins:**
   - Click **"+ ADD URI"**
   - Add these URIs (replace with your actual domains):
     ```
     https://tutornest.com
     https://www.tutornest.com
     http://localhost:5173
     ```
     (Include localhost for local development testing)

   **Authorized redirect URIs:**
   - Click **"+ ADD URI"**
   - Add these URIs:
     ```
     https://tutornest.com/google-callback
     https://www.tutornest.com/google-callback
     https://[your-project-id].supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback
     http://localhost:5173/google-callback
     ```
     
     **Important:** Replace `[your-project-id]` with your actual Supabase project ID
     
     **To find your Supabase project ID:**
     - Go to your Supabase dashboard
     - Look at the URL: `https://supabase.com/dashboard/project/[PROJECT_ID]`
     - Or check Project Settings → General → Reference ID

   - Click **"CREATE"**

4. **Save Your Credentials**
   - A popup appears: "OAuth client created"
   - **Download the JSON** (optional, for backup)
   - **Copy the Client ID** - You'll need this!
   - **Copy the Client Secret** - You'll need this!
   
   ```
   Example:
   Client ID:     123456789-abc123.apps.googleusercontent.com
   Client Secret: GOCSPX-abcdefghijklmnop_123456
   ```

   - Store these securely (use password manager)
   - Click **"OK"**

**✅ Checkpoint:** You have Client ID and Client Secret copied

---

### Part 2: Supabase Configuration (5 minutes)

#### Step 5: Add Environment Variables to Supabase

1. **Open Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your TutorNest project

2. **Navigate to Edge Functions Secrets**
   - In the left sidebar, click **"Edge Functions"**
   - Click the **"Manage secrets"** button at the top right
   - (Or go to: Project Settings → Edge Functions → Secrets)

3. **Add GOOGLE_CLIENT_ID**
   - Click **"New secret"** button
   - **Name:** `GOOGLE_CLIENT_ID`
   - **Value:** Paste your Client ID from Google Cloud Console
     ```
     Example: 123456789-abc123.apps.googleusercontent.com
     ```
   - Click **"Create secret"**

4. **Add GOOGLE_CLIENT_SECRET**
   - Click **"New secret"** button again
   - **Name:** `GOOGLE_CLIENT_SECRET`
   - **Value:** Paste your Client Secret from Google Cloud Console
     ```
     Example: GOCSPX-abcdefghijklmnop_123456
     ```
   - Click **"Create secret"**

5. **Add GOOGLE_REDIRECT_URI**
   - Click **"New secret"** button again
   - **Name:** `GOOGLE_REDIRECT_URI`
   - **Value:** Your production redirect URI
     ```
     For production: https://tutornest.com/google-callback
     For Supabase: https://[project-id].supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback
     ```
   - Click **"Create secret"**

6. **Verify All Secrets Added**
   - You should now see 3 new secrets:
     - ✅ GOOGLE_CLIENT_ID
     - ✅ GOOGLE_CLIENT_SECRET
     - ✅ GOOGLE_REDIRECT_URI

**✅ Checkpoint:** All 3 environment variables configured in Supabase

---

#### Step 6: Redeploy Edge Functions (If Needed)

If your Edge Functions are already deployed, you need to redeploy them to pick up the new environment variables.

**Option A: Via Supabase Dashboard**
1. Go to **Edge Functions** in the sidebar
2. Find your `make-server-cbd74580` function
3. Click the **"..."** menu
4. Select **"Redeploy"**
5. Wait for deployment to complete

**Option B: Via CLI (If you have Supabase CLI setup)**
```bash
supabase functions deploy make-server-cbd74580
```

**✅ Checkpoint:** Edge Functions redeployed with new secrets

---

### Part 3: Testing the Integration (5 minutes)

#### Step 7: Test OAuth Flow

1. **Open TutorNest in Production**
   - Navigate to: https://tutornest.com (your domain)
   - Sign in to a tutor or parent account

2. **Navigate to Google Calendar Settings**
   - Go to: Settings → Google Calendar
   - Or: Profile → Calendar Integration

3. **Initiate Connection**
   - Click **"Connect Google Calendar"** button
   - You should be redirected to Google OAuth consent screen

4. **Verify OAuth Consent Screen**
   - **Check that it shows:**
     - ✅ App name: "TutorNest"
     - ✅ App logo (if you uploaded one)
     - ✅ "This app wants to access your Google Account"
     - ✅ Permissions requested: "See, edit, share, and permanently delete all the calendars you can access using Google Calendar"

5. **Grant Permission**
   - Review the permissions
   - Click your Google account
   - Click **"Allow"** (or "Continue")

6. **Verify Redirect Back**
   - You should be redirected back to TutorNest
   - Success message appears: "Google Calendar connected successfully!"
   - Connection status shows: "Connected ✓"

7. **Test Calendar Event Creation**
   - Book a test tutoring session
   - Check Google Calendar
   - **Verify:**
     - ✅ Event appears in calendar
     - ✅ Event has correct time and date
     - ✅ Event includes description and details
     - ✅ Google Meet link is present
     - ✅ Attendees are added

**✅ Success! Google OAuth is working in production!**

---

## 🔒 Security Best Practices

### 1. Protect Your Credentials

**DO:**
- ✅ Store Client Secret in environment variables only
- ✅ Never commit credentials to Git
- ✅ Use Supabase secrets for production
- ✅ Rotate credentials if compromised
- ✅ Limit access to Google Cloud Console

**DON'T:**
- ❌ Hardcode credentials in source code
- ❌ Share credentials via email or chat
- ❌ Commit .env files to version control
- ❌ Expose Client Secret in frontend code

### 2. Restrict OAuth Scopes

Only request the minimum scopes needed:
- ✅ `calendar` - For reading and creating events
- ✅ `calendar.events` - For managing events
- ❌ Don't request unnecessary scopes

### 3. Configure Authorized Domains

Whitelist only your actual domains:
- ✅ Production domain (tutornest.com)
- ✅ Supabase domain (if using Edge Functions)
- ✅ Localhost (for development only)
- ❌ Don't use wildcards in production

### 4. Implement Token Security

Your backend already handles this, but verify:
- ✅ Tokens stored encrypted in KV store
- ✅ Automatic token refresh implemented
- ✅ Token expiry handling in place
- ✅ Secure token transmission (HTTPS only)

---

## 🚨 Troubleshooting

### Issue 1: "Redirect URI mismatch" Error

**Symptoms:**
- Error after clicking "Allow" on Google consent screen
- URL in error message doesn't match configured URI

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Check "Authorized redirect URIs"
4. Ensure it EXACTLY matches the URI in your code
5. Common mistakes:
   - Missing trailing slash
   - HTTP vs HTTPS
   - Wrong subdomain (www vs non-www)
   - Wrong path

**Fix:**
```
❌ Wrong: http://tutornest.com/google-callback/
❌ Wrong: https://www.tutornest.com/callback
✅ Right: https://tutornest.com/google-callback
```

---

### Issue 2: "Access blocked: Authorization Error"

**Symptoms:**
- "This app hasn't been verified by Google" error
- Cannot proceed past consent screen in production

**Solution:**

**Option A: Verify Your App (Recommended for production)**
1. Go to Google Cloud Console → OAuth consent screen
2. Click **"PUBLISH APP"** button
3. Google will review your app (takes 1-6 weeks)
4. Provide documentation as requested

**Option B: Continue with Unverified App (Quick fix)**
1. On the consent screen, click **"Advanced"**
2. Click **"Go to TutorNest (unsafe)"**
3. Proceed with authorization
4. Note: Only works for your own account and test users

**Option C: Add Test Users (Development)**
1. Go to OAuth consent screen → Test users
2. Add your email addresses (up to 100)
3. These users can authorize without verification

---

### Issue 3: "Invalid Client" Error

**Symptoms:**
- Error immediately when trying to connect
- "Error 401: invalid_client"

**Solution:**
1. Verify environment variables in Supabase
2. Check GOOGLE_CLIENT_ID matches exactly (no extra spaces)
3. Check GOOGLE_CLIENT_SECRET matches exactly
4. Redeploy Edge Functions after adding secrets
5. Check that Edge Functions have access to secrets

**Verify in Supabase:**
```
Edge Functions → Manage secrets
✓ GOOGLE_CLIENT_ID exists
✓ GOOGLE_CLIENT_SECRET exists  
✓ GOOGLE_REDIRECT_URI exists
```

---

### Issue 4: Calendar API Not Enabled

**Symptoms:**
- "Google Calendar API has not been used in project..."
- Error 403: Access Not Configured

**Solution:**
1. Go to Google Cloud Console
2. APIs & Services → Library
3. Search "Google Calendar API"
4. Click on it
5. Click "ENABLE"
6. Wait 30 seconds and try again

---

### Issue 5: Token Refresh Fails

**Symptoms:**
- "Google Calendar not connected or token expired"
- Events stop syncing after some time

**Solution:**
1. Check that refresh token is being stored
2. Verify `access_type=offline` in OAuth URL
3. Verify `prompt=consent` in OAuth URL
4. Disconnect and reconnect calendar
5. Check backend logs for refresh errors

**Check in backend code:**
```typescript
// Verify OAuth URL includes:
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(scopes)}&` +
  `access_type=offline&` +  // ← Required for refresh token
  `prompt=consent&` +       // ← Forces new consent to get refresh token
  `state=${state}`;
```

---

### Issue 6: Events Not Creating in Calendar

**Symptoms:**
- Booking succeeds in TutorNest
- No event appears in Google Calendar
- No error message shown

**Solution:**
1. Check browser console for API errors
2. Check Supabase Edge Function logs
3. Verify user calendar connection is active
4. Test with manual API call
5. Check Google Calendar API quota (free tier: 1M requests/day)

**Debug steps:**
1. Go to Google Cloud Console → APIs & Services → Dashboard
2. Check "Google Calendar API" usage
3. Click on it to see error rates
4. Check for 403 or 429 errors

---

## 📊 Monitoring & Maintenance

### Check API Usage

**Weekly:**
1. Go to Google Cloud Console
2. APIs & Services → Dashboard
3. Check "Google Calendar API"
4. Monitor:
   - ✅ Request count (should be < 1M/day for free tier)
   - ✅ Error rate (should be < 5%)
   - ✅ Latency (should be < 1 second)

### Monitor User Connections

**Daily:**
1. Check how many users have connected calendars
2. Monitor disconnection rate
3. Check for error spikes in logs

**Track in your database:**
```sql
-- Count connected users
SELECT COUNT(*) FROM users WHERE google_calendar_connected = true;

-- Check recent connections
SELECT * FROM users 
WHERE google_calendar_connected_at > NOW() - INTERVAL '7 days';
```

### Review OAuth Consent Screen

**Monthly:**
1. Check for any warnings in Google Cloud Console
2. Verify app information is up to date
3. Update privacy policy if features change
4. Review and update scopes if needed

---

## 🎓 Production Checklist

Before launching to real users:

### Google OAuth Setup
- [ ] Project created in Google Cloud Console
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured with branding
- [ ] Privacy policy and terms pages created and linked
- [ ] OAuth Client ID created for web application
- [ ] All production domains added to authorized origins
- [ ] All redirect URIs configured correctly
- [ ] Client ID and Client Secret copied securely

### Supabase Configuration
- [ ] GOOGLE_CLIENT_ID added as secret
- [ ] GOOGLE_CLIENT_SECRET added as secret
- [ ] GOOGLE_REDIRECT_URI added as secret
- [ ] Edge Functions redeployed with new secrets
- [ ] Secrets verified in Supabase dashboard

### Testing
- [ ] OAuth flow tested from production domain
- [ ] Connection succeeds without errors
- [ ] Events created in Google Calendar successfully
- [ ] Meet links generated correctly
- [ ] Both tutor and parent events created
- [ ] Disconnection works properly
- [ ] Token refresh tested (wait 1 hour)

### Security
- [ ] Credentials stored securely (password manager)
- [ ] Credentials not committed to Git
- [ ] HTTPS enforced on all domains
- [ ] Only minimum scopes requested
- [ ] Backend validates all tokens
- [ ] Frontend never receives Client Secret

### Documentation
- [ ] User guide created for calendar connection
- [ ] Support team trained on OAuth issues
- [ ] Troubleshooting guide accessible
- [ ] Privacy policy mentions calendar access
- [ ] Terms mention data usage

### Monitoring
- [ ] API usage monitoring set up
- [ ] Error logging enabled
- [ ] User connection metrics tracked
- [ ] Alert system for API quota issues
- [ ] Backup plan if Google services down

---

## 📝 Environment Variables Reference

### Required Variables

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop_123456
GOOGLE_REDIRECT_URI=https://tutornest.com/google-callback

# Already configured (don't change)
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### Where to Get Each Value

| Variable | Where to Find |
|----------|--------------|
| GOOGLE_CLIENT_ID | Google Cloud Console → Credentials → OAuth 2.0 Client IDs |
| GOOGLE_CLIENT_SECRET | Same place as Client ID (click to reveal) |
| GOOGLE_REDIRECT_URI | Your production domain + `/google-callback` |
| SUPABASE_URL | Supabase Dashboard → Project Settings → API |
| SUPABASE_ANON_KEY | Supabase Dashboard → Project Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard → Project Settings → API |

---

## 🔄 Updating OAuth Credentials

If you need to update credentials (e.g., after rotation):

1. **Generate New Credentials in Google Cloud**
   - Go to Credentials
   - Create new OAuth Client ID
   - Or edit existing and regenerate secret

2. **Update Supabase Secrets**
   - Edge Functions → Manage secrets
   - Delete old secrets
   - Add new secrets with same names

3. **Redeploy Edge Functions**
   - Trigger redeployment
   - Wait for completion

4. **Notify Users**
   - Existing connections will continue working
   - New connections use new credentials
   - Optional: Ask users to reconnect

---

## 🌐 Multi-Domain Setup

If you have multiple domains (e.g., tutornest.com, tutornest.co.uk):

### Add All Domains to Google Cloud

**Authorized JavaScript origins:**
```
https://tutornest.com
https://www.tutornest.com
https://tutornest.co.uk
https://www.tutornest.co.uk
```

**Authorized redirect URIs:**
```
https://tutornest.com/google-callback
https://www.tutornest.com/google-callback
https://tutornest.co.uk/google-callback
https://www.tutornest.co.uk/google-callback
```

### Use Dynamic Redirect URI in Code

The current implementation already uses the domain where the OAuth flow started.

---

## 📞 Support & Resources

### Official Documentation
- **Google OAuth 2.0:** https://developers.google.com/identity/protocols/oauth2
- **Google Calendar API:** https://developers.google.com/calendar
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

### TutorNest Documentation
- **Booking System Guide:** `/docs/GOOGLE_CALENDAR_BOOKING_GUIDE.md`
- **Testing Guide:** `/docs/STEP_BY_STEP_TESTING_GUIDE.md`
- **Quick Start:** `/docs/QUICK_START_TESTING.md`

### Getting Help

**Google Cloud Console Issues:**
- Google Cloud Support: https://cloud.google.com/support
- Stack Overflow: Tag `google-oauth` + `google-calendar-api`

**Supabase Issues:**
- Supabase Discord: https://discord.supabase.com
- Supabase GitHub: https://github.com/supabase/supabase

---

## ✅ Final Verification

After completing setup, verify everything works:

```
✓ Google Cloud project created
✓ Calendar API enabled
✓ OAuth consent screen configured
✓ OAuth Client ID created
✓ Client ID and Secret saved securely
✓ Supabase secrets configured
✓ Edge Functions redeployed
✓ Test connection successful
✓ Test booking creates calendar event
✓ Meet link generated
✓ Both parties receive event
✓ Token refresh works
✓ Disconnection works
```

---

## 🎉 Congratulations!

Your Google Calendar OAuth integration is now set up for production! 

**Next Steps:**
1. Test with a few beta users
2. Monitor API usage and errors
3. Gather user feedback
4. Consider app verification if going public
5. Set up monitoring alerts

**You're ready to launch! 🚀**
