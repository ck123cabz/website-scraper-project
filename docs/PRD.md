# Website Scraper Platform - Product Requirements Document (PRD)

**Author:** CK
**Date:** 2025-10-13
**Project Level:** Level 2 - Small Complete System
**Project Type:** Web Application
**Target Scale:** 5-15 stories, 1-2 epics, 8-12 week timeline

---

## Description, Context and Goals

### Product Description

**Website Scraper Platform** is an internal collaborative web scraping tool designed to classify websites for guest posting opportunities at scale. The platform processes bulk URL uploads (5K-10K URLs per batch), uses AI-powered classification to identify suitable guest posting targets, and provides a real-time dashboard where multiple team members can monitor scraping jobs simultaneously through a shared view.

**Core Value Proposition:**
- **Real-Time Transparency**: Live dashboard showing exactly what's being processed, which site is currently being checked, detailed logs, progress indicators, and historical view of all processed URLs
- **Cost-Optimized AI Classification**: Primary use of Gemini 2.0 Flash (33% cheaper) with GPT-4o-mini fallback, plus intelligent pre-filtering to reduce LLM API calls by 40-60%
- **Production-Grade Architecture**: Modern NestJS + BullMQ queue system with real-time updates via Supabase Realtime, replacing the prototype Python/Flask threading approach
- **Collaborative Internal Tool**: No authentication needed - multiple users can access simultaneously and see the same shared state in real-time
- **Zero-DevOps Deployment**: Railway PaaS deployment with managed Redis and Supabase database
- **Scalable Processing**: Handle 10K+ URLs with concurrent batch processing

**Modernization Context:**
This modernizes an existing working Python scraper (Flask + threading + ScrapingBee + GPT) into a production-ready TypeScript platform with heavy emphasis on UI/UX transparency. All current functionality will be preserved while adding real-time visibility, better performance, cost optimization, and a professional collaborative dashboard experience.

### Deployment Intent

**Production Internal Tool** - Deploying a production-ready collaborative scraping platform on Railway for internal team use:
- No authentication required (internal access only)
- Multiple concurrent users sharing same real-time view
- Production LLM API usage (Gemini + GPT with cost tracking)
- ScrapingBee production API (250K credits/month)
- Supabase production database with Realtime subscriptions
- Heavy focus on UI/UX transparency and live monitoring
- Budget-conscious operations ($130-150/month total)

This is an internal team tool where multiple members can monitor and manage scraping operations simultaneously through a shared dashboard.

### Context

You've been running a Python-based web scraper for several months as your first coding project. It works well for personal use but has critical limitations:
- **Poor visibility**: Can't see what's happening in real-time, no detailed logs, unclear progress
- **Basic threading**: Not production-grade queue system, difficult to monitor or debug
- **No job persistence**: Can't track history or resume failed batches
- **High LLM costs**: 2 API calls per URL with no optimization or cost tracking
- **Limited UI**: Basic dashboard with minimal information
- **Single-user design**: Can't have multiple team members monitoring simultaneously

The modernization is driven by:
1. **Need for transparency** (PRIMARY): Team needs to see exactly what's being processed, live logs, progress details
2. **Collaborative monitoring**: Multiple users viewing same scraping operations in real-time
3. **Cost optimization**: LLM API costs are unsustainable without pre-filtering
4. **Production architecture**: Proper queue system with job persistence and retry logic
5. **Better scalability**: Handle 10K+ URLs with visibility into every step
6. **Modern UI/UX**: Professional React dashboard with real-time updates

### Goals

**Goal 1: Real-Time Transparency Dashboard (PRIMARY)**
Create a comprehensive real-time dashboard where multiple team members can simultaneously monitor scraping operations with live logs, current URL being processed, progress indicators, success/failure status, and detailed historical view of all processed sites. Transparency is the #1 priority.

**Goal 2: Cost-Optimized Classification Pipeline**
Implement intelligent pre-filtering and Gemini 2.0 Flash primary usage to achieve 40-60% reduction in LLM API costs while maintaining classification quality. Include real-time cost tracking visible in the dashboard.

**Goal 3: Production-Grade Queue Architecture**
Replace Python threading with robust NestJS + BullMQ queue system with job persistence, automatic retries, pause/resume capability, and Supabase Realtime for live updates - all manageable by a solo developer with beginner DevOps skills via Railway deployment.

## Requirements

### Functional Requirements

**Real-Time Dashboard & Transparency** (Priority: CRITICAL)

**FR001: Live Job Dashboard**
Users shall see a real-time dashboard displaying all active scraping jobs with current status, progress percentage, URLs processed count, success/failure rates, and estimated time remaining.

**FR002: Current URL Display**
Users shall see exactly which URL is currently being processed, including the site name, URL, current processing stage (fetching, filtering, classifying), and elapsed time for that URL.

**FR003: Live Activity Logs**
Users shall see a live scrolling log feed showing detailed activity logs for all operations including URL fetches, filtering decisions, LLM API calls, classification results, and errors - with timestamps and severity levels.

**FR004: Historical Results View**
Users shall view a searchable table of all processed URLs with columns for URL, classification result, processing time, cost, timestamp, and status - with filtering by date, status, and classification outcome.

**FR005: Real-Time Progress Indicators**
Users shall see visual progress indicators including: overall batch progress bar, current queue depth, processing rate (URLs/minute), and success/failure counters that update in real-time.

**FR006: Cost Tracking Display**
Users shall see real-time cost tracking showing total LLM API costs for current job, cost per URL, breakdown by provider (Gemini vs GPT), and projected total cost based on remaining URLs.

**URL Processing & Classification**

**FR007: Bulk URL Upload**
Users shall upload URL lists via file upload (CSV, TXT) or paste directly into textarea, with support for 5K-10K URLs per batch and automatic deduplication.

**FR008: Intelligent Progressive Filtering**
System shall apply 3-tier progressive filtering: (1) Domain/URL pattern analysis without HTTP requests to eliminate 40-60% of candidates, (2) Homepage scraping and company validation to eliminate additional 20-30%, (3) LLM classification with confidence-based routing to manual review queue. All filtering decisions visible in logs with per-layer elimination reasoning.

**Database Schema Requirements:**

The system shall persist layer-specific data in the following database fields:

**Layer 1 Tracking Fields:**
- `elimination_layer` (VARCHAR) - Tracks which layer eliminated the URL (none/layer1/layer2/layer3)
- `layer1_reasoning` (TEXT) - Stores Layer 1 decision reasoning
- `layer1_eliminated_count` (INTEGER) - Job-level counter for Layer 1 eliminations

**Layer 2 Tracking Fields:**
- `layer2_signals` (JSONB) - Stores detected signals: company pages, blog freshness, tech stack
- `layer2_eliminated_count` (INTEGER) - Job-level counter for Layer 2 eliminations

**Layer 3 Tracking Fields:**
- `confidence_band` (VARCHAR) - Stores confidence classification (high/medium/low/auto_reject)
- `manual_review_required` (BOOLEAN) - Flags medium/low confidence for manual review
- `current_layer` (INTEGER) - Tracks current processing layer (1/2/3) for real-time dashboard

**Cost Tracking Fields:**
- `scraping_cost` (DECIMAL) - Tracks ScrapingBee API costs per job
- `estimated_savings` (DECIMAL) - Calculates cost savings from Layer 1 elimination

**Implementation Reference:**
See `/docs/solution-architecture.md` Section 5.1 for complete database schema specification including indexes, constraints, and migration scripts.

**FR009: AI-Powered Classification**
System shall classify each URL for guest posting suitability using Gemini 2.0 Flash as primary LLM with automatic fallback to GPT-4o-mini on failures, with classification reasoning logged.

**Job Management**

**FR010: Job Control Actions**
Users shall pause, resume, or cancel active scraping jobs with immediate effect, preserving processed results and allowing continuation from last processed URL.

**FR011: Automatic Retry Logic**
System shall automatically retry failed URLs up to 3 times with exponential backoff, clearly indicating retry attempts in the activity log and final status in results.

**Results & Export**

**FR012: Multiple Export Formats**
Users shall export classification results in multiple formats (CSV, JSON, Excel) with customizable column selection including URL, classification, score, processing time, and cost.

**FR013: Classification Settings Management**
Users shall configure classification parameters through a settings interface including: pre-filter regex rules (enable/disable, add/edit/remove), classification indicators (keywords and criteria), LLM temperature (0-1), confidence threshold (0-1), and content truncation limits. Settings shall be persisted globally (single configuration applies to all users) and take effect immediately for new jobs without requiring redeployment.

### Non-Functional Requirements

**NFR001: Real-Time UI Responsiveness**
- Dashboard updates shall reflect job state changes within 500ms via Supabase Realtime subscriptions
- Live logs shall stream with <1 second latency
- Progress indicators shall update at minimum 1Hz (once per second)
- UI shall remain responsive during processing of 10K+ URL batches

**NFR002: Processing Performance**
- System shall process URLs with progressive throughput: Layer 1 domain analysis at 100+ URLs/min, Layer 2 homepage scraping at 20-30 URLs/min, Layer 3 LLM classification at 10-15 URLs/min
- Overall pipeline throughput: minimum 20 URLs per minute through complete processing
- Target: Complete 10K URL batch in <8 hours (includes 2-second delays between requests)
- Queue system shall handle concurrent processing of multiple URLs (limited by ScrapingBee rate limits)
- Layer 1 filtering shall execute in <50ms per URL (no HTTP requests)

**NFR003: Cost Efficiency**
- Total monthly operational cost shall not exceed $150 (infrastructure + APIs)
- LLM API costs shall be reduced by minimum 60-70% through multi-tier progressive filtering (domain analysis → scraping → LLM), with additional 40-60% reduction in scraping costs via Layer 1 domain elimination
- System shall track and display real-time cost metrics per job, including per-layer costs and estimated savings
- Gemini 2.0 Flash shall be primary provider (33% cheaper than GPT-4o-mini)

**Cost Tracking Implementation:**
The system shall track costs per layer:
- Layer 1: $0 (rule-based, no API calls)
- Layer 2: ScrapingBee cost per homepage request (~$0.0001/URL)
- Layer 3: LLM API cost per classification (~$0.002/URL for Gemini, ~$0.004/URL for GPT)

Cost savings shall be calculated as: (URLs eliminated at Layer 1 × Layer 2 cost) + (URLs eliminated at Layer 1+2 × Layer 3 cost)

**NFR004: Reliability & Error Handling**
- System shall maintain 95%+ uptime during business hours
- Failed URL processing shall not crash the entire job
- System shall gracefully handle API failures (ScrapingBee, Gemini, GPT) with automatic retries
- Job state shall persist in database - jobs can be resumed after system restart

**NFR005: Solo Developer Maintainability**
- Deployment shall require zero manual server configuration (Railway managed services only)
- System shall provide comprehensive logging for debugging (Railway logs + in-app logs)
- Codebase shall use TypeScript for type safety and better AI-assisted development
- Railway automatic deployments on git push (no manual deployment steps)

## User Journeys

### **Primary User Journey: Team Member Monitors Bulk URL Classification**

**Persona:** Internal team member needing to classify URLs for guest posting opportunities

**Scenario:** Team has collected 8,000 URLs from various sources and needs to identify which sites accept guest posts

**Journey:**

1. **Initiate Job**
   - Team member opens the dashboard (no login required)
   - Sees clean interface with "New Job" button prominently displayed
   - Clicks "New Job" and is presented with upload options
   - Uploads CSV file with 8,000 URLs or pastes list into textarea
   - System shows preview: "8,000 URLs detected, 127 duplicates removed, 7,873 unique URLs to process"
   - Clicks "Start Processing"

2. **Monitor Real-Time Progress**
   - Dashboard immediately updates showing job card with:
     - Progress bar: "Processing: 45/7,873 (0.6%)"
     - Processing rate: "23 URLs/min"
     - Current URL: "example.com - Stage: Filtering"
     - Time elapsed: "00:02:15" | Estimated remaining: "5h 42m"
   - Live activity log scrolls showing:
     - `[14:32:15] ✓ example1.com - Pre-filter PASS - Sending to LLM`
     - `[14:32:16] ✓ example1.com - Gemini classification: SUITABLE (score: 0.87)`
     - `[14:32:17] ⚠ example2.com - Pre-filter REJECT - Blog platform domain`
   - Cost tracker updates: "$0.34 spent | $0.000043/URL | Projected: $27.50"

3. **Collaborate with Team**
   - Another team member opens same dashboard on their device
   - Both see identical real-time view - same progress, logs, current URL
   - First member pauses job to discuss results so far
   - Both see "Job Paused" status instantly with pause reason option
   - Review processed URLs table: 45 URLs showing classifications
   - Filter table: "Show only SUITABLE" - 12 sites identified
   - Resume job - both dashboards update immediately

4. **Handle Issues Transparently**
   - System encounters API failure: "ScrapingBee rate limit reached"
   - Log shows: `[14:45:22] ⚠ ERROR - ScrapingBee 429, retrying in 30s...`
   - Dashboard shows: "Processing paused - API rate limit (auto-resuming)"
   - Job automatically resumes, logs show: `[14:45:52] ✓ Resumed processing`
   - Team sees exactly what happened and that system recovered

5. **Review and Export Results**
   - Job completes after 6 hours
   - Dashboard shows completion summary:
     - 7,873 URLs processed
     - 1,245 SUITABLE (15.8%)
     - 6,628 NOT_SUITABLE (84.2%)
     - Total cost: $28.43 (Gemini: $21.10, GPT fallback: $7.33)
     - 45 failures (0.6%) - all logged with reasons
   - Team member clicks "Export Results"
   - Selects CSV format with columns: URL, Classification, Score, Processing Time
   - Downloads file for outreach team

6. **Access Historical Data**
   - Week later, team member returns to dashboard
   - Sees list of all previous jobs with summaries
   - Searches historical results: "Find: marketing agency"
   - Views all previously classified URLs matching search
   - References past classifications to avoid re-processing

## UX Design Principles

**1. Radical Transparency**
Every system action shall be visible to users in real-time. No hidden processes. Users should never wonder "what's happening?" or "did it work?" Show current URL being processed, processing stage, decision reasoning, and any errors immediately with clear explanations.

**2. Information Hierarchy for Glanceability**
Dashboard shall support quick scanning with clear visual hierarchy: Critical info (progress, current status) at top in large format, supporting details (logs, costs) accessible but not overwhelming. Users can understand system state in <3 seconds of looking at dashboard.

**3. Real-Time Feedback Without Lag**
All UI updates shall feel instantaneous (<500ms). Progress bars, logs, counters, and status changes update smoothly. No manual refresh needed. Use optimistic UI updates for user actions (pause/resume) while confirming with backend.

**4. Error Visibility and Recovery Guidance**
Errors shall be prominently displayed with severity levels (warning, error, critical) and clear visual indicators. Each error message includes: what happened, why it happened, what the system is doing about it (auto-retry), and when it will recover. No silent failures.

**5. Collaborative Awareness**
Multiple users viewing the same dashboard shall see identical real-time state - same progress, same logs, same current URL. Visual indicators show system is "live" (pulsing dot, "Updated 2s ago"). No confusion about whether view is stale or current.

## Epics

### Epic 1: Real-Time Transparency Dashboard (UI/UX Heavy - PRIMARY)
Build comprehensive real-time monitoring dashboard with live logs, progress tracking, and collaborative viewing capabilities.
- **Priority:** P0 (Must Have)
- **Stories:** 7 stories (~21 points)
- **Timeline:** Weeks 1-6
- **Key Features:** Live job dashboard, progress indicators, current URL display, activity log streaming, cost tracking, historical results table, job controls

### Epic 2: Production-Grade Processing Pipeline (Backend Heavy)
Implement NestJS + BullMQ queue architecture with intelligent pre-filtering and cost-optimized LLM classification.
- **Priority:** P0 (Must Have)
- **Stories:** 5 stories (~18 points)
- **Timeline:** Weeks 3-8
- **Key Features:** NestJS + BullMQ setup, bulk URL upload, intelligent pre-filtering, Gemini/GPT classification, worker processing with real-time updates

### Epic 3: Local Testing & Production Deployment (DevOps & Testing)
Validate complete system through local end-to-end testing with real external APIs, then deploy to Railway production environment with proper configuration, monitoring, and production validation. Includes settings management feature to enable user configuration of classification parameters.
- **Priority:** P0 (Must Have - blocks production launch)
- **Stories:** 4 stories (~17 points)
- **Timeline:** Weeks 13-15
- **Key Features:** Classification settings management UI, Local E2E testing with real ScrapingBee/Gemini/GPT/Supabase APIs, Railway deployment automation, production validation, monitoring and health checks

**Total:** 16 stories, ~56 story points, 13-15 week timeline

_See `epic-stories.md` for detailed user stories with acceptance criteria._

## Out of Scope

Features explicitly deferred to Phase 2:

**Authentication & Multi-Tenancy**
- User authentication system (internal tool only for MVP)
- Per-user workspaces and data isolation
- Role-based access control

**Advanced Features**
- Scheduled jobs (cron-based execution)
- REST API for external tools
- ML-based pre-filtering (using regex rules for MVP)
- Email/webhook notifications on job completion
- Excel export format (CSV and JSON sufficient for MVP)

**Enhanced Management**
- Bulk edit URLs (remove, re-process selected URLs)
- Custom classification prompts (fixed prompt for MVP)
- Historical job comparison
- Advanced analytics dashboard with charts and trends
- Job templates and saved configurations

**Performance Optimizations**
- Advanced caching strategies
- CDN for static assets
- Database query optimization beyond basics

**Note:** All Phase 2 features have been documented and will be prioritized based on user feedback after MVP launch.

---

## Next Steps

### Immediate Actions

**1. Run Solutioning Workflow (REQUIRED)**
This Level 2 project requires architecture and technical specification before implementation.

In a new chat session, run:
```
/bmad:bmm:workflows:solution-architecture
```

Provide these documents:
- PRD: `docs/PRD.md`
- Epic Stories: `docs/epic-stories.md`
- Technical Research: `docs/research-technical-2025-10-12.md`
- Project Analysis: `docs/project-workflow-analysis.md`

The solutioning workflow will generate:
- Solution architecture document
- Database schema design
- API endpoint specifications
- Component architecture
- Deployment configuration for Railway
- Per-epic technical specifications

**2. UX Specification (HIGHLY RECOMMENDED)**
Given your PRIMARY focus on UI/UX transparency, consider running the UX workflow:
```
/bmad:bmm:workflows:plan-project
```
Select option: "UX/UI specification only"

This will create comprehensive UX specifications including:
- Information architecture
- Component library design
- User flow diagrams
- Real-time update patterns
- shadcn/ui component selections

**3. Implementation Preparation**
After solutioning complete:
- Set up Railway project (NestJS + Redis + Postgres)
- Configure Supabase project
- Set up GitHub repository with Railway auto-deploy
- Create initial NestJS project structure
- Begin Epic 1, Story 1.1 implementation

## Document Status

- [x] Product description and value proposition defined
- [x] Goals and context documented
- [x] 12 functional requirements specified (UI/UX transparency focused)
- [x] 5 non-functional requirements defined (performance, cost, reliability)
- [x] Primary user journey mapped
- [x] 5 UX design principles established
- [x] 2 epics with 12 user stories created
- [x] Out of scope features documented for Phase 2
- [ ] **NEXT:** Run solutioning workflow for technical architecture
- [ ] **NEXT:** Consider UX specification workflow (highly recommended for UI-heavy project)

**Key Decisions Captured:**
- No authentication (internal collaborative tool)
- UI/UX transparency is PRIMARY goal
- Real-time updates via Supabase Realtime
- NestJS + BullMQ + Railway deployment
- Gemini 2.0 Flash primary, GPT-4o-mini fallback
- 40-60% cost reduction through pre-filtering

_See `project-workflow-analysis.md` and `research-technical-2025-10-12.md` for full technical context_

---

_This PRD adapts to project level Level 2 - providing focused scope without overburden for solo developer implementation._
