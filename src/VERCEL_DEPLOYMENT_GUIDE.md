# TutorNest Vercel Deployment Guide

## 🚨 IMPORTANT: Understanding Figma Make Architecture

**Figma Make applications are NOT directly exportable to external platforms.**

Your TutorNest application currently runs in Figma Make's environment with:
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Frontend**: React with Vite
- **Database**: Supabase PostgreSQL with KV store
- **Authentication**: Supabase Auth

## Deployment Options

### Option 1: Keep Running in Figma Make (Recommended for Prototyping)
✅ Zero configuration needed
✅ Backend already deployed
✅ Free tier available
✅ Instant updates
❌ Limited to Figma Make environment
❌ Cannot use custom domain easily

### Option 2: Full External Deployment (Production-Ready)
This requires significant reconfiguration and is recommended when you're ready for production.

---

## 📋 DEPLOYMENT CHECKLIST

### Phase 1: Pre-Deployment Preparation

#### 1. Source Code Export
Since Figma Make doesn't have a direct export button, you'll need to:
- [ ] Manually copy all code files from Figma Make
- [ ] Recreate the project structure locally
- [ ] Set up Git repository

#### 2. Environment Setup
- [ ] Create new Supabase project at https://supabase.com
- [ ] Note your new Supabase URL and keys
- [ ] Create Vercel account at https://vercel.com

#### 3. Backend Migration (Critical - Most Complex)
Your backend uses Supabase Edge Functions with Deno runtime. You need to:
- [ ] Deploy Edge Functions to your Supabase project
- [ ] Update all API endpoints
- [ ] Migrate KV store data (if needed)

---

## 🔧 Step-by-Step Deployment Process

### Step 1: Set Up Your Supabase Project

1. **Create Supabase Project**
   ```
   1. Go to https://supabase.com/dashboard
   2. Click "New Project"
   3. Name it "tutornest-production"
   4. Choose region closest to Nigeria (e.g., Frankfurt or Singapore)
   5. Set database password (SAVE THIS!)
   ```

2. **Get Your Credentials**
   ```
   Settings → API
   - Project URL: https://xxxxx.supabase.co
   - anon public key
   - service_role key (keep secret!)
   ```

3. **Set Up Database Schema**
   ```sql
   -- Your KV store table (already exists in Figma Make)
   CREATE TABLE IF NOT EXISTS kv_store_cbd74580 (
     key TEXT PRIMARY KEY,
     value JSONB NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Enable Row Level Security
   ALTER TABLE kv_store_cbd74580 ENABLE ROW LEVEL SECURITY;
   
   -- Create policies as needed
   ```

4. **Deploy Edge Functions**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Deploy all functions (you'll need to structure them properly)
   supabase functions deploy make-server-cbd74580
   ```

### Step 2: Prepare Frontend for Vercel

1. **Create Local Project Structure**
   ```
   tutornest/
   ├── src/
   │   ├── App.tsx
   │   ├── components/
   │   ├── utils/
   │   ├── types/
   │   └── styles/
   ├── public/
   ├── index.html
   ├── package.json
   ├── tsconfig.json
   ├── vite.config.ts
   └── vercel.json
   ```

2. **Create package.json**
   ```json
   {
     "name": "tutornest",
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview"
     },
     "dependencies": {
       "react": "^18.3.1",
       "react-dom": "^18.3.1",
       "react-router": "^7.1.1",
       "@supabase/supabase-js": "^2.49.2",
       "lucide-react": "^0.468.0",
       "recharts": "^2.15.0",
       "sonner": "^2.0.3",
       "react-hook-form": "^7.55.0",
       "date-fns": "^4.1.0",
       "clsx": "^2.1.1",
       "tailwind-merge": "^2.6.0",
       "motion": "^11.18.0"
     },
     "devDependencies": {
       "@types/react": "^18.3.18",
       "@types/react-dom": "^18.3.5",
       "@vitejs/plugin-react": "^4.3.4",
       "typescript": "^5.7.3",
       "vite": "^6.0.11",
       "tailwindcss": "^4.0.0",
       "autoprefixer": "^10.4.20",
       "postcss": "^8.4.49"
     }
   }
   ```

3. **Create vite.config.ts**
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     build: {
       outDir: 'dist',
       sourcemap: true,
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom', 'react-router'],
             'ui-vendor': ['lucide-react', 'motion/react'],
             'charts': ['recharts']
           }
         }
       }
     }
   });
   ```

4. **Create vercel.json**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "env": {
       "VITE_SUPABASE_URL": "@supabase_url",
       "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
     }
   }
   ```

### Step 3: Update Code for New Environment

1. **Update Supabase Client** (`utils/supabase/info.tsx`)
   ```typescript
   export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project-id';
   export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
   export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
   ```

2. **Update API Endpoints**
   - Find all instances of API calls
   - Replace Figma Make URLs with your Supabase Function URLs
   - Example: `https://xxxxx.supabase.co/functions/v1/make-server-cbd74580/`

### Step 4: Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial TutorNest deployment"
   git remote add origin https://github.com/yourusername/tutornest.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   ```
   1. Go to https://vercel.com/new
   2. Import your GitHub repository
   3. Configure project:
      - Framework Preset: Vite
      - Build Command: npm run build
      - Output Directory: dist
   4. Add Environment Variables:
      - VITE_SUPABASE_URL
      - VITE_SUPABASE_ANON_KEY
      - VITE_SUPABASE_PROJECT_ID
   5. Deploy!
   ```

### Step 5: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
VITE_SUPABASE_PROJECT_ID = your-project-id
```

In Supabase Dashboard → Settings → Edge Functions → Environment Variables:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
SUPABASE_DB_URL = your-database-url
PAYSTACK_SECRET_KEY = your-paystack-key
```

### Step 6: Test Deployment

- [ ] Test user signup (Parent, Student, Tutor)
- [ ] Test authentication flows
- [ ] Test role switching
- [ ] Test trivia system
- [ ] Test booking system
- [ ] Test payment integration
- [ ] Test admin dashboard
- [ ] Test mobile responsiveness

---

## 🚨 Critical Considerations

### 1. Backend Architecture Mismatch
**Problem**: Figma Make uses Supabase Edge Functions (Deno runtime) at a specific endpoint structure.
**Solution**: You must deploy ALL backend routes to your Supabase Edge Functions.

### 2. Database Migration
**Problem**: All your data (users, trivia questions, bookings) is in Figma Make's Supabase.
**Solution**: 
- Export data using Supabase dashboard
- Or start fresh in production
- Or keep development in Figma Make, production elsewhere

### 3. Payment Integration
**Problem**: Your Paystack keys are environment-specific.
**Solution**: Use separate keys for development and production.

### 4. File Structure
**Problem**: Figma Make has a flat structure; Vercel expects standard React project structure.
**Solution**: Reorganize files into standard `src/` directory structure.

---

## 💰 Cost Estimation

### Supabase (Database + Backend)
- **Free Tier**: $0/month
  - 500MB database
  - 2GB edge function invocations
  - 50,000 monthly active users
- **Pro**: $25/month
  - 8GB database
  - 150GB edge function invocations
  - 100,000 monthly active users

### Vercel (Frontend Hosting)
- **Hobby**: $0/month
  - 100GB bandwidth
  - Unlimited personal sites
- **Pro**: $20/month per member
  - 1TB bandwidth
  - Custom domains
  - Team features

### Total Estimated Cost: $0-45/month depending on usage

---

## 🎯 Recommended Deployment Strategy

### For Immediate Launch (Within 1 week):
1. ✅ Continue using Figma Make for development
2. ✅ Use Figma Make's preview URL for beta testing
3. ⚠️ Accept Figma Make limitations for now

### For Production Launch (1-2 months):
1. 📦 Complete full migration to external infrastructure
2. 🔒 Set up proper CI/CD pipeline
3. 🌐 Configure custom domain
4. 📊 Set up monitoring and analytics
5. 🔐 Implement production security measures

---

## 📞 Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **React Router v7**: https://reactrouter.com/
- **TailwindCSS v4**: https://tailwindcss.com/

---

## ⚠️ WARNING: Common Pitfalls

1. **Don't forget CORS configuration** in your Edge Functions
2. **Environment variables** must be prefixed with `VITE_` for client-side access
3. **API routes** must match exactly between frontend and backend
4. **Authentication tokens** need proper handling in production
5. **Database migrations** must be tested thoroughly
6. **Payment webhooks** need publicly accessible URLs
7. **File uploads** require proper Supabase Storage bucket setup

---

## 🎉 Post-Deployment Checklist

After successful deployment:
- [ ] Set up custom domain
- [ ] Configure SSL certificate (automatic with Vercel)
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure analytics (Google Analytics or Plausible)
- [ ] Set up uptime monitoring (UptimeRobot or Better Uptime)
- [ ] Create backup strategy for database
- [ ] Document deployment process
- [ ] Set up staging environment
- [ ] Configure CI/CD pipeline
- [ ] Set up automated testing
- [ ] Create incident response plan
- [ ] Configure email delivery service
- [ ] Set up logging and monitoring
- [ ] Test disaster recovery procedures

---

## 📝 Final Notes

**This is a complex migration** that typically takes 1-2 weeks for a full-stack application of TutorNest's size. Consider:

1. **Hiring a DevOps engineer** if you're not technical
2. **Using Figma Make longer** while you plan the migration
3. **Migrating incrementally** (frontend first, then backend)
4. **Testing thoroughly** in staging before production

**Need help?** Consider reaching out to:
- Vercel support for frontend deployment issues
- Supabase Discord for backend/database questions
- React Router community for routing issues

Good luck with your deployment! 🚀
