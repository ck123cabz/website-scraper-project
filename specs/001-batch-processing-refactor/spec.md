# Feature Specification: Batch Processing Workflow Refactor

**Feature Branch**: `001-batch-processing-refactor`
**Created**: 2025-11-13
**Status**: Draft
**Input**: User description: "Transform system from in-app manual review queue to pure batch-processing workflow. Users upload CSV files, system auto-processes all URLs through Layer 1/2/3 analysis, and users download rich CSV exports (48 columns) with complete factor breakdowns for external review in Excel/Google Sheets."

## Clarifications

### Session 2025-11-13

- Q: What is the exact concurrency model for processing multiple jobs? → A: Simple system-wide limit: Maximum 5 jobs processing concurrently across entire system. Additional jobs queue in FIFO order with queue position displayed.

- Q: How should the 30+ new columns for url_results be structured in the database schema? → A: JSON columns per layer: Add 3 JSONB columns (layer1_factors, layer2_factors, layer3_factors) storing complete factor objects. Simple migration, flexible structure, sufficient performance with GIN indexes for filtering.

- Q: What is the authentication and access control model for jobs? → A: Open access model: No authentication required. Anyone accessing the URL can view all jobs and create new jobs. Simple single-tenant or demo-style deployment.

- Q: What is the retry strategy for failed URLs? → A: Manual retry with limits: Users select failed URLs and click "Retry Selected" button to requeue within same job. Maximum 3 retry attempts per URL. Automated retry only for transient errors (timeouts, rate limits) with exponential backoff.

- Q: What happens to job data after the 90-day retention period? → A: Soft delete with archive: After 90 days, jobs auto-archive (hidden from dashboard, accessible in "Archived Jobs" for 180 days total). After 180 days, hard delete via scheduled cleanup job. Anyone can manually archive/delete jobs anytime.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Batch Processing (Priority: P1)

As a user, I want to upload a CSV file with 10,000+ URLs and have the system automatically process ALL URLs through the 3-layer classification pipeline without requiring any manual intervention, so that I can focus on reviewing final results rather than managing an in-app queue.

**Why this priority**: This is the core transformation that eliminates the bottleneck of the manual review queue. Users currently experience 7+ hour workflows (2h processing + 4h waiting + 1h review). This change enables 3.5-hour workflows (3h processing + 0 wait + 30min external review), a 50% time savings.

**Independent Test**: Can be fully tested by uploading a CSV with 100 test URLs, verifying all URLs are processed through Layer 1/2/3 without routing to manual_review_queue table, and confirming all results are written to url_results table with final decisions. Delivers immediate value by eliminating processing bottlenecks.

**Acceptance Scenarios**:

1. **Given** user has a CSV file with 10,000 URLs, **When** user creates a new job and uploads the CSV, **Then** system processes all URLs automatically through Layer 1/2/3 and stores complete results in url_results table
2. **Given** job is processing URLs, **When** URL is eliminated at Layer 1 or Layer 2, **Then** system writes result to url_results with eliminated_at_layer field set appropriately (no routing to manual review queue)
3. **Given** job is processing URLs, **When** URL reaches Layer 3 with any confidence score, **Then** system classifies URL and writes final decision to url_results (no routing based on confidence thresholds)
4. **Given** job completes processing, **When** user views job detail page, **Then** system shows all URLs with final decisions (accepted/rejected) and complete factor data
5. **Given** URL processing fails with transient error (timeout, rate limit), **When** system detects the error, **Then** system automatically retries with exponential backoff (1s, 2s, 4s) up to 3 attempts before marking as permanently failed
6. **Given** job has 15 permanently failed URLs, **When** user selects failed URLs and clicks "Retry Selected", **Then** system requeues selected URLs for processing (incrementing retry_count), processes them through Layer 1/2/3, and updates results

---

### User Story 2 - Enhanced Results Display with Factor Transparency (Priority: P2)

As a user, I want to expand any URL result row to see the complete Layer 1/2/3 decision path with all factors, scores, and reasoning, so that I understand exactly why each URL was accepted or rejected and can validate the classification logic.

**Why this priority**: Transparency is critical for users to trust the automated classifications and identify configuration improvements. Without understanding WHY decisions were made, users cannot tune settings or validate results quality.

**Independent Test**: Can be tested by viewing a completed job's results tab, clicking the expand button on any URL row, and verifying the expanded view shows Layer 1 domain analysis (TLD, pattern matches, reasoning), Layer 2 publication detection (module scores, keywords, reasoning), and Layer 3 LLM classification (sophistication signals, confidence, full reasoning text). Delivers value by enabling informed decision validation.

**Acceptance Scenarios**:

1. **Given** user is viewing job results, **When** user clicks expand button on a URL row, **Then** system displays complete Layer 1/2/3 analysis breakdown with all factors, scores, and reasoning
2. **Given** URL was eliminated at Layer 1, **When** user expands the row, **Then** system shows Layer 1 factors (TLD type, domain classification, pattern matches, reasoning) and indicates Layers 2 and 3 were not processed
3. **Given** URL was eliminated at Layer 2, **When** user expands the row, **Then** system shows Layer 1 passed factors plus Layer 2 failure factors (publication score breakdown, module scores, reasoning) and indicates Layer 3 was not processed
4. **Given** URL was classified at Layer 3, **When** user expands the row, **Then** system shows all three layers: Layer 1 passed factors, Layer 2 passed factors, and Layer 3 classification (sophistication signals, confidence score, LLM reasoning)
5. **Given** user is reviewing expanded row, **When** user reads Layer 3 reasoning, **Then** text includes specific details about design quality, authority indicators, professional presentation, and content originality with concrete examples

---

### User Story 3 - Rich CSV Export for External Review (Priority: P2)

As a user, I want to download a CSV file containing all job results with 48 columns of complete Layer 1/2/3 analysis data, so that I can perform detailed manual review in Excel or Google Sheets using familiar filtering, sorting, and analysis tools.

**Why this priority**: External review in Excel is how users actually work at scale (10,000+ URLs). Excel provides more powerful analysis capabilities than any custom UI, and users already know how to use it. Rich export is the key enabler of the batch processing workflow.

**Independent Test**: Can be tested by completing a job with 50 test URLs, clicking the "Download CSV" button with "Complete Results" format selected, and verifying the downloaded file contains 48 columns including all core fields, Layer 1 factors, Layer 2 module scores, Layer 3 sophistication signals, and metadata. Open in Excel to confirm proper formatting and data integrity. Delivers immediate value by enabling external analysis.

**Acceptance Scenarios**:

1. **Given** user has a completed job with 1,250 processed URLs, **When** user clicks "Download CSV" and selects "Complete Results" format, **Then** system generates CSV with 48 columns containing all Layer 1/2/3 factors, metadata, and downloads file in under 5 seconds
2. **Given** user selects "Summary View" export format, **When** download completes, **Then** CSV contains only 7 core columns (URL, decision, confidence, confidence_band, eliminated_at_layer, processing_time, cost)
3. **Given** user filters results to "Medium Confidence" URLs before export, **When** user downloads filtered results, **Then** CSV contains only URLs matching the filter criteria with all 48 columns
4. **Given** user opens exported CSV in Excel, **When** user reviews data, **Then** all text fields are properly escaped, numbers are formatted correctly (no scientific notation for costs), timestamps are ISO 8601 format, and Unicode characters display properly
5. **Given** CSV contains Layer 3 reasoning text with commas and quotes, **When** user opens in Excel, **Then** text fields are properly quoted and escaped per RFC 4180 standard

---

### User Story 4 - Job-Centric Dashboard with Real-Time Progress (Priority: P3)

As a user, I want to see a dashboard showing active jobs with real-time progress (percentage complete, layer breakdown, cost accumulation) and recent completed jobs with quick download access, so that I can monitor processing and access results efficiently.

**Why this priority**: Provides visibility into the batch processing workflow. Less critical than core processing and export capabilities, but important for user experience and confidence that jobs are progressing correctly.

**Independent Test**: Can be tested by creating 3 jobs (one running, one paused, one queued), navigating to dashboard, and verifying active jobs section shows progress bars, layer elimination counts, current costs, and estimated time remaining. Completed jobs section shows final metrics and quick CSV download button. Delivers value by centralizing job monitoring.

**Acceptance Scenarios**:

1. **Given** user has 3 active jobs processing, **When** user views dashboard, **Then** system shows all active jobs with progress bars (0-100%), current stage (Layer 1/2/3), URLs processed/total, cost so far, and estimated time remaining
2. **Given** job is processing URLs, **When** dashboard auto-refreshes every 5 seconds, **Then** progress bars update smoothly, layer breakdown shows current elimination counts, and cost accumulates in real-time
3. **Given** user has 4 recently completed jobs, **When** user views dashboard, **Then** system shows jobs ordered by completion time with final metrics (total URLs, success/failure counts, layer distribution, total cost) and quick CSV download button
4. **Given** user clicks CSV download on completed job, **When** download completes, **Then** user receives CSV file without navigating away from dashboard
5. **Given** system has 5 concurrent jobs (at capacity) and new job is started, **When** dashboard displays queued job, **Then** status shows "Queued - position #3 in system queue" with estimated wait time based on average job completion rate

---

### User Story 5 - Remove Manual Review System (Priority: P3)

As a developer, I want to completely remove the manual review queue system (UI components, backend routing, notification service, database tables) so that the codebase is simplified and maintenance is reduced by eliminating unused features.

**Why this priority**: Code cleanup after core functionality is migrated. This can happen after batch processing workflow is proven to work well. Not user-facing, but important for long-term maintainability.

**Independent Test**: Can be tested by verifying manual review queue page returns 404, manual review API endpoints return 404 or are removed, QueueService has no routing logic to manual_review_queue table, NotificationService is removed, StaleQueueMarkerProcessor cron job is removed, and all manual review React components are deleted. Delivers value by reducing technical debt.

**Acceptance Scenarios**:

1. **Given** developer navigates to /manual-review route, **When** page attempts to load, **Then** system returns 404 error or redirects to dashboard
2. **Given** developer inspects QueueService.processUrl() code, **When** reviewing routing logic, **Then** method always writes to url_results table and never writes to manual_review_queue table
3. **Given** developer searches codebase for "manual_review", **When** search completes, **Then** only references are in migration history, documentation, or deprecated markers (no active code paths)
4. **Given** database schema is reviewed, **When** checking for manual_review tables, **Then** manual_review_queue and manual_review_activity tables are dropped or marked deprecated
5. **Given** package.json dependencies are reviewed, **When** checking for notification dependencies, **Then** @slack/webhook and @nestjs/schedule packages are removed if only used for manual review queue

---

### Edge Cases

- **What happens when CSV contains 100,000+ URLs?**: System processes in batches, provides progress indicators, and allows pagination/filtering in results view. CSV export uses streaming generation to avoid memory issues.

- **What happens when user tries to download CSV for active job?**: System allows partial exports with warning that results are incomplete. Export includes only URLs processed so far with clear indication of job status.

- **What happens when Layer 3 LLM API fails for a URL?**: System records processing_error in final_decision, sets eliminated_at_layer to null, includes error message in layer3_reasoning field. Transient errors (timeouts, rate limits) trigger automatic retry with exponential backoff. After 3 failed attempts, URL marked as permanently failed. User can manually retry failed URLs via "Retry Selected" button in results view.

- **What happens when user has 20+ completed jobs?**: Dashboard shows 4 most recent, "View All Jobs" link navigates to full jobs list page with pagination and search.

- **What happens when expanded row data is too large?**: System truncates LLM reasoning to 5,000 characters with "... [truncated]" indicator and provides "View Full Details" button to load complete data in modal.

- **What happens when multiple jobs are started with system at capacity?**: System supports maximum 5 concurrent jobs. When 5 jobs are processing, additional jobs queue in FIFO order. Dashboard shows "Queued - position #3 in queue" with estimated wait time based on average job completion rate.

- **What happens to old jobs after 90 days?**: Jobs automatically transition to archived state (hidden from main dashboard, accessible via "Archived Jobs" link). After 180 days total, jobs are hard-deleted via scheduled cleanup. Anyone can manually archive or delete any job anytime.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enhance url_results database table with 3 JSONB columns (layer1_factors, layer2_factors, layer3_factors) to store complete Layer 1/2/3 analysis factors including TLD type, domain classification, publication scores, module breakdowns, sophistication signals, and LLM reasoning with full nested structure flexibility

- **FR-002**: System MUST remove routing logic from QueueService that conditionally writes URLs to manual_review_queue based on confidence thresholds - all URLs MUST write to url_results with final decisions

- **FR-003**: System MUST process all uploaded URLs through the complete Layer 1/2/3 pipeline without requiring manual intervention, storing final decisions (accepted/rejected) directly in url_results table

- **FR-004**: System MUST provide expandable results rows that display complete Layer 1/2/3 decision paths including all factors, scores, and reasoning text for each URL

- **FR-005**: System MUST generate CSV exports with column sets defined by format:
  - **Complete format (48 columns)**: Core fields (url, final_decision, confidence_score, confidence_band, eliminated_at_layer, processing_time_ms, total_cost, retry_count, job_id, processed_at) + Layer 1 (tld_type, domain_classification, pattern_matches, target_profile, layer1_reasoning) + Layer 2 (publication_score, product_offering_score, layout_score, navigation_score, monetization_score, detected_keywords, ad_networks, layer2_reasoning) + Layer 3 (sophistication_classification, design_quality_score, authority_score, presentation_score, originality_score, llm_provider, llm_cost, layer3_reasoning)
  - **Summary format (7 columns)**: url, final_decision, confidence_score, confidence_band, eliminated_at_layer, processing_time_ms, total_cost
  - **Layer1 format (15 columns)**: Core fields (10) + Layer 1 factors (5)
  - **Layer2 format (20 columns)**: Core fields (10) + Layer 2 factors (10)
  - **Layer3 format (25 columns)**: Core fields (10) + Layer 3 factors (15)

- **FR-006**: System MUST provide multiple export format options with filtering applied to any format: (1) Complete format (48 columns: all core fields + Layer 1/2/3 factors), (2) Summary format (7 columns: url, final_decision, confidence_score, confidence_band, eliminated_at_layer, processing_time_ms, total_cost), (3) Layer1 format (15 columns: core fields + Layer 1 factors only), (4) Layer2 format (20 columns: core fields + Layer 2 factors only), (5) Layer3 format (25 columns: core fields + Layer 3 factors only). All formats support optional filtering by decision (accepted/rejected), confidence band (high/medium/low), and eliminated_at_layer.

- **FR-007**: System MUST display job-centric dashboard with active jobs section showing real-time progress (percentage, layer breakdown, cost, ETA) and recent completed jobs with quick CSV download

- **FR-008**: System MUST update progress every 5 seconds via React Query polling showing URLs processed, current layer, cost accumulation, and layer elimination statistics (Layer 1 eliminated X, Layer 2 eliminated Y, Layer 3 classified Z). Polling MUST stop automatically when job reaches completed/failed/paused status to avoid unnecessary API calls.

- **FR-009**: System MUST remove manual review queue page, review dialog component, queue metrics/badges, and all manual review routing logic from codebase

- **FR-010**: System MUST remove NotificationService (Slack webhooks for queue items), StaleQueueMarkerProcessor (cron job), and related dependencies (@slack/webhook, @nestjs/schedule if only used for queue)

- **FR-011**: System MUST format CSV exports for Excel compatibility (UTF-8 with BOM, CRLF line endings, RFC 4180 quoting, proper escaping of commas/quotes in text fields)

- **FR-012**: System MUST provide results filtering by classification (accepted/rejected), decision layer (Layer 1/2/3), confidence band (high/medium/low), and URL search

- **FR-013**: System MUST persist all Layer 1/2/3 analysis data permanently in url_results table, not in temporary or session storage

- **FR-014**: System MUST handle large exports (10,000+ URLs) using streaming CSV generation to avoid memory exhaustion and complete within 5 seconds

- **FR-015**: System MUST display clear error states when processing fails with error messages that include: (1) what operation failed (e.g., "Layer 3 LLM API call failed"), (2) specific error cause (e.g., "OpenAI API timeout after 30s"), (3) actionable next step (e.g., "Click 'Retry Selected' to reprocess" or "Check API key configuration"). System MUST provide "Retry Selected" button for failed URLs (maximum 3 attempts per URL, with exponential backoff for transient errors: timeout, rate limit, connection refused)

- **FR-016**: System MUST enforce system-wide concurrency limit of 5 active jobs maximum via BullMQ worker configuration (maxConcurrency: 5). When 6th job starts, BullMQ automatically queues it in FIFO order. QueueService.getQueuePosition() calculates position by counting jobs with status='running' or 'queued' and created_at < current_job.created_at. Dashboard displays "Queued - position #3 in queue" with estimated wait time = (average_job_duration * position). When job completes/fails/pauses, next queued job automatically starts (BullMQ built-in behavior).

- **FR-017**: System MUST implement automated job lifecycle management via scheduled cron jobs (runs daily at 2 AM UTC): (1) ArchivalService marks jobs with completed_at > 90 days as status='archived', (2) CleanupService hard-deletes archived jobs with archived_at > 90 days (180 days total retention), (3) Both services log actions to audit table for compliance. Manual archive button sets status='archived' and archived_at=NOW(). Manual delete button hard-deletes job and cascades to url_results (with confirmation dialog warning data loss).

### Key Entities

- **url_results table**: Core entity storing all URL processing results. Key attributes: url, final_decision (accepted/rejected/error), confidence_score, eliminated_at_layer (layer1/layer2/layer3/passed_all), processing_time_ms, total_cost, retry_count (0-3), plus 3 JSONB columns: layer1_factors (TLD type, domain classification, pattern matches, target profile, reasoning), layer2_factors (publication score, module scores for product/layout/navigation/monetization, keywords, ad networks, reasoning), layer3_factors (classification, sophistication signals with scores for design/authority/presentation/originality, LLM provider, cost, full reasoning text), and metadata (job_id, processed_at, url_id). GIN indexes on JSONB columns enable fast filtering.

- **jobs table**: Job metadata entity. Key attributes: job_id, job_name, status (queued/running/paused/completed/failed/archived), created_at, started_at, completed_at, archived_at, total_urls, processed_urls, accepted_count, rejected_count, total_cost, layer1_eliminated, layer2_eliminated, layer3_classified. All jobs visible to everyone in open access model.

- **CSV Export (Ephemeral)**: CSV exports are generated on-demand and streamed directly to client without server-side storage. No ExportRequest entity or database tracking required. Export generation is stateless and idempotent - users can regenerate exports at any time by clicking "Download CSV" button.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can process 10,000 URLs end-to-end in under 3 hours (compared to 7+ hours with manual review queue bottleneck), representing a 50% reduction in total processing time

- **SC-002**: CSV export generation completes in under 5 seconds for 10,000-row result sets, with no memory exhaustion errors

- **SC-003**: Results table paginated view handles 100,000+ total rows with smooth page transitions (< 500ms page load) and filtering operations (< 1 second for filter application)

- **SC-004**: Zero references to manual_review_queue in active codebase after cleanup phase (only historical references in migration files and documentation allowed)

- **SC-005**: [REMOVED - User satisfaction survey deferred to post-launch feedback collection, not blocking for implementation]

- **SC-006**: Expandable row data loads in under 500ms for any URL, with full Layer 1/2/3 breakdown displayed including factors, scores, and reasoning text

- **SC-007**: Dashboard real-time updates reflect processing progress with maximum 5-second latency from actual job state (using React Query polling or Supabase realtime subscriptions)

- **SC-008**: CSV exports open correctly in Excel and Google Sheets with no formatting issues (proper UTF-8 encoding, correct column alignment, no truncated text fields)

- **SC-009**: System processes up to 5 concurrent jobs without performance degradation, cross-job data contamination, or queue management failures

- **SC-010**: Database storage increases by < 50 MB per 10,000 URLs processed (efficient storage of Layer 1/2/3 factor data in JSONB columns)

- **SC-011**: Transient failures (timeouts, rate limits) successfully auto-retry with exponential backoff resulting in <1% permanent failure rate for jobs with stable network and API conditions

## Assumptions

- Users prefer Excel/Google Sheets for large-scale manual review (10,000+ URLs) over custom web interfaces based on analysis of real-world usage patterns

- Layer 1 and Layer 2 eliminations provide sufficient cost savings (70-90% reduction in LLM API calls) to justify enhanced data storage requirements

- Users have sufficient Excel knowledge to work with 48-column CSV files (filtering, sorting, pivot tables) without extensive training

- Real-time progress updates every 5 seconds provide sufficient responsiveness without overwhelming the backend with polling requests

- Job lifecycle: 90-day retention in active state, then auto-archive (accessible for 90 more days), then hard-delete after 180 days total. This balances storage costs with audit trail needs. No email notifications (open access model without user accounts).

- JSONB columns for Layer 1/2/3 factors provide sufficient query performance with GIN indexes for filtering needs at expected scale (10k-100k rows per job). If hot-path query patterns emerge, frequently-accessed fields can be normalized later.

- Supabase database can efficiently store and query 100,000+ url_results rows per job with proper indexing on common filter columns (eliminated_at_layer, confidence_score, final_decision) and GIN indexes on JSONB columns

- External review workflow is acceptable for compliance/audit purposes (users download results, review externally, maintain their own records) without requiring in-app decision tracking

- Open access model (no authentication/authorization) is acceptable for this deployment. All jobs visible to anyone accessing the application. Suitable for single-tenant, internal tool, or demo scenarios. Implementation note: No auth middleware on API routes, no user_id foreign keys in database schema, no RLS policies filtering by user. All endpoints return all jobs without filtering.

- System-wide concurrency limit of 5 jobs provides reasonable throughput for expected workload while preventing resource exhaustion. Simple FIFO queue ensures fair processing order.

## Dependencies

- **External Services**:
  - Supabase (database, realtime subscriptions) - must support new url_results schema with 30+ columns
  - ScrapingBee API (Layer 2 scraping) - no changes required
  - OpenAI/Anthropic/Gemini APIs (Layer 3 LLM) - no changes required

- **Internal Systems**:
  - QueueService refactor - remove manual_review_queue routing logic
  - Layer 1/2/3 processors - enhance to return complete factor data structures
  - Jobs API - add new endpoints for results details and CSV export
  - Frontend Results Table component - rebuild with expandable rows
  - CSV Export Service - new service for streaming generation

- **Database Migration**:
  - Migration to add 3 JSONB columns (layer1_factors, layer2_factors, layer3_factors) plus retry_count to url_results table must complete before any new jobs are processed
  - Migration to add archived_at column and 'archived' status to jobs table
  - Create GIN indexes on JSONB columns for performant filtering: `CREATE INDEX idx_url_results_layer1 ON url_results USING GIN (layer1_factors);` (same for layer2, layer3)
  - Existing items in manual_review_queue MUST be handled before table drop: (1) Export all pending items to CSV for manual processing (columns: url, job_id, confidence_score, routed_at, layer2_factors, layer3_factors), (2) Mark originating jobs as "requires_manual_completion" status, (3) Archive manual_review_queue table (rename to manual_review_queue_archived), (4) Hard delete after 90 days. Migration script: supabase/migrations/20251113000005_migrate_manual_review_items.sql implements export + archive logic

- **Backwards Compatibility**:
  - Old jobs processed before migration will not have Layer 1/2/3 factor data (NULL values in JSONB columns)
  - System should handle NULL values gracefully in results display and CSV export

- **Performance Requirements**:
  - Database indexes on eliminated_at_layer, final_decision, confidence_score required for fast filtering
  - GIN indexes on JSONB columns (layer1_factors, layer2_factors, layer3_factors) required for filtering on nested fields
  - Results API must use pagination (50 results per page) to avoid loading 10,000+ rows in single request
  - CSV export must use streaming to handle large datasets without memory issues

## Out of Scope

- **User authentication and authorization**: No login system, user accounts, or access control. Open access model where anyone can view/create/manage all jobs. Future enhancement if multi-tenant deployment needed.

- **Re-import of manual decisions**: Ability to upload edited CSV with user decisions and merge back into system - future enhancement

- **Analytics dashboard**: Cost trends, confidence distribution, layer elimination analytics - deferred to Phase 8 (optional)

- **Real-time collaboration**: Multiple users reviewing same job results simultaneously with shared annotations - not required

- **Custom export templates**: User-defined column selection and ordering in CSV - future enhancement

- **Automated reprocessing**: Automatically retry failed URLs or reprocess with updated settings - future enhancement

- **Email notifications**: No email notifications for job completion, archival warnings, or deletion warnings - not required for open access model without user accounts.

- **Job scheduling**: Schedule jobs to run at specific times - not required for initial release

- **Multi-job export**: Combine results from multiple jobs into single CSV - future enhancement

- **API for external tools**: REST API for programmatic access to results data - future enhancement

- **Advanced filtering**: Complex filter expressions (e.g., "confidence > 0.7 AND layer2_publication_score < 0.5") - Excel provides this

- **In-app data visualization**: Charts, graphs, funnel visualizations - users can create these in Excel

