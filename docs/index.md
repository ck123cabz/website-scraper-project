# Website Scraper Project - Documentation Index

**Welcome to the comprehensive documentation for the Website Scraper Project (Batch Processing Workflow)**

This is your primary entry point for AI-assisted development and understanding the codebase.

---

## 📋 Project Overview

**Type:** Monorepo (Turborepo) - Full-Stack Web Application with Background Job Processing
**Language:** TypeScript 5.5
**Last Updated:** 2025-01-18
**Scan Level:** Exhaustive

### Quick Reference

| Part | Type | Framework | Language | Root Path |
|------|------|-----------|----------|-----------|
| **API** | Backend | NestJS 10.3 | TypeScript 5.5 | `apps/api/` |
| **Web** | Frontend | Next.js 14.2 | TypeScript 5+ | `apps/web/` |
| **Shared** | Library | TypeScript Library | TypeScript 5.5 | `packages/shared/` |

### Technology Stack at a Glance

**Backend (API):**
- NestJS 10.3 + BullMQ 5.0 + Redis
- Supabase 2.39 (PostgreSQL)
- Google Gemini AI 0.24 + OpenAI 6.3
- Cheerio 1.1 + ScrapingBee API
- Swagger/OpenAPI 7.4

**Frontend (Web):**
- Next.js 14.2 (App Router) + React 18
- Tailwind CSS 3.4 + Radix UI
- React Query 5.90 + Zustand 4.5
- TanStack Table 8.21
- Playwright 1.56 (E2E testing)

**Shared:**
- TypeScript types + Zod schemas
- Shared validation + utilities

### Architecture Pattern

**Primary:** Layered Service-Oriented with Event-Driven Job Processing
- **Backend:** Controllers → Services → Repositories (NestJS modules)
- **Frontend:** Component-Based with Server/Client Components (Next.js 14 App Router)
- **Integration:** RESTful API + Direct database access (Supabase)

---

## 🗂️ Core Documentation

### Project Structure & Architecture

1. **[Project Overview](./project-overview.md)** ⭐ START HERE
   - Executive summary
   - Repository structure
   - Technology stack details
   - Project evolution context

2. **[Source Tree Analysis](./source-tree-analysis.md)**
   - Complete annotated directory structure
   - Critical folders explained
   - Integration points mapped
   - Entry points documented

### Architecture Documentation

3. **[Architecture - API Backend](./architecture-api.md)**
   - NestJS module structure
   - Layer 1/2/3 processing pipeline
   - BullMQ queue architecture
   - Database schema & models

4. **[Architecture - Web Frontend](./architecture-web.md)**
   - Next.js 14 App Router structure
   - Component hierarchy
   - State management (Zustand + React Query)
   - Routing & navigation

5. **[Architecture - Shared Library](./architecture-shared.md)**
   - Type system overview
   - Zod schema validation
   - Shared utilities

6. **[Integration Architecture](./integration-architecture.md)**
   - API ↔ Web communication
   - Data flow diagrams
   - Supabase integration
   - Redis/Queue integration

### Technical Specifications

7. **[API Contracts](./api-contracts-api.md)**
   - REST endpoint documentation
   - Request/response schemas
   - Authentication & authorization
   - Swagger/OpenAPI reference

8. **[Data Models](./data-models-api.md)**
   - Database schema
   - Table relationships
   - Supabase migrations
   - JSONB factor structures

9. **[Component Inventory](./component-inventory-web.md)**
   - React component catalog (61 components)
   - Radix UI components
   - Custom hooks (10+ hooks)
   - Reusable patterns

### Development Guides

10. **[Development Guide - API](./development-guide-api.md)**
    - Environment setup
    - Local development
    - Testing strategy
    - Build & deployment

11. **[Development Guide - Web](./development-guide-web.md)**
    - Environment setup
    - Component development
    - Testing (Jest + Playwright)
    - Build & deployment

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (see `.nvmrc`)
- npm 10+
- Redis (for BullMQ queue)
- PostgreSQL (via Supabase)

### Development Commands

```bash
# Install dependencies
npm install

# Run all parts in development
npm run dev

# Run specific part
cd apps/api && npm run dev    # API on :3001
cd apps/web && npm run dev    # Web on :3000

# Build all parts
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

### Environment Variables

**API (apps/api/.env):**
```env
SCRAPINGBEE_API_KEY=your_key
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
REDIS_URL=redis://localhost:6379
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
PORT=3001
```

**Web (apps/web/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Key URLs

- **Web App:** http://localhost:3000
- **API Server:** http://localhost:3001
- **Swagger Docs:** http://localhost:3001/api/docs
- **Bull Board Dashboard:** http://localhost:3001/admin/queues

---

## 📚 Existing Project Documentation

### Root Documentation
- [README.md](../README.md) - Main project README
- [CLAUDE.md](../CLAUDE.md) - AI development guidelines

### GitHub Documentation (.github/)
- [Deployment Guide](../.github/DEPLOYMENT-GUIDE.md) - Railway deployment
- [Setup Guide](../.github/SETUP.md) - Initial setup instructions
- [Setup Checklist](../.github/SETUP-CHECKLIST.md) - Setup verification
- [Status](../.github/STATUS.md) - Project status tracking

### API Documentation (apps/api/)
- [Integration Test Report](../apps/api/INTEGRATION_TEST_REPORT.md)
- [Performance Monitoring](../apps/api/PERFORMANCE_MONITORING.md)
- [Railway Deployment](../apps/api/RAILWAY_DEPLOYMENT.md)

### Web Documentation (apps/web/)
- [Web README](../apps/web/README.md) - Frontend documentation

### Specifications (specs/)
- **Active:** [001-batch-processing-refactor](../specs/001-batch-processing-refactor/) - Current feature
  - spec.md, plan.md, tasks.md, data-model.md, research.md, quickstart.md
- **Deprecated:** [002-manual-review-system](../specs/002-manual-review-system/) - Replaced feature

### Implementation Reports (root/)
- FEATURE_COMPLETION_REPORT.md
- PHASE1_TYPE_FIXES_REPORT.md
- PHASE7_CLEANUP_SUMMARY.md
- PHASE9-LOAD-TEST-RESULTS.md
- Various task implementation summaries (T038, T064, T111, T121, T122B)

---

## 🏗️ For AI-Assisted Development

### When Creating New Features

1. **Review Architecture:**
   - Start with [Project Overview](./project-overview.md)
   - Check [Source Tree Analysis](./source-tree-analysis.md) for file locations
   - Review relevant architecture docs

2. **Understand Existing Code:**
   - Check [API Contracts](./api-contracts-api.md) for endpoints
   - Review [Data Models](./data-models-api.md) for database schema
   - See [Component Inventory](./component-inventory-web.md) for reusable components

3. **Follow Patterns:**
   - Use shared types from `packages/shared/`
   - Follow NestJS module structure for backend
   - Use Next.js App Router conventions for frontend

4. **Reference Existing Implementations:**
   - Jobs module (`apps/api/src/jobs/`) for service patterns
   - Dashboard page (`apps/web/app/dashboard/`) for component patterns
   - Layer services for business logic examples

### Code Navigation Tips

**Find API Endpoints:**
- Controllers: `apps/api/src/**/*.controller.ts`
- Entry point: `apps/api/src/main.ts`

**Find React Components:**
- Components: `apps/web/components/`
- Pages: `apps/web/app/**/page.tsx`

**Find Type Definitions:**
- Shared types: `packages/shared/src/types/`
- Zod schemas: `packages/shared/src/schemas/`

**Find Business Logic:**
- API services: `apps/api/src/**/services/`
- React hooks: `apps/web/hooks/`

### Testing

**API Tests:**
- Unit: `apps/api/src/**/__tests__/*.spec.ts`
- Integration: `apps/api/src/__tests__/integration/*.spec.ts`
- Load: `apps/api/src/__tests__/load/*.spec.ts`

**Web Tests:**
- Unit: `apps/web/__tests__/**/*.spec.ts`
- E2E: `apps/web/tests/**/*.spec.ts`

---

## ⚠️ Important Notes

### Project Evolution

This project has evolved significantly. The **current active feature** is the **Batch Processing Refactor** (specs/001). The previous **Manual Review System** (specs/002) has been **DEPRECATED** and replaced.

**What this means:**
- Some older docs may reference manual review features
- Focus on the current implementation in the codebase
- Batch processing workflow is the source of truth

### Key Changes
- **Old:** Manual review UI with human approval workflow
- **New:** Automated batch processing with CSV export
- **Impact:** 50% workflow time reduction (7h → 3.5h)

### Deprecated Features
- Manual review settings UI
- Review queue functionality
- Human approval workflow

---

## 🔍 Finding Information

**For Backend (API) Changes:**
- Jobs & Processing: [API Contracts](./api-contracts-api.md)
- Database: [Data Models](./data-models-api.md)
- Architecture: [Architecture - API](./architecture-api.md)

**For Frontend (Web) Changes:**
- Components: [Component Inventory](./component-inventory-web.md)
- Pages & Routes: [Source Tree Analysis](./source-tree-analysis.md#part-2-web-frontend-appsweb)
- Architecture: [Architecture - Web](./architecture-web.md)

**For Integration:**
- API ↔ Web: [Integration Architecture](./integration-architecture.md)
- Data Flow: [Source Tree Analysis - Integration Points](./source-tree-analysis.md#integration-points)

**For Setup & Development:**
- API: [Development Guide - API](./development-guide-api.md)
- Web: [Development Guide - Web](./development-guide-web.md)

---

## 📞 Additional Resources

### External Links
- **Supabase Dashboard:** Check your Supabase project for live database
- **Railway Dashboard:** Check Railway for deployment logs
- **Bull Board:** http://localhost:3001/admin/queues (when API running)
- **Swagger Docs:** http://localhost:3001/api/docs (when API running)

### Related Documentation
- **BMAD Workflow System:** `bmad/` directory (AI-assisted development workflows)
- **Turbo Configuration:** `turbo.json` (monorepo build orchestration)
- **Test Data:** `test-data/` (sample CSV files for testing)

---

## 📝 Documentation Metadata

**Generated:** 2025-01-18T05:50:00Z
**Scan Type:** Exhaustive (read all source files)
**Workflow Version:** 1.2.0
**Total Parts:** 3 (API, Web, Shared)
**Total Components:** 76 React components
**Total Services:** 15+ backend services
**Total API Endpoints:** 10+ REST endpoints

**Coverage:**
- ✅ Project structure classified
- ✅ Technology stack analyzed
- ✅ Existing documentation cataloged (39 files)
- ✅ Source tree documented
- ✅ Architecture docs (4 complete)
- ✅ API contracts (complete)
- ✅ Data models (complete)
- ✅ Component inventory (61 components documented)
- ✅ Development guides (2 complete)

**All documentation complete!** 9 new documents generated on 2025-01-18.

---

**👨‍💻 Happy Coding!**

This documentation is designed to be your comprehensive reference for understanding and extending the Website Scraper Project. Start with the [Project Overview](./project-overview.md) and drill down into specific areas as needed.
