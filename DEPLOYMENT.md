# Production Deployment Guide - Urban Simple

## Pre-Deployment Checklist

### 1. Environment Variables Needed

You'll need to set these in Vercel:

**Database (Supabase)**
- `DATABASE_URL` - Production Supabase connection string
- `DIRECT_URL` - Production Supabase direct connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)

**Application**
- `NEXT_PUBLIC_APP_URL` - Your production URL (e.g., `https://urbansimpletx.com`)

**AI Features (Optional but Recommended)**
- `GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY` - For AI assistant and Growth Autopilot
- `CRON_SECRET` - Random secret string for cron job authentication

**Email (Optional)**
- `RESEND_API_KEY` - For sending invoices/emails
- `RESEND_FROM_EMAIL` - Your sending email (e.g., `invoices@urbansimpletx.com`)

**Node Environment**
- `NODE_ENV=production` - Vercel sets this automatically

---

## Step-by-Step Deployment

### Step 1: Prepare Your Production Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a NEW project for production (or use existing)
3. Note down:
   - Project URL
   - Anon key
   - Service role key
   - Database connection string

### Step 2: Deploy to Vercel

#### Option A: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Navigate to project
cd urbansimple

# Login to Vercel
vercel login

# Link to your Vercel account
vercel link

# Deploy to production
vercel --prod
```

#### Option B: Via GitHub Integration

1. Make sure your code is pushed to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: `urbansimple` (if repo is in subfolder)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Step 3: Set Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add each variable:

**Required:**
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
NEXT_PUBLIC_APP_URL=https://urbansimpletx.com
```

**Optional (but recommended):**
```
GEMINI_API_KEY=[your-gemini-key]
CRON_SECRET=[random-secret-string]
RESEND_API_KEY=[your-resend-key]
RESEND_FROM_EMAIL=invoices@urbansimpletx.com
```

**Important:** 
- Set all variables for "Production" environment
- You can also set for "Preview" if you want staging
- Click "Save" after adding each

### Step 4: Run Database Migrations

After deployment, you need to run migrations on production database:

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# Run migrations
cd urbansimple
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

**Or use Vercel CLI:**
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### Step 5: Seed Production Database (First Time Only)

**⚠️ Only run this once on production!**

```bash
# Make sure SUPABASE_SERVICE_ROLE_KEY is set
npm run db:seed
```

This creates:
- Your company
- Austin branch
- Your admin user (alex@urbansimple.net)

### Step 6: Configure Custom Domain

1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `urbansimpletx.com`
3. Add `www.urbansimpletx.com` (optional)
4. Vercel will show you DNS records to add:
   - A record: `@` → Vercel IP
   - CNAME: `www` → cname.vercel-dns.com
5. Add these DNS records in your domain registrar
6. Wait for DNS propagation (5-60 minutes)
7. SSL certificate will be auto-generated

### Step 7: Configure Cron Jobs

Your `vercel.json` already has cron jobs configured. After deployment:

1. Vercel → Your Project → Settings → Cron Jobs
2. Verify the cron job is active:
   - Path: `/api/cron/pulse-generate`
   - Schedule: `0 11 * * *` (11 AM daily)

**For Growth Autopilot cron jobs**, add these to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/pulse-generate",
      "schedule": "0 11 * * *"
    },
    {
      "path": "/api/growth/discovery/jobs",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/growth/outreach/executor",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/growth/pipeline/automate",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Note:** Cron jobs require Vercel Pro plan ($20/month). For Hobby plan, use external cron service.

### Step 8: Test Everything

1. **Login Test**
   - Visit `https://urbansimpletx.com/login`
   - Login with your admin credentials
   - Verify you can access dashboard

2. **Core Features**
   - Dashboard loads
   - Clients page works
   - Invoices page works
   - Growth/Outreach features work
   - AI Assistant works (if configured)

3. **Check Logs**
   - Vercel Dashboard → Your Project → Logs
   - Look for any errors

---

## Post-Deployment

### Monitor Your App

1. **Vercel Analytics** (Free)
   - Enable in Vercel Dashboard → Analytics
   - See page views, performance metrics

2. **Error Tracking** (Recommended)
   - Add Sentry: `npm install @sentry/nextjs`
   - Or use Vercel's built-in error tracking

### Backup Strategy

- Supabase automatically backs up your database
- Verify backups are enabled in Supabase Dashboard
- Consider manual backup before major changes

### Update DNS Records

If migrating from another host:

1. Update A record: `@` → Vercel IP
2. Update CNAME: `www` → cname.vercel-dns.com
3. Wait for DNS propagation
4. Test both `urbansimpletx.com` and `www.urbansimpletx.com`

---

## Troubleshooting

### Build Fails

- Check Vercel build logs
- Verify all environment variables are set
- Check `package.json` scripts are correct

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Verify IP allowlist in Supabase (if enabled)

### Authentication Not Working

- Verify Supabase env vars are correct
- Check `NEXT_PUBLIC_APP_URL` matches your domain
- Check Supabase Auth settings allow your domain

### Cron Jobs Not Running

- Verify Vercel Pro plan (required for cron)
- Check cron job paths match your API routes
- Verify `CRON_SECRET` is set and matches

---

## Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard
**Supabase Dashboard:** https://app.supabase.com
**Domain DNS:** Your registrar's DNS settings

**Support:**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Urban Simple Issues: GitHub Issues
