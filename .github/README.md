# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment. The pipeline is designed for a monorepo structure with multiple workspaces (apps/api, apps/web, packages/shared).

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Install
- Installs all dependencies using `npm ci`
- Caches node_modules for subsequent jobs
- Runs first to prepare the environment

#### Lint
- Runs ESLint across all packages
- Uses Turbo for parallel execution
- Fails on any linting errors

#### Type Check
- Runs TypeScript type checking across all packages
- Uses Turbo for parallel execution
- Fails on any type errors

#### Test
- Runs Jest tests for API and shared packages
- Uses matrix strategy for parallel execution
- Uploads coverage reports to Codecov
- Coverage threshold: 70% minimum

#### Build
- Builds all packages (API, Web, Shared)
- Caches build artifacts
- Only runs after lint, type-check, and test pass

#### Deploy
- **Only runs on:** Push to `main` branch
- Deploys API service to Railway
- Verifies deployment by calling health endpoint
- Requires Railway secrets to be configured

#### Security
- Runs npm audit for production dependencies
- Runs Snyk security scan (optional)
- Continues on error (won't fail the build)

### 2. PR Quality Checks (`pr-checks.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Jobs:**

#### PR Metadata Check
- Validates PR title follows conventional commit format
- Accepted types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Optional scopes: `api`, `web`, `shared`, `infra`, `deps`

#### Changed Files Detection
- Detects which parts of the monorepo changed
- Outputs: `api`, `web`, `shared` flags
- Used to conditionally run jobs

#### Test API Changes
- Only runs if API or shared packages changed
- Runs comprehensive test suite
- Checks coverage meets 70% threshold
- Fails if coverage drops below threshold

#### Bundle Size Check
- Analyzes bundle size changes
- Comments on PR with size differences
- Helps catch unexpected size increases

#### Comment Coverage
- Posts test coverage report as PR comment
- Shows coverage changes from base branch
- Deletes old comments to reduce clutter

## Required Secrets

Configure these in GitHub Settings → Secrets and variables → Actions:

### Required for Deployment
- `RAILWAY_TOKEN`: Railway API token for deployment
  - Get from: https://railway.app/account/tokens
- `RAILWAY_PROJECT_ID`: Your Railway project ID
  - Get from: Railway project settings
- `RAILWAY_API_URL`: Your Railway deployment URL (for health checks)
  - Example: `https://your-api.up.railway.app`

### Optional (Recommended)
- `CODECOV_TOKEN`: Codecov integration token
  - Sign up at: https://codecov.io
- `SNYK_TOKEN`: Snyk security scanning token
  - Sign up at: https://snyk.io

## Environment Configuration

### Railway Environment Variables

The API service on Railway needs these environment variables:

```bash
# Database
DATABASE_URL=<supabase-connection-string>
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_KEY=<supabase-service-key>

# Queue
REDIS_URL=<railway-redis-url>

# External APIs
SCRAPINGBEE_API_KEY=<scrapingbee-key>
GEMINI_API_KEY=<google-gemini-key>
OPENAI_API_KEY=<openai-key>

# App
PORT=3000
NODE_ENV=production
```

## Local Testing

### Run all CI checks locally:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Build all packages
npm run build
```

### Test specific workspace:

```bash
# API tests
cd apps/api && npm test

# Shared package tests
cd packages/shared && npm test

# Web tests (when implemented)
cd apps/web && npm test
```

## Workflow Optimization

### Caching Strategy
- **node_modules**: Cached based on package-lock.json hash
- **Build artifacts**: Cached per commit SHA
- **Turbo cache**: Automatically managed by Turbo

### Parallel Execution
- Test jobs run in parallel using matrix strategy
- Turbo runs tasks in parallel across workspaces
- Independent jobs (lint, type-check, test) run concurrently

### Conditional Jobs
- Deploy only runs on main branch pushes
- Test jobs only run for changed files (PR checks)
- Security scans continue on error

## Troubleshooting

### Build Failures

**Linting errors:**
```bash
npm run lint -- --fix
```

**Type errors:**
```bash
npm run type-check
# Fix reported errors in the code
```

**Test failures:**
```bash
npm run test:watch
# Fix failing tests
```

### Deployment Issues

**Railway deployment fails:**
1. Check Railway logs: `railway logs`
2. Verify environment variables are set
3. Check health endpoint responds
4. Verify Railway token is valid

**Health check fails:**
1. Ensure `/health` endpoint exists in API
2. Check Railway service is running
3. Verify RAILWAY_API_URL is correct

### Coverage Issues

**Coverage below threshold:**
1. Run `npm run test:cov` locally
2. Check coverage report in `coverage/lcov-report/index.html`
3. Add tests for uncovered code
4. Target: >70% for production code

## Best Practices

### Commit Messages
Follow conventional commits:
```
feat(api): add bulk URL upload endpoint
fix(web): resolve dashboard refresh issue
docs(readme): update setup instructions
test(api): add integration tests for queue service
```

### Pull Requests
1. Keep PRs focused and small
2. Ensure all CI checks pass before requesting review
3. Add tests for new features
4. Update documentation as needed

### Testing
1. Write unit tests for business logic
2. Write integration tests for API endpoints
3. Maintain >70% code coverage
4. Use descriptive test names

### Deployment
1. Deploy to `develop` branch first
2. Test in staging environment
3. Merge to `main` for production deployment
4. Monitor Railway logs after deployment

## Monitoring

### GitHub Actions
- View workflow runs: Actions tab in GitHub
- Download logs and artifacts
- Re-run failed jobs if needed

### Railway Deployment
- Monitor logs: `railway logs`
- View metrics: Railway dashboard
- Check health: `curl https://your-api.up.railway.app/health`

### Code Coverage
- View reports at: https://codecov.io/gh/{org}/{repo}
- Track coverage trends
- Identify uncovered code

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Implement deployment previews for PRs
- [ ] Add performance benchmarking
- [ ] Set up automated dependency updates
- [ ] Add smoke tests after deployment
- [ ] Implement blue-green deployments
- [ ] Add deployment rollback automation
- [ ] Set up monitoring and alerting
