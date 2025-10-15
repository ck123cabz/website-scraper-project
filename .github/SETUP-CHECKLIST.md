# 🚀 CI/CD Setup Checklist

**Repository:** ck123cabz/website-scraper-project
**Status:** ✅ Workflows committed and pushed to GitHub (commit e623f3a)

---

## ✅ Completed

- [x] Created 4 GitHub Actions workflows
- [x] Added test scripts to package.json
- [x] Configured turbo.json for test caching
- [x] Committed and pushed to main branch
- [x] Railway CLI installed (v4.10.0)
- [x] Railway project linked

---

## 🔧 Required Setup Steps

### Step 1: Configure GitHub Secrets

Go to: **https://github.com/ck123cabz/website-scraper-project/settings/secrets/actions**

Click **"New repository secret"** for each of the following:

#### Required for Deployment (Critical)

**1. RAILWAY_TOKEN**
```
How to get:
1. Visit: https://railway.app/account/tokens
2. Click "Create New Token"
3. Name: "GitHub Actions CI/CD"
4. Copy the token
5. Paste as secret value in GitHub
```

**2. RAILWAY_PROJECT_ID**
```
How to get:
1. Open your Railway project dashboard
2. Go to Settings
3. Copy the "Project ID"
4. Paste as secret value in GitHub
```

**3. RAILWAY_API_URL**
```
Your Railway deployment URL for health checks
Format: https://your-service.up.railway.app
```
**To find it:**
```bash
railway domain
```
Or check your Railway dashboard under the service deployments.

#### Optional (Recommended)

**4. CODECOV_TOKEN** (For coverage tracking)
```
1. Sign up at: https://codecov.io
2. Add repository: ck123cabz/website-scraper-project
3. Copy the upload token
4. Paste as secret in GitHub
```

**5. SNYK_TOKEN** (For security scanning)
```
1. Sign up at: https://snyk.io
2. Go to Account Settings → API Token
3. Copy token
4. Paste as secret in GitHub
```

---

### Step 2: Enable GitHub Actions

**URL:** https://github.com/ck123cabz/website-scraper-project/settings/actions

**Configure:**

1. **Actions permissions:**
   - ✅ Select: "Allow all actions and reusable workflows"

2. **Workflow permissions:**
   - ✅ Select: "Read and write permissions"
   - ✅ Check: "Allow GitHub Actions to create and approve pull requests"

3. Click **"Save"**

---

### Step 3: Configure Branch Protection (Recommended)

**URL:** https://github.com/ck123cabz/website-scraper-project/settings/branches

**Steps:**

1. Click **"Add branch protection rule"**
2. Branch name pattern: `main`
3. Enable the following:
   - ✅ Require a pull request before merging
     - Required approvals: 1
   - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging
     - Search and add these status checks:
       - `Lint`
       - `Type Check`
       - `Test`
       - `Build`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

4. Click **"Create"** or **"Save changes"**

---

### Step 4: Verify Railway Environment Variables

Check that your Railway project has all required environment variables:

**Command:**
```bash
railway variables --environment production
```

**Required variables:**
```bash
DATABASE_URL=<supabase-connection-string>
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_KEY=<supabase-service-key>
REDIS_URL=<railway-redis-url>
SCRAPINGBEE_API_KEY=<your-key>
GEMINI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
PORT=3000
NODE_ENV=production
```

If any are missing, add them:
```bash
railway variables set KEY=value --environment production
```

---

### Step 5: Test the Pipeline

**Option A: Test via Pull Request (Recommended)**

```bash
# Create a test branch
git checkout -b test/verify-ci-pipeline

# Make a small change
echo "# CI/CD Pipeline Enabled ✅" >> README.md

# Commit and push
git add README.md
git commit -m "test(ci): verify GitHub Actions pipeline"
git push -u origin test/verify-ci-pipeline

# Create PR on GitHub
gh pr create --title "test(ci): verify CI/CD pipeline" --body "Testing the new CI/CD setup"
```

**What to verify:**
1. Go to: https://github.com/ck123cabz/website-scraper-project/actions
2. You should see workflows running:
   - ✅ PR Quality Checks
   - ✅ CI/CD Pipeline (for the branch)
3. Check the PR - status checks should appear
4. All checks should pass ✅

**Option B: Watch Main Branch Deployment**

The CI/CD pipeline should already be running from the commit we just pushed!

Check: **https://github.com/ck123cabz/website-scraper-project/actions/runs**

Look for the workflow run from commit `e623f3a`

---

## 🧪 Verification Steps

### 1. Check GitHub Actions Status

**URL:** https://github.com/ck123cabz/website-scraper-project/actions

**Expected:**
- ✅ Workflow run appears for commit e623f3a
- ✅ Jobs: Install → Lint → Type Check → Test → Build
- ⚠️ Deploy job will SKIP (missing secrets) - THIS IS EXPECTED

### 2. Check Workflow Files

**URL:** https://github.com/ck123cabz/website-scraper-project/tree/main/.github/workflows

**Expected files:**
- ✅ ci.yml (Main CI/CD pipeline)
- ✅ pr-checks.yml (PR quality checks)
- ✅ dependencies.yml (Weekly updates)
- ✅ validate.yml (Workflow validation)

### 3. Verify Railway Deployment

After adding the required secrets and the deploy job succeeds:

```bash
# Check Railway deployment status
railway status

# Test the health endpoint
curl https://your-api.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-15T..."}
```

---

## 📊 What Happens Next

### On Every Push to Main:
1. ✅ Install dependencies
2. ✅ Run lint (parallel)
3. ✅ Run type-check (parallel)
4. ✅ Run tests (parallel)
5. ✅ Build all packages
6. ✅ Deploy to Railway (after secrets configured)
7. ✅ Verify deployment health
8. ✅ Run security audit

### On Every Pull Request:
1. ✅ Validate PR title (conventional commits)
2. ✅ Detect changed files
3. ✅ Run tests only for changed code
4. ✅ Comment coverage report
5. ✅ Check bundle size
6. ✅ All checks must pass before merge

### Weekly (Every Monday 9 AM UTC):
1. ✅ Check for outdated dependencies
2. ✅ Run security audit
3. ✅ Create GitHub issues if updates needed

---

## 🐛 Troubleshooting

### Issue: Deploy Job Skips

**Symptom:** Deploy job shows "Skipped" in Actions
**Cause:** Missing Railway secrets
**Fix:** Add RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_API_URL to GitHub secrets

### Issue: Tests Fail

**Symptom:** Test job fails
**Check:**
```bash
# Run locally first
npm run test

# Check specific workspace
cd apps/api && npm test
```

### Issue: Lint Errors

**Symptom:** Lint job fails
**Fix:**
```bash
# Auto-fix linting issues
npm run lint -- --fix

# Commit fixes
git add .
git commit -m "style: fix linting issues"
```

### Issue: Health Check Fails

**Symptom:** Deployment succeeds but health check fails
**Check:**
1. Verify `/health` endpoint exists in API
2. Check Railway logs: `railway logs`
3. Verify RAILWAY_API_URL is correct
4. Test manually: `curl https://your-api.up.railway.app/health`

---

## 📚 Documentation

- **Pipeline Overview:** `.github/README.md`
- **Detailed Setup:** `.github/SETUP.md`
- **This Checklist:** `.github/SETUP-CHECKLIST.md`

---

## ✅ Final Verification

Once all secrets are configured, verify everything works:

```bash
# 1. Check GitHub Actions
open https://github.com/ck123cabz/website-scraper-project/actions

# 2. Check Railway deployment
railway status

# 3. Test the API
curl https://your-api.up.railway.app/health

# 4. Check coverage (if Codecov configured)
open https://codecov.io/gh/ck123cabz/website-scraper-project
```

---

## 🎉 Success Criteria

You'll know everything is working when:

- ✅ All GitHub Actions jobs pass
- ✅ Deploy job completes successfully
- ✅ Health check returns 200 OK
- ✅ Railway shows latest deployment
- ✅ Coverage reports appear on Codecov
- ✅ Can merge PRs only after checks pass

---

**Need Help?**
- Check `.github/README.md` for detailed documentation
- Review workflow logs in GitHub Actions
- Check Railway logs: `railway logs`
- Verify all secrets are correctly set

**Last Updated:** 2025-10-15 07:06 (Commit: e623f3a)
