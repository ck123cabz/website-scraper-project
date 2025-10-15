# Railway Deployment Guide

## Current Status ✅

### Backend (NestJS) - DEPLOYED
- **Service**: website-scraper-project
- **URL**: https://website-scraper-project-production.up.railway.app
- **Status**: ✅ Live and Running
- **Health Check**: https://website-scraper-project-production.up.railway.app/health

### Frontend (Next.js) - NEEDS DEPLOYMENT
Currently the frontend reference points to Vercel, but it should be on Railway.

---

## Deploy Frontend to Railway (Required Steps)

### Step 1: Create Frontend Service on Railway Dashboard

1. Go to your Railway project: https://railway.com/project/6c5c7374-8429-4498-96fa-3c0318391636
2. Click **"+ New"** → **"Empty Service"**
3. Name it: **"web-frontend"**

### Step 2: Connect to GitHub

1. In the new service, click **"Deploy from GitHub repo"**
2. Select your repository: `ck123cabz/website-scraper-project`
3. Click **"Add Service"**

### Step 3: Configure Service Settings

In the service settings, set:

**Build Settings:**
- **Root Directory**: `apps/web`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

**Or use the railway.toml file already created at `apps/web/railway.toml`**

### Step 4: Add Environment Variables

Add the following environment variable to the frontend service:

```
NEXT_PUBLIC_API_URL=https://website-scraper-project-production.up.railway.app
```

### Step 5: Generate Domain

1. In the frontend service settings, go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Railway will assign a domain like: `web-frontend-production.up.railway.app`

### Step 6: Update Backend FRONTEND_URL

1. Go to the backend service (website-scraper-project)
2. Update the `FRONTEND_URL` environment variable to the new frontend Railway domain
3. Example: `FRONTEND_URL=https://web-frontend-production.up.railway.app`

### Step 7: Deploy

Railway will automatically deploy when you push to your main branch, or you can trigger a manual deployment from the dashboard.

---

## Environment Variables Reference

### Backend Service (website-scraper-project)
✅ Already configured:
- `PORT=3001`
- `NODE_ENV=production`
- `REDIS_URL` (auto-configured by Railway)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `SCRAPINGBEE_API_KEY`

❌ Needs update:
- `FRONTEND_URL` → Update to Railway frontend domain (currently pointing to Vercel)

### Frontend Service (web-frontend)
Needs configuration:
- `NEXT_PUBLIC_API_URL=https://website-scraper-project-production.up.railway.app`
- `NEXT_PUBLIC_SUPABASE_URL` (same as backend SUPABASE_URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (get from Supabase dashboard)

---

## Alternative: Deploy Frontend via CLI

If you prefer using the Railway CLI:

```bash
# 1. Navigate to frontend directory
cd apps/web

# 2. Link to Railway project (if not already linked)
railway link --project website-scraper-api

# 3. Create and link to a new service
railway service

# 4. Set environment variables
railway variables set NEXT_PUBLIC_API_URL=https://website-scraper-project-production.up.railway.app

# 5. Deploy
railway up --detach
```

---

## Verification Steps

After deployment, verify:

1. **Frontend Health**: Visit your Railway frontend URL
2. **API Connection**: Check browser console - should see API requests to Railway backend
3. **Database**: Dashboard should load jobs from Supabase
4. **Realtime**: Test job updates - should see real-time progress

---

## Current Deployment URLs

- **Backend API**: https://website-scraper-project-production.up.railway.app
- **Frontend**: *TO BE DEPLOYED* (currently referencing Vercel)
- **Railway Project**: https://railway.com/project/6c5c7374-8429-4498-96fa-3c0318391636

---

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Verify `railway.toml` configuration
- Ensure all dependencies are in `package.json`

### Frontend Can't Connect to Backend
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in backend (should allow frontend domain)
- Check browser console for errors

### Database Connection Issues
- Verify Supabase environment variables are correct
- Check Supabase project is accessible from Railway
- Test connection with health endpoint

---

**Date**: 2025-10-15
**Status**: Backend ✅ Deployed | Frontend ⏳ Pending Deployment
