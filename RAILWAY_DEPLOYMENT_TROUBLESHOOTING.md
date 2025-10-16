# Railway Deployment Troubleshooting Guide

## Current Status (2025-10-16)

**Problem:** Railway services not reading `railway.json` configuration files in subdirectories.

### Evidence
- API service shows: `"startCommand": "npm run start:prod"` (old config)
- Web service shows: `"startCommand": null` (missing config)
- Both services show: `"configFile": "railway.toml"` (using root config only)

### Root Cause
Railway is using the root `railway.toml` file for both services instead of the service-specific `apps/api/railway.json` and `apps/web/railway.json` files.

---

## Solutions Attempted

### ✅ Solution 1: Fixed Next.js Build Error
**File:** `apps/web/app/dashboard/page.tsx`
**Change:** Added `export const dynamic = 'force-dynamic'`
**Result:** Build succeeds, prevents prerendering during build time

### ✅ Solution 2: Removed PORT Override
**Change:** Deleted manual `PORT=3001` from Railway environment variables
**Result:** Railway can now assign dynamic ports

### ✅ Solution 3: Fixed Monorepo Build
**Change:** Cleared Root Directory settings, builds from repository root
**Result:** All workspace packages (`@website-scraper/shared`) are accessible

### ⚠️ Solution 4: Workspace Commands (Current)
**Files:** `apps/api/railway.json`, `apps/web/railway.json`
**Changes:**
- API: `npm run start:prod --workspace=@website-scraper/api`
- Web: `npm run start --workspace=web`
- Added watch patterns for each service

**Status:** Files committed but Railway not detecting them

---

## The Missing Piece

Railway needs to be told which `railway.json` file each service should use. This cannot be configured via git-committed files alone.

### Required Manual Configuration

**For each service in Railway Dashboard:**

1. Go to **Service Settings**
2. Find **"Config File"** or **"Service Configuration"** setting
3. Specify the path to the service's railway.json:
   - **API service:** `apps/api/railway.json`
   - **Web service:** `apps/web/railway.json`

**Alternative (if above setting doesn't exist):**

Manually set the start command in Dashboard Settings:
- **API service → Start Command:** `npm run start:prod --workspace=@website-scraper/api`
- **Web service → Start Command:** `npm run start --workspace=web`

---

## Why This Is Complex

Railway's automatic monorepo detection works when:
1. Importing a new project via GitHub
2. Railway detects workspace structure
3. Automatically creates services with correct configs

But for existing projects:
1. Services were created manually
2. Railway doesn't auto-detect subdirectory configs
3. Requires manual Dashboard configuration

---

## Correct Railway Monorepo Pattern

According to Railway docs for **shared monorepos**:

```
Repository Root (build happens here)
├── package.json (workspaces defined)
├── nixpacks.toml (shared build config)
├── apps/
│   ├── api/
│   │   ├── railway.json → start: "npm run start:prod --workspace=@website-scraper/api"
│   │   └── package.json (name: "@website-scraper/api")
│   └── web/
│       ├── railway.json → start: "npm run start --workspace=web"
│       └── package.json (name: "web")
└── packages/
    └── shared/ (accessible to both services)
```

**Key Points:**
- ✅ Build from root (Root Directory = empty)
- ✅ Use workspace-specific npm commands
- ✅ Commands run from root context
- ✅ Watch patterns prevent unnecessary rebuilds
- ❌ Services must be linked to their railway.json files

---

## Next Steps

1. **In Railway Dashboard for API service:**
   - Settings → Start Command → `npm run start:prod --workspace=@website-scraper/api`
   - OR
   - Settings → Config File → `apps/api/railway.json`

2. **In Railway Dashboard for Web service:**
   - Settings → Start Command → `npm run start --workspace=web`
   - OR
   - Settings → Config File → `apps/web/railway.json`

3. **Trigger redeploy** (should happen automatically after settings change)

4. **Verify deployment:**
   ```bash
   curl https://api-production-beab.up.railway.app/health
   # Expected: {"status":"ok","database":"connected","redis":"connected"}

   curl https://web-production-db484.up.railway.app/
   # Expected: 200 OK (HTML dashboard)
   ```

---

## References

- [Railway Docs: Configure Custom Start Commands for Shared Monorepos](https://github.com/railwayapp/docs/blob/main/src/docs/guides/monorepo.md)
- [Railway Docs: Configure Watch Paths for Monorepo Builds](https://github.com/railwayapp/docs/blob/main/src/docs/guides/monorepo.md)
- [Railway Docs: Config as Code](https://github.com/railwayapp/docs/blob/main/src/docs/reference/config-as-code.md)

---

## Files Modified

1. `apps/web/app/dashboard/page.tsx` - Dynamic rendering
2. `nixpacks.toml` - Removed global start command
3. `apps/api/railway.json` - Workspace command + watch patterns
4. `apps/web/railway.json` - Workspace command + watch patterns
5. `railway.toml` - Documentation updates

All changes committed to main branch.
