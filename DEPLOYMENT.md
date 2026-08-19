# Deployment Guide

## Overview
This guide covers deploying the Acdyon Job Scraper to production using:
- **Backend**: Railway.app (Node.js)
- **Frontend**: Vercel (React)
- **Database**: MongoDB Atlas (free tier)

---

## Step 1: Prepare Repository

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Job Scraper"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Job-scraper.git
git push -u origin main
```

---

## Step 2: Set Up MongoDB Atlas

### Create Free Cluster
1. Go to [mongodb.com/cloud](https://mongodb.com/cloud)
2. Sign up (free account)
3. Create cluster → Select "free" tier
4. Wait for cluster to initialize (~5-10 min)

### Get Connection String
1. Click "Connect" button
2. Select "Connect your application"
3. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
   ```
4. Save this — you'll need it for Railway

### Create Database User
1. In Atlas dashboard → Security → Database Access
2. Add new database user (e.g., `acdyon-scraper`)
3. Generate password
4. Copy credentials

### Whitelist IPs
1. Security → Network Access
2. Add IP Address
3. For development: `0.0.0.0/0` (allows all)
4. For production: Add Railway & Vercel IPs only

---

## Step 3: Deploy Backend to Railway

### Connect GitHub Repository
1. Go to [railway.app](https://railway.app)
2. Sign up (free account)
3. Click "Create New Project"
4. Select "Deploy from GitHub repo"
5. Authorize GitHub & select your repo

### Configure Environment Variables
In Railway dashboard → Variables:
```
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/acdyon-jobs?retryWrites=true&w=majority
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
```

### Deploy
```bash
# Railway auto-deploys on push
git push origin main
# Check logs: railway up logs
```

### Get Backend URL
Railway provides URL like: `https://your-project.railway.app`

---

## Step 4: Deploy Frontend to Vercel

### Connect GitHub Repository
1. Go to [vercel.com](https://vercel.com)
2. Sign up (free account)
3. Click "Import Project"
4. Select GitHub repo
5. Authorize Vercel

### Configure
1. **Build Command**: `cd frontend && npm run build`
2. **Output Directory**: `frontend/build`
3. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-project.railway.app
   ```

### Deploy
```bash
# Vercel auto-deploys on push
git push origin main
# Vercel provides URL like: https://acdyon-scraper.vercel.app
```

---

## Step 5: Verify Deployment

### Test Backend
```bash
curl https://your-project.railway.app/api/health
# Should return: {"status":"API is running","timestamp":"..."}
```

### Test Frontend
1. Open https://acdyon-scraper.vercel.app
2. Should load dashboard
3. API status indicator should show green

### Test Scrape Flow
1. Navigate to "Scraper" tab
2. Click "Start Scrape"
3. Monitor status
4. Check "Jobs" tab after completion

---

## Step 6: Configure Monitoring (Optional)

### Enable Railway Health Checks
```bash
# Already configured in Dockerfile HEALTHCHECK
# Railway will restart if status endpoint fails
```

### Set Up Error Alerts
Railway → Settings → Alerts:
- Deployment failed
- Memory usage > 500MB
- CPU usage > 80%

### Monitor Logs
```bash
# SSH into Railway
railway run bash

# View logs
tail -f logs/combined.log
```

---

## Step 7: Scale for Production

### Database
- MongoDB Atlas: Scale up to M10 cluster ($57/month) if > 1M jobs
- Add read replicas for HA

### Backend
- Railway: Increase container size if needed
- Add Memcached for job caching (optional)

### Frontend
- Vercel: Free tier handles 100K users/month
- Consider Pro ($20/month) for custom domains

### Monitoring
- Add APM: New Relic, Datadog, or Sentry
- Error tracking: Sentry (free tier)
- Performance: Vercel Analytics

---

## Troubleshooting Deployment

### Backend Won't Start
```bash
# Check logs
railway logs

# Common issues:
# - MongoDB URI wrong (test connection locally first)
# - NODE_ENV not set to production
# - Port 5000 already in use

# Solution: Update environment variables
railway env:edit
```

### Frontend Shows "API Offline"
```bash
# Check REACT_APP_API_URL
# Make sure it matches backend Railway URL
# Rebuild: git push origin main
```

### MongoDB Connection Timeout
```bash
# 1. Verify IP whitelist: 0.0.0.0/0 in Atlas
# 2. Check credentials in MONGODB_URI
# 3. Test locally: 
#    mongosh "MONGODB_URI"
```

### High Latency
```bash
# MongoDB Atlas free tier has slower performance
# Scale to M10 ($57/month) or use AWS managed DB
# Add database indexes (already done in code)
```

---

## Continuous Deployment

### Auto-Deploy on Push
- Railway: Watches main branch, auto-deploys
- Vercel: Watches main branch, auto-deploys

### Manual Rollback
```bash
# Railway
railway logs --since 1h  # Check what broke
git revert HEAD          # Revert last commit
git push origin main     # Auto-redeploys

# Vercel
# Dashboard → Deployments → Select previous → Click "Promote"
```

---

## Cost Estimate (Monthly)

| Service | Free Tier | Pro Tier | Notes |
|---------|-----------|----------|-------|
| Railway | $5 credit | Pay as you go | Runs continuously |
| Vercel | Free | $20 | Handles 100K users |
| MongoDB Atlas | Free (512MB) | $57+ (M10) | Upgrade if >100K jobs |
| **Total** | **$5** | **$80+** | Free tier sufficient for MVP |

---

## Security Checklist

- [x] Environment variables stored in Railway/Vercel (not in code)
- [x] MongoDB password-protected
- [x] IP whitelisting enabled
- [x] API rate limiting configured (3 req/sec)
- [x] CORS enabled for frontend URL only
- [x] Error messages don't leak sensitive info
- [x] HTTPS enforced (automatic on Railway/Vercel)
- [x] Database daily backups enabled (Atlas free)

---

## Next Steps

1. **Add CI/CD**: GitHub Actions for automated testing
2. **Add monitoring**: Sentry for error tracking
3. **Add caching**: Redis for job caching (1 hour)
4. **Add CDN**: Cloudflare for static assets
5. **Scale jobs**: Bull queue for background scraping

---

**Deployed**: [Add your URLs here after deployment]
- Backend: https://your-project.railway.app
- Frontend: https://acdyon-scraper.vercel.app
- GitHub: https://github.com/YOUR_USERNAME/acdyon-scraper
