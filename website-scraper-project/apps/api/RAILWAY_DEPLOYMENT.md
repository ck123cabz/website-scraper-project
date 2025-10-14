# Railway Deployment Guide for API

## ✅ Already Completed

1. **Railway Project Created**: `website-scraper-api` (ID: 6c5c7374-8429-4498-96fa-3c0318391636)
2. **Redis Service Deployed**: Redis is running with the following connection details:
   - Internal URL: `redis://default:BIebMLFcwJkriQFsDpXstnSooKyMfeiy@redis.railway.internal:6379`
   - Public URL: `redis://default:BIebMLFcwJkriQFsDpXstnSooKyMfeiy@shinkansen.proxy.rlwy.net:41357`
3. **Configuration Files Created**:
   - `railway.toml` - Railway deployment configuration
   - `railway.json` - Alternative JSON configuration
   - `.env.example` - Environment variable template

## 🚀 Next Steps: Deploy API Service

### Option 1: Railway Web Dashboard (Recommended)

1. Visit: https://railway.com/project/6c5c7374-8429-4498-96fa-3c0318391636
2. Click "New Service" → "GitHub Repo" or "Empty Service"
3. Configure the service:
   - **Name**: API or website-scraper-api
   - **Root Directory**: `/apps/api` (if deploying from monorepo root)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### Option 2: Railway CLI (Interactive)

```bash
cd apps/api
railway link  # Select: website-scraper-api project, production environment
railway up --detach
```

## 🔐 Environment Variables to Set

Once the API service is created, configure these environment variables in the Railway dashboard:

```env
# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app

# Redis (Reference from Redis service)
REDIS_URL=${{Redis.REDIS_URL}}

# Supabase
SUPABASE_URL=https://xygwtmddeoqjcnvmzwki.supabase.co
SUPABASE_SERVICE_KEY=<GET_FROM_SUPABASE_DASHBOARD>
```

### Getting Supabase Service Key:
1. Visit: https://supabase.com/dashboard/project/xygwtmddeoqjcnvmzwki/settings/api
2. Copy the `service_role` key (NOT the `anon` key)
3. Add it to Railway environment variables

## 🔗 Service References

Railway allows services to reference each other's variables:
- Use `${{Redis.REDIS_URL}}` in the API service to automatically get the Redis connection URL
- This creates a dependency link between services

## ✅ Verify Deployment

Once deployed, test the endpoints:

```bash
# Get the Railway deployment URL from the dashboard
API_URL="https://your-api.up.railway.app"

# Test health endpoint
curl $API_URL/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-14T...","uptime":123,"environment":"production"}

# Test job creation
curl -X POST $API_URL/jobs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Job","totalUrls":10}'

# Test Bull Board dashboard
open $API_URL/admin/queues
```

## 📊 Monitoring

- **Logs**: https://railway.com/project/6c5c7374-8429-4498-96fa-3c0318391636
- **Metrics**: Available in Railway dashboard
- **Bull Board**: https://your-api.up.railway.app/admin/queues

## 🐛 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify `@website-scraper/shared` package is accessible in monorepo

### Cannot Connect to Redis
- Verify `REDIS_URL` environment variable is set with `${{Redis.REDIS_URL}}`
- Check Redis service is running in the same project

### Supabase Errors
- Verify `SUPABASE_SERVICE_KEY` is the service_role key (not anon key)
- Check `SUPABASE_URL` matches your project URL

### Port Issues
- Railway automatically assigns a `PORT` environment variable
- The application will use `process.env.PORT || 3001`
