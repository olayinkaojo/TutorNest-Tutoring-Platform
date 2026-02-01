# ✅ Google OAuth Setup Checklist

**Print this page and check off each step as you complete it**

---

## 📋 Pre-Setup

- [ ] Google account ready
- [ ] Supabase project access
- [ ] Production domain ready (e.g., tutornest.com)
- [ ] Password manager ready for storing credentials

---

## 🔧 Part 1: Google Cloud Console (10 min)

### Project Creation
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project: "TutorNest Production"
- [ ] Select the project from dropdown
- [ ] **Verify:** Project name shows at top

### Enable Calendar API
- [ ] Navigate to: APIs & Services → Library
- [ ] Search: "Google Calendar API"
- [ ] Click on Google Calendar API
- [ ] Click "ENABLE" button
- [ ] **Verify:** Shows "API enabled"

### OAuth Consent Screen
- [ ] Navigate to: OAuth consent screen
- [ ] Select: "External" user type
- [ ] App name: `TutorNest`
- [ ] Support email: `___________________`
- [ ] Home page: `https://___________________`
- [ ] Privacy policy: `https://___________________/privacy`
- [ ] Terms of service: `https://___________________/terms`
- [ ] Add domain: `___________________` (no https://)
- [ ] Developer email: `___________________`
- [ ] Click "SAVE AND CONTINUE"

### Configure Scopes
- [ ] Click "ADD OR REMOVE SCOPES"
- [ ] Search: "calendar"
- [ ] Select: `https://www.googleapis.com/auth/calendar`
- [ ] Select: `https://www.googleapis.com/auth/calendar.events`
- [ ] Click "UPDATE"
- [ ] **Verify:** 2 scopes listed
- [ ] Click "SAVE AND CONTINUE"

### Create OAuth Client ID
- [ ] Navigate to: Credentials
- [ ] Click "+ CREATE CREDENTIALS"
- [ ] Select: "OAuth client ID"
- [ ] Application type: "Web application"
- [ ] Name: `TutorNest Calendar Integration`

#### Add Authorized JavaScript Origins
- [ ] `https://___________________` (your production domain)
- [ ] `https://www.___________________` (with www)
- [ ] `http://localhost:5173` (for development)

#### Add Authorized Redirect URIs
- [ ] `https://___________________/google-callback`
- [ ] `https://www.___________________/google-callback`
- [ ] `https://[PROJECT-ID].supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback`
- [ ] `http://localhost:5173/google-callback`

#### Save Credentials
- [ ] Click "CREATE"
- [ ] **Copy Client ID:** `_______________________________________`
- [ ] **Copy Client Secret:** `_______________________________________`
- [ ] Download JSON (optional backup)
- [ ] Store in password manager
- [ ] Click "OK"

---

## 🗄️ Part 2: Supabase Configuration (5 min)

### Access Supabase
- [ ] Go to https://supabase.com/dashboard
- [ ] Select TutorNest project
- [ ] Navigate to: Edge Functions → Manage secrets

### Add Environment Variables
- [ ] Click "New secret"
- [ ] Name: `GOOGLE_CLIENT_ID`
- [ ] Value: (paste Client ID)
- [ ] Click "Create secret"

- [ ] Click "New secret"
- [ ] Name: `GOOGLE_CLIENT_SECRET`
- [ ] Value: (paste Client Secret)
- [ ] Click "Create secret"

- [ ] Click "New secret"
- [ ] Name: `GOOGLE_REDIRECT_URI`
- [ ] Value: `https://___________________/google-callback`
- [ ] Click "Create secret"

### Verify Secrets
- [ ] **Check:** GOOGLE_CLIENT_ID visible in list
- [ ] **Check:** GOOGLE_CLIENT_SECRET visible in list
- [ ] **Check:** GOOGLE_REDIRECT_URI visible in list

### Redeploy Edge Functions
- [ ] Edge Functions → Find `make-server-cbd74580`
- [ ] Click "..." menu → "Redeploy"
- [ ] Wait for deployment complete
- [ ] **Verify:** Green "Deployed" status

---

## 🧪 Part 3: Testing (5 min)

### Test OAuth Connection
- [ ] Open production site: `https://___________________`
- [ ] Login as tutor or parent
- [ ] Navigate to: Settings → Google Calendar
- [ ] Click "Connect Google Calendar"
- [ ] **Verify:** Redirects to Google OAuth page

### Verify OAuth Consent
- [ ] **Check:** Shows app name "TutorNest"
- [ ] **Check:** Shows calendar permissions
- [ ] Select Google account
- [ ] Click "Allow"
- [ ] **Verify:** Redirects back to TutorNest

### Verify Connection
- [ ] **Check:** Success message appears
- [ ] **Check:** Status shows "Connected ✓"
- [ ] **Check:** Connection date shown

### Test Event Creation
- [ ] Book a test tutoring session
- [ ] Complete booking flow
- [ ] Open Google Calendar
- [ ] **Verify:** Event appears in calendar
- [ ] **Verify:** Event has correct date/time
- [ ] **Verify:** Google Meet link present
- [ ] **Verify:** Description includes details
- [ ] **Verify:** Attendees are added

---

## 🔒 Security Verification

- [ ] Client Secret stored in password manager
- [ ] Client Secret NOT in source code
- [ ] Client Secret NOT in Git repository
- [ ] Only production domains in authorized origins
- [ ] Only production redirect URIs configured
- [ ] HTTPS enforced on production domain
- [ ] Privacy policy page exists
- [ ] Terms of service page exists

---

## 📊 Post-Setup Tasks

### Documentation
- [ ] Update user guide with OAuth instructions
- [ ] Train support team on connection issues
- [ ] Create FAQ for calendar integration
- [ ] Document troubleshooting steps

### Monitoring Setup
- [ ] Set up Google Cloud Console monitoring
- [ ] Configure API usage alerts
- [ ] Set up error logging
- [ ] Create dashboard for connection metrics

### User Communication
- [ ] Announce calendar integration feature
- [ ] Create tutorial video (optional)
- [ ] Send email to existing users
- [ ] Update marketing materials

---

## 🚨 Troubleshooting Quick Reference

### If "Redirect URI mismatch" error:
1. [ ] Check redirect URI matches EXACTLY in Google Console
2. [ ] Verify HTTP vs HTTPS
3. [ ] Check for trailing slashes
4. [ ] Confirm subdomain (www vs non-www)

### If "Invalid Client" error:
1. [ ] Verify Client ID in Supabase matches Google Console
2. [ ] Verify Client Secret in Supabase matches Google Console
3. [ ] Check for extra spaces in credentials
4. [ ] Redeploy Edge Functions

### If "API not enabled" error:
1. [ ] Go to Google Cloud Console
2. [ ] Enable Google Calendar API
3. [ ] Wait 30 seconds
4. [ ] Try again

### If events not creating:
1. [ ] Check connection status shows "Connected"
2. [ ] Check browser console for errors
3. [ ] Check Supabase Edge Function logs
4. [ ] Verify booking succeeds in TutorNest
5. [ ] Check Google Calendar API quota

---

## 📞 Support Resources

**If you get stuck:**

Google Cloud Issues:
- Docs: https://developers.google.com/identity/protocols/oauth2
- Support: https://cloud.google.com/support

Supabase Issues:
- Docs: https://supabase.com/docs/guides/functions
- Discord: https://discord.supabase.com

TutorNest Docs:
- Full guide: `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`
- Testing: `/docs/QUICK_START_TESTING.md`

---

## ✅ Final Check

Before marking as complete:

- [ ] All Google Cloud Console steps completed
- [ ] All Supabase configuration steps completed
- [ ] Test connection successful
- [ ] Test event creation successful
- [ ] Credentials stored securely
- [ ] Security checklist completed
- [ ] Documentation updated
- [ ] Team trained

---

## 🎉 Setup Complete!

**Date completed:** ___________________  
**Completed by:** ___________________  
**Production URL:** ___________________  
**Notes:** 

_______________________________________________________

_______________________________________________________

_______________________________________________________

---

## 📝 Credentials Record (Keep Secure!)

**Google Cloud Project:**
- Project ID: ___________________
- Project Name: ___________________

**OAuth Client:**
- Client ID: ___________________
- Client Secret: ⚠️ STORED IN PASSWORD MANAGER
- Created date: ___________________

**Supabase Project:**
- Project ID: ___________________
- Secrets added: ___________________

**Domain Configuration:**
- Production: ___________________
- Redirect URI: ___________________

---

**🔐 IMPORTANT:** Store this checklist securely. Do not commit to Git.
