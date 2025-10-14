# CI/CD Setup Guide

This guide will walk you through setting up the complete CI/CD pipeline for this project.

## Prerequisites

- GitHub account with access to this repository
- Railway account (for deployment)
- Admin access to repository settings

## Step 1: Configure GitHub Secrets

Navigate to your repository on GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

#### 1. Railway Deployment (Required for auto-deployment)

```bash
RAILWAY_TOKEN
```
**How to get:**
1. Go to https://railway.app/account/tokens
2. Click "Create New Token"
3. Name it "GitHub Actions CI/CD"
4. Copy the token value

```bash
RAILWAY_PROJECT_ID
```
**How to get:**
1. Open your Railway project
2. Go to Settings
3. Copy the Project ID

```bash
RAILWAY_API_URL
```
**Value:** Your deployed API URL
**Example:** `https://website-scraper-api-production.up.railway.app`

#### 2. Code Coverage (Optional but Recommended)

```bash
CODECOV_TOKEN
```
**How to get:**
1. Sign up at https://codecov.io
2. Add your GitHub repository
3. Copy the upload token

#### 3. Security Scanning (Optional)

```bash
SNYK_TOKEN
```
**How to get:**
1. Sign up at https://snyk.io
2. Go to Account Settings → API Token
3. Copy your token

## Step 2: Configure Railway Environment Variables

In your Railway project, add these environment variables:

### Database Configuration
```bash
DATABASE_URL=<your-supabase-connection-string>
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
```

### Queue Configuration
```bash
REDIS_URL=<railway-redis-url>
```

### External APIs
```bash
SCRAPINGBEE_API_KEY=<your-scrapingbee-api-key>
GEMINI_API_KEY=<your-google-gemini-api-key>
OPENAI_API_KEY=<your-openai-api-key>
```

### Application Settings
```bash
PORT=3000
NODE_ENV=production
```

## Step 3: Enable GitHub Actions

1. Go to **Settings → Actions → General**
2. Under "Actions permissions", select:
   - ✅ Allow all actions and reusable workflows
3. Under "Workflow permissions", select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests
4. Click "Save"

## Step 4: Configure Branch Protection

Recommended for `main` branch:

1. Go to **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - Select these status checks:
     - `Lint`
     - `Type Check`
     - `Test`
     - `Build`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
4. Click "Create" or "Save changes"

## Step 5: Test the Pipeline

### Local Testing First

```bash
# Install dependencies
npm ci

# Run all checks
npm run lint
npm run type-check
npm run test
npm run build

# If all pass, you're ready for CI
```

### Test GitHub Actions

1. Create a new branch:
   ```bash
   git checkout -b test/ci-setup
   ```

2. Make a small change (e.g., update README):
   ```bash
   echo "# CI/CD Enabled" >> README.md
   git add README.md
   git commit -m "test(ci): verify GitHub Actions workflow"
   ```

3. Push to GitHub:
   ```bash
   git push -u origin test/ci-setup
   ```

4. Create a Pull Request on GitHub

5. Watch the Actions tab - you should see:
   - ✅ PR Quality Checks running
   - ✅ Lint, Type Check, Test jobs running in parallel
   - ✅ Build job running after tests pass

6. If all checks pass, merge the PR:
   - This will trigger the full CI/CD pipeline
   - The Deploy job will run (only on `main` branch)
   - Your API will be deployed to Railway

## Step 6: Verify Deployment

After merging to `main`:

1. Go to **Actions** tab on GitHub
2. Find the latest workflow run
3. Click on it to see the deployment logs
4. Check the "Deploy to Railway" job
5. Verify deployment succeeded

Test the deployed API:
```bash
curl https://your-api-url.railway.app/health
```

You should get a 200 OK response.

## Step 7: Set Up Codecov (Optional)

If you added the `CODECOV_TOKEN`:

1. Go to https://codecov.io/gh/{your-org}/{your-repo}
2. You should see coverage reports after the first PR merge
3. Configure coverage settings:
   - Target coverage: 70%
   - Patch coverage: 80%
   - Comment on PRs: Enabled

## Troubleshooting

### Common Issues

#### "RAILWAY_TOKEN is not set"
- Verify you added the secret in GitHub Settings → Secrets
- Secret names are case-sensitive
- Re-run the workflow after adding secrets

#### "railway: command not found"
- The workflow installs Railway CLI automatically
- Check the "Install Railway CLI" step in logs
- Ensure npm install -g worked

#### "Health check failed"
- Ensure your API has a `/health` endpoint
- Check Railway logs: `railway logs -s api`
- Verify environment variables are set in Railway

#### "Coverage upload failed"
- Verify CODECOV_TOKEN is correct
- Check if codecov.io is accessible
- This is a non-blocking error (won't fail the build)

#### "Tests failed"
- Run tests locally first: `npm test`
- Check the test logs in GitHub Actions
- Fix failing tests and push again

### Getting Help

- **GitHub Actions logs:** Check the Actions tab for detailed logs
- **Railway logs:** Run `railway logs` or check Railway dashboard
- **Test failures:** Run `npm test -- --verbose` locally

## Maintenance

### Weekly Tasks
- Review dependency update issues (created automatically)
- Review security audit issues (created automatically)
- Check code coverage trends on Codecov

### Monthly Tasks
- Review and update GitHub Actions versions
- Review Railway costs and usage
- Update documentation as needed

### As Needed
- Update branch protection rules
- Add new status checks
- Configure additional integrations

## Advanced Configuration

### Custom Deployment Branches

To deploy from branches other than `main`, edit `.github/workflows/ci.yml`:

```yaml
deploy:
  if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
```

### Custom Test Matrix

To test on multiple Node versions, edit `.github/workflows/ci.yml`:

```yaml
test:
  strategy:
    matrix:
      node-version: [18.x, 20.x, 22.x]
```

### Environment-Specific Deployments

Create separate workflows for staging and production:
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

## Next Steps

After setup is complete:

1. ✅ All CI checks passing
2. ✅ Auto-deployment to Railway working
3. ✅ Coverage reports on Codecov
4. ✅ Branch protection enabled

You're ready to start developing with full CI/CD support!

### Recommended Reading
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)
- [Turborepo CI/CD Guide](https://turbo.build/repo/docs/ci)
