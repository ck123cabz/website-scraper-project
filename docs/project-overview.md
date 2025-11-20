# Project Overview

**Project Name:** Website Scraper Project (Batch Processing Workflow)
**Type:** Monorepo (Turborepo)
**Language:** TypeScript 5.5
**Architecture:** Full-Stack Web Application with Background Job Processing

## Executive Summary

A sophisticated batch URL processing system that automates website analysis using a three-layer evaluation framework (Layer 1: Domain Analysis, Layer 2: Operational Filtering, Layer 3: AI-Powered Sophistication Analysis). The system processes URLs in bulk, applies intelligent filtering at multiple stages, and provides comprehensive CSV exports for external review.

**Key Capabilities:**
- Bulk URL processing (file upload: CSV, TXT, or direct input)
- Three-layer filtering pipeline for cost optimization
- AI-powered content analysis (Google Gemini & OpenAI)
- Real-time job progress tracking with React Query
- CSV export with 48 columns for external analysis
- Background job processing with BullMQ + Redis
- Queue monitoring dashboard (Bull Board)

## Repository Structure

```
website-scraper-project/           # Monorepo root
├── apps/
│   ├── api/                       # NestJS Backend API
│   └── web/                       # Next.js Frontend Application
├── packages/
│   └── shared/                    # Shared TypeScript types & schemas
├── specs/                         # Feature specifications
├── supabase/                      # Database migrations
├── docs/                          # Generated documentation (this folder)
└── bmad/                          # BMAD workflow system
```

**Workspace Configuration:**
- **Build Tool:** Turborepo 2.0 for parallel builds
- **Package Manager:** npm workspaces
- **Node Version:** 20+ (specified in .nvmrc)

## Technology Stack Summary

### Backend (API)
- **Framework:** NestJS 10.3
- **Language:** TypeScript 5.5
- **Queue System:** BullMQ 5.0 + Redis
- **Database:** PostgreSQL (via Supabase 2.39)
- **AI Integration:** Google Gemini AI 0.24 & OpenAI 6.3
- **Web Scraping:** Cheerio 1.1 + ScrapingBee API
- **Validation:** class-validator 0.14, Zod 3.25
- **Caching:** node-cache 5.1
- **API Docs:** Swagger/OpenAPI 7.4
- **Testing:** Jest 30.2

### Frontend (Web)
- **Framework:** Next.js 14.2 (App Router)
- **UI Library:** React 18
- **Language:** TypeScript 5+
- **Styling:** Tailwind CSS 3.4
- **Components:** Radix UI (accessible component library)
- **State Management:** Zustand 4.5 (client state) + React Query 5.90 (server state)
- **Data Tables:** TanStack Table 8.21
- **Database:** Supabase JS 2.75 (direct access)
- **Testing:** Jest 30.2 (unit) + Playwright 1.56 (E2E)

### Shared Library
- **Purpose:** Type-safe contracts between frontend & backend
- **Contents:** TypeScript types, Zod schemas, utility functions
- **Key Types:** Job, Result, Layer1/2/3 analysis, Worker status, Settings

## Architecture Type Classification

**Primary Pattern:** Layered Service-Oriented Architecture with Event-Driven Job Processing

**Backend Architecture:**
- **Pattern:** Layered (Controllers → Services → Repositories)
- **Module Structure:** Feature-based modules (Jobs, Queue, Workers, Scraper, Settings)
- **Async Processing:** Event-driven with BullMQ workers

**Frontend Architecture:**
- **Pattern:** Component-Based with Server/Client Component Separation (Next.js 14 App Router)
- **State Management:** Hybrid (Zustand for UI state, React Query for server state)
- **Rendering:** Server-side rendering (SSR) + Client-side hydration

**Integration:**
- **API Communication:** RESTful HTTP (Axios)
- **Real-time Updates:** React Query polling (WebSocket support available via Supabase)
- **Database Access:** Supabase client (both backend and frontend can query directly)

## Project Evolution Context

**Important Note:** This project has evolved significantly through multiple iterations. The current implementation (as of January 2025) represents the **Batch Processing Refactor** (specs/001-batch-processing-refactor), which replaced an earlier Manual Review System (specs/002-manual-review-system, now DEPRECATED).

**Key Changes in Evolution:**
- **From:** Manual review UI with human approval workflow
- **To:** Automated batch processing with CSV export for external review
- **Reason:** Improved workflow efficiency (7h → 3.5h, 50% reduction)
- **Impact:** Some older documentation may reference deprecated features

**Current Active Feature:** Batch Processing Workflow (001-batch-processing-refactor)

## Quick Reference

### Project Statistics
- **Parts:** 3 (API, Web, Shared)
- **Total Packages:** ~50+ npm dependencies per part
- **React Components:** 76 components
- **API Endpoints:** 10+ REST endpoints
- **Database Tables:** 7+ tables (jobs, url_results, activity_log, settings, etc.)
- **Background Workers:** 1 main worker (url-worker.processor.ts)

### Entry Points
- **API Entry:** `apps/api/src/main.ts`
- **Web Entry:** `apps/web/app/layout.tsx`
- **Shared Entry:** `packages/shared/src/index.ts`

### Key Configuration Files
- **Monorepo:** `turbo.json`, root `package.json`
- **API:** `apps/api/nest-cli.json`, `.env`
- **Web:** `apps/web/next.config.mjs`, `tailwind.config.ts`
- **Database:** `supabase/migrations/*.sql`

### Development Ports
- **API:** 3001 (http://localhost:3001)
- **Web:** 3000 (http://localhost:3000)
- **Bull Board:** 3001/admin/queues
- **Swagger Docs:** 3001/api/docs

## Links to Detailed Documentation

- [Architecture - API Backend](./architecture-api.md)
- [Architecture - Web Frontend](./architecture-web.md)
- [Architecture - Shared Library](./architecture-shared.md)
- [Integration Architecture](./integration-architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [API Contracts](./api-contracts-api.md)
- [Data Models](./data-models-api.md)
- [Component Inventory](./component-inventory-web.md)
- [Development Guide - API](./development-guide-api.md)
- [Development Guide - Web](./development-guide-web.md)

## Getting Started

See the [Master Index](./index.md) for comprehensive navigation and [Development Guides](./development-guide-api.md) for setup instructions.

---

**Generated:** 2025-01-18
**Scan Level:** Exhaustive
**Documentation Version:** 1.0.0
