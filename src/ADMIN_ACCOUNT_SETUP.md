# TutorNest Admin Account Setup Guide

## Quick Setup for Testing

If you're getting "Invalid email or password" errors, you need to create an account first.

### Option 1: Create Admin Account (Recommended for Testing)

1. **Go to the Sign Up page** on TutorNest
2. **Use any admin email** (must include "admin@"):
   - Example: `admin@tutornest.com`
   - Example: `test.admin@tutornest.com`
   - Example: `admin@yourcompany.com`

3. **Fill in the details**:
   - Email: `admin@tutornest.com` (or your preferred admin email)
   - Password: At least 6 characters
   - Name: Admin User

4. **Submit** - The account will be created automatically and you'll be logged in

**Auto-Features for Admin Accounts:**
- ✅ Automatically assigned `admin` role
- ✅ Onboarding auto-completed
- ✅ Full access to Admin Dashboard
- ✅ Email auto-confirmed (no verification needed)

---

### Option 2: Create Test Accounts via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: `https://supabase.com/dashboard`
   - Select your project

2. **Navigate to Authentication**
   - Click "Authentication" in sidebar
   - Click "Users" tab

3. **Add User**
   - Click "Add User" button
   - Enter email and password
   - ✅ Check "Auto Confirm Email"
   - Click "Create User"

4. **Sign In on TutorNest**
   - Use the email and password you just created

---

### Option 3: Use Signup Flow

#### For Parents:
1. Click "Sign Up" on login page
2. Select "Parent" role
3. Fill in: Email, Password, Name, Phone
4. Submit → Redirected to login
5. Sign in with your credentials

#### For Tutors:
1. Click "Become a Tutor" on login page
2. Fill in all tutor details (qualifications, subjects, etc.)
3. Submit → Redirected to login
4. Sign in with your credentials

#### For Students:
1. Click "Become a Student" on login page
2. Fill in student details (grade, subjects, etc.)
3. Submit → Redirected to login
4. Sign in with your credentials

---

## Common Authentication Issues

### ❌ "Invalid email or password"

**Causes:**
1. Account doesn't exist yet → **Create account first**
2. Wrong password → Check your password
3. Typo in email → Verify email address

**Solution:**
- If you don't have an account, use the signup flows above
- If you forgot password, click "Forgot password?" on login page

---

### ❌ "Email not confirmed"

**This should NOT happen** because we use `email_confirm: true` in signup.

**If it does happen:**

**Option A - Disable Email Confirmation (Recommended for Development):**
1. Go to Supabase Dashboard
2. Navigate to: `Authentication` → `Email Auth`
3. Find "Confirm email" toggle
4. Turn it **OFF**
5. Try logging in again

**Option B - Confirm via Dashboard:**
1. Go to Supabase Dashboard → Authentication → Users
2. Find your user
3. Click on the user
4. Look for "Email Confirmed" field
5. If it says "false", manually set it to "true"

---

## Test Credentials (After Creating Account)

Once you've created accounts, you can use:

**Admin Account:**
- Email: `admin@tutornest.com`
- Password: [the one you set during creation]

**Parent Account:**
- Email: [your parent email]
- Password: [your password]

**Tutor Account:**
- Email: [your tutor email]
- Password: [your password]

**Student Account:**
- Email: [your student email]
- Password: [your password]

---

## Creating Multiple Role Accounts

You can create accounts with **multiple roles** (e.g., someone who is both a parent AND a tutor):

1. **Create first account** (e.g., as Parent)
   - Sign up as parent
   - Complete profile

2. **Add tutor role**
   - Go to "Become a Tutor" from dashboard
   - Complete tutor application
   - Now you have both roles!

3. **Switch between roles**
   - Use the role switcher in your dashboard header
   - Toggle between Parent and Tutor views

---

## Verification Checklist

✅ **Before Testing:**
- [ ] Created at least one admin account
- [ ] Email contains "admin@" for admin access
- [ ] Password is at least 6 characters
- [ ] Account is created (check Supabase Dashboard → Authentication → Users)
- [ ] Email confirmation is disabled OR email is confirmed

✅ **Can Sign In When:**
- [ ] Account exists in Supabase Auth
- [ ] Using correct email (exact match, case-insensitive)
- [ ] Using correct password (case-sensitive)
- [ ] Email is confirmed (or confirmation disabled)

❌ **Cannot Sign In When:**
- [ ] Account doesn't exist (create it first!)
- [ ] Wrong password
- [ ] Email typo
- [ ] Email not confirmed (and confirmation enabled)

---

## Quick Test Flow

1. **Create Admin Account:**
   ```
   Email: admin@tutornest.com
   Password: admin123456
   Name: Admin User
   ```

2. **Sign In:**
   - Go to login page
   - Enter email: admin@tutornest.com
   - Enter password: admin123456
   - Click "Proceed"

3. **Verify:**
   - Should see Admin Dashboard
   - Check that all features work

4. **Create Other Accounts:**
   - Use signup flows for Parent, Tutor, Student
   - Test each dashboard

---

## Need Help?

**Check these logs:**
1. Browser Console (F12 → Console tab)
   - Look for authentication errors
   - Check for network errors

2. Supabase Dashboard Logs
   - Go to: Logs → Edge Functions
   - Check for signup/login errors

3. Network Tab (F12 → Network)
   - Check `/signup` and `/profile` requests
   - Look for 401/403/500 errors

**Common Solutions:**
- Clear browser cache and cookies
- Try incognito/private window
- Check Supabase project is running
- Verify Edge Functions are deployed
- Ensure environment variables are set

---

**Last Updated:** December 2024
