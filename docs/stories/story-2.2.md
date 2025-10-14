# Story 2.2: Bulk URL Upload & Job Creation

Status: Draft

## Story

As a team member,
I want to upload URLs via file or textarea and create scraping job,
so that I can start processing my URL list.

## Acceptance Criteria

1. POST /jobs/create endpoint accepts:
   - File upload (CSV, TXT) via multipart/form-data
   - JSON body with `urls` array
   - Text body with line-separated URLs
2. CSV parser handles: single column, multi-column (auto-detect URL column), headers/no headers
3. URL validation: basic format check, remove empty lines, trim whitespace
4. Deduplication: remove duplicate URLs within job
5. Job record created in database with status "pending"
6. URLs bulk inserted into database linked to job
7. Response returns: job_id, url_count, duplicates_removed_count
8. Large uploads (10K+ URLs) processed efficiently (<5 seconds)
9. Error handling: invalid file format, no URLs found, file too large (>10MB)

## Tasks / Subtasks

- [ ] Task 1: Set Up File Upload Infrastructure (AC: 1)
  - [ ] 1.1: Install multer and file parsing dependencies (@nestjs/platform-express, multer, papaparse)
  - [ ] 1.2: Configure multer in JobsModule with file size limits (10MB) and allowed types (.csv, .txt)
  - [ ] 1.3: Create DTO for job creation: CreateJobDto with validation decorators
  - [ ] 1.4: Update JobsController POST /jobs/create to accept multipart/form-data
  - [ ] 1.5: Add content-type detection: multipart/form-data, application/json, text/plain

- [ ] Task 2: Implement CSV/TXT File Parsing (AC: 2)
  - [ ] 2.1: Create FileParserService in apps/api/src/jobs/services/
  - [ ] 2.2: Implement CSV parsing with papaparse (detect headers, multi-column handling)
  - [ ] 2.3: Implement URL column auto-detection (heuristics: column name contains 'url', 'link', 'website', or first column with valid URLs)
  - [ ] 2.4: Implement TXT parsing (line-by-line, trim whitespace)
  - [ ] 2.5: Add unit tests for FileParserService (single column, multi-column, headers/no headers cases)

- [ ] Task 3: URL Validation and Normalization (AC: 3)
  - [ ] 3.1: Create UrlValidationService in apps/api/src/jobs/services/
  - [ ] 3.2: Implement URL format validation (regex: starts with http/https, valid domain)
  - [ ] 3.3: Implement URL normalization (trim whitespace, remove trailing slash, lowercase domain)
  - [ ] 3.4: Filter out empty lines and non-URL strings
  - [ ] 3.5: Add unit tests for UrlValidationService (valid/invalid URL cases)

- [ ] Task 4: URL Deduplication Logic (AC: 4)
  - [ ] 4.1: Implement in-job deduplication (Set data structure for O(n) deduplication)
  - [ ] 4.2: Normalize URLs before deduplication (http vs https, www vs non-www treated as same)
  - [ ] 4.3: Track duplicates_removed_count for response
  - [ ] 4.4: Add unit tests for deduplication (duplicate detection, normalization edge cases)

- [ ] Task 5: Database Job and URL Insertion (AC: 5, 6)
  - [ ] 5.1: Update JobsService.createJob() to accept job name and URLs array
  - [ ] 5.2: Begin database transaction for atomicity
  - [ ] 5.3: Insert job record into jobs table with status "pending", totalUrls count
  - [ ] 5.4: Bulk insert URLs into results table (linked to job_id) using Supabase batch insert
  - [ ] 5.5: Commit transaction; rollback on error
  - [ ] 5.6: Test with 10K URLs to verify bulk insert performance

- [ ] Task 6: Build Response Payload (AC: 7)
  - [ ] 6.1: Create response DTO: CreateJobResponseDto
  - [ ] 6.2: Include fields: job_id, url_count (unique URLs), duplicates_removed_count, created_at
  - [ ] 6.3: Return HTTP 201 Created with response body
  - [ ] 6.4: Test response structure with Postman/curl

- [ ] Task 7: Performance Optimization for Large Uploads (AC: 8)
  - [ ] 7.1: Profile job creation with 10K URLs (measure time taken)
  - [ ] 7.2: Optimize Supabase bulk insert (use batch size of 1000 URLs per insert)
  - [ ] 7.3: Use streaming for large files (avoid loading entire file into memory)
  - [ ] 7.4: Add progress logging: "Inserting batch 1/10..."
  - [ ] 7.5: Verify <5 seconds for 10K URLs end-to-end (file upload → database insertion)

- [ ] Task 8: Error Handling and Validation (AC: 9)
  - [ ] 8.1: Validate file format (only .csv, .txt allowed; reject others with 400 Bad Request)
  - [ ] 8.2: Validate file size (max 10MB; reject with 413 Payload Too Large)
  - [ ] 8.3: Handle no URLs found error (return 400 with message: "No valid URLs found in uploaded file")
  - [ ] 8.4: Handle database errors (Supabase insert failure → 500 Internal Server Error with generic message)
  - [ ] 8.5: Add validation error messages to response: { success: false, error: "..." }

- [ ] Task 9: Story 2.1 Follow-Up Item (From Senior Developer Review)
  - [ ] 9.1: Add error event listener to BullMQ Queue in QueueService constructor (apps/api/src/queue/queue.service.ts)
  - [ ] 9.2: Log queue errors: console.error('[QueueService] Queue error:', err)
  - [ ] 9.3: Test error listener by simulating Redis connection failure

- [ ] Task 10: Integration Testing (AC: ALL)
  - [ ] 10.1: Test CSV upload with single column (no headers)
  - [ ] 10.2: Test CSV upload with multi-column (headers, URL in 2nd column)
  - [ ] 10.3: Test TXT upload with line-separated URLs
  - [ ] 10.4: Test JSON body with urls array
  - [ ] 10.5: Test text/plain body with URLs
  - [ ] 10.6: Test deduplication (upload file with duplicate URLs, verify count)
  - [ ] 10.7: Test large file (10K URLs) and verify <5s processing
  - [ ] 10.8: Test error cases (invalid format, no URLs, file too large)
  - [ ] 10.9: Verify job record in Supabase jobs table with correct status and counts
  - [ ] 10.10: Verify URLs inserted into results table linked to job_id

## Dev Notes

### Architecture Patterns and Constraints

**Endpoint Design:**
- RESTful endpoint: POST /jobs/create
- Supports multiple content types: multipart/form-data, application/json, text/plain
- Content-Type detection via NestJS @UploadedFile() and @Body() decorators
- Proper HTTP status codes: 201 Created, 400 Bad Request, 413 Payload Too Large, 500 Internal Server Error

**File Parsing Requirements:**
- CSV: Use papaparse library for robust CSV parsing with header detection
- TXT: Simple line-by-line parsing with whitespace trimming
- Auto-detect URL column in multi-column CSV (heuristic matching or first column with valid URLs)
- Handle edge cases: empty lines, whitespace-only lines, non-URL data

**URL Processing Pipeline:**
1. Parse file/body → Extract raw URLs
2. Validate URLs → Filter invalid URLs
3. Normalize URLs → Consistent format (trim, lowercase domain, remove trailing slash)
4. Deduplicate → Remove duplicates within job
5. Bulk insert → Database transaction (job + URLs)

**Database Constraints:**
- Use database transaction for atomicity (job + URLs inserted together or rolled back)
- Bulk insert optimization: Batch URLs into chunks of 1000 for Supabase insert
- Foreign key: results.job_id references jobs.id (already exists from Story 2.1)

**Performance Requirements:**
- Target: <5 seconds for 10K URLs (file upload → database insertion complete)
- Streaming: Avoid loading entire file into memory (use Node.js streams for large files)
- Batch inserts: 1000 URLs per Supabase insert operation

**Validation and Error Handling:**
- Input validation: Use class-validator decorators in DTOs
- File size limit: 10MB enforced by multer configuration
- File type validation: Only .csv and .txt allowed
- Graceful error messages: Return user-friendly error messages without exposing internals

### Source Tree Components to Touch

**New Files to Create:**

```
apps/api/src/jobs/
├── services/
│   ├── file-parser.service.ts       # CSV/TXT parsing logic
│   └── url-validation.service.ts    # URL validation and normalization
├── dto/
│   ├── create-job.dto.ts            # Request DTO for job creation
│   └── create-job-response.dto.ts   # Response DTO
└── __tests__/
    ├── file-parser.service.spec.ts  # Unit tests for parsing
    └── url-validation.service.spec.ts # Unit tests for validation
```

**Files to Modify:**

```
apps/api/src/jobs/
├── jobs.controller.ts               # Add POST /jobs/create endpoint with file upload
├── jobs.service.ts                  # Add createJobWithUrls() method with transaction
└── jobs.module.ts                   # Import MulterModule, register new services

apps/api/src/queue/queue.service.ts  # Add error event listener (Story 2.1 follow-up)
apps/api/package.json                 # Add dependencies: multer, papaparse, class-validator
```

**Dependencies to Install:**

```json
{
  "@nestjs/platform-express": "^10.3.0",  // Already installed in 2.1
  "multer": "^1.4.5-lts.1",                // File upload handling
  "papaparse": "^5.4.1",                   // CSV parsing
  "@types/multer": "^1.4.11",              // TypeScript types for multer
  "@types/papaparse": "^5.3.14",           // TypeScript types for papaparse
  "class-validator": "^0.14.1",            // Validation decorators
  "class-transformer": "^0.5.1"            // DTO transformation
}
```

**Environment Variables Required:**
- No new environment variables for Story 2.2
- Existing: SUPABASE_URL, SUPABASE_SERVICE_KEY, REDIS_URL (from Story 2.1)

### Testing Standards Summary

**Testing Approach:**
- Unit tests: FileParserService, UrlValidationService (Jest + mocks)
- Integration tests: Full endpoint testing with real file uploads (Postman/curl)
- Database tests: Supabase MCP to verify job and URL records
- Performance tests: 10K URLs upload time measurement

**Unit Test Coverage:**
- CSV parsing: single column, multi-column, headers/no headers, empty file
- TXT parsing: line-separated, whitespace handling, empty lines
- URL validation: valid URLs, invalid URLs (no protocol, invalid domain), empty strings
- URL normalization: trailing slash removal, case normalization, protocol normalization
- Deduplication: exact duplicates, normalized duplicates (http vs https)

**Integration Test Scenarios:**
1. **Happy Path**: Upload CSV with 1000 URLs → Verify job created with 1000 URLs in database
2. **Deduplication**: Upload file with 100 unique URLs + 20 duplicates → Verify response shows duplicates_removed: 20
3. **Large Upload**: Upload TXT with 10K URLs → Verify <5s completion, all URLs in database
4. **Invalid Format**: Upload .xlsx file → Verify 400 Bad Request with error message
5. **No URLs**: Upload empty CSV → Verify 400 with "No valid URLs found"
6. **File Too Large**: Upload 11MB file → Verify 413 Payload Too Large
7. **Multi-column CSV**: Upload CSV with 3 columns (name, url, category) → Verify URLs extracted correctly
8. **JSON Body**: POST with JSON body `{ "urls": ["url1", "url2"] }` → Verify job created

**Performance Benchmarks:**
- 1K URLs: <1 second
- 5K URLs: <3 seconds
- 10K URLs: <5 seconds (target met)

**MCP Testing Workflow:**
1. Upload file via curl/Postman to POST /jobs/create
2. Supabase MCP: SELECT * FROM jobs WHERE id = '<job_id>' → Verify job record with correct totalUrls
3. Supabase MCP: SELECT COUNT(*) FROM results WHERE job_id = '<job_id>' → Verify URL count matches
4. Measure time: Start upload → Receive response → Verify <5s for 10K URLs

### Project Structure Notes

**Alignment with Unified Project Structure:**
- NestJS backend at apps/api/ (monorepo structure maintained)
- Shared types in packages/shared/src/types/ (Job, Result types already defined in Story 2.1)
- Database schema in Supabase (jobs, results tables exist from Story 2.1)
- File organization: Feature-based modules (JobsModule with services subfolder)

**No Detected Conflicts:**
- Story 2.2 extends Story 2.1 infrastructure (no breaking changes)
- Database schema unchanged (uses existing jobs and results tables)
- API versioning not required (new endpoint added to JobsController)

**Naming Conventions:**
- Services: PascalCase with .service.ts suffix (FileParserService, UrlValidationService)
- DTOs: PascalCase with .dto.ts suffix (CreateJobDto, CreateJobResponseDto)
- Files: kebab-case (file-parser.service.ts, create-job.dto.ts)
- Test files: .spec.ts suffix (file-parser.service.spec.ts)

**Integration Points:**
- Frontend (Story 1.1-1.7): POST /jobs/create endpoint will be called from frontend job creation form
- Database (Story 2.1): Uses jobs and results tables created in Story 2.1
- Queue (Story 2.5): Job creation will eventually trigger queue processing (deferred to Story 2.5)

**Story 2.1 Carry-Overs:**
- BullMQ error listener: Added as Task 9 in this story (M1 from Story 2.1 review)
- Input validation: Implementing class-validator in this story (noted in Story 2.1 review)
- Health check enhancement: Deferred to future story (not blocking)
- Structured logging (Pino): Deferred to Story 2.3+ (console.log acceptable for MVP)

### References

**Technical Specifications:**
- [Source: docs/epic-stories.md#Story 2.2 (lines 243-265)] - User story, acceptance criteria, dependencies
- [Source: docs/PRD.md#FR007 (lines 96-98)] - Bulk URL upload functional requirement
- [Source: docs/tech-spec-epic-1.md#Data Models (lines 94-160)] - Job and Result TypeScript types

**Architecture Documents:**
- [Source: docs/epic-stories.md#Epic 2 (lines 196-214)] - Production-Grade Processing Pipeline context
- [Source: docs/stories/story-2.1.md#Database Schema (lines 56-60)] - Database tables created in Story 2.1

**Story Dependencies:**
- [Source: docs/stories/story-2.1.md] - Foundation story providing NestJS backend, Supabase client, database tables
- Depends on: Story 2.1 (NestJS backend, database schema, job CRUD endpoints)
- Enables: Story 2.3 (Pre-filtering) and Story 2.5 (Worker processing)

**NestJS File Upload:**
- NestJS documentation on file uploads: https://docs.nestjs.com/techniques/file-upload
- Multer middleware configuration
- @UploadedFile() decorator usage

**CSV Parsing:**
- papaparse library documentation: https://www.papaparse.com/
- Header detection, multi-column handling, auto-detect configuration

**URL Validation:**
- URL format regex: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
- URL normalization: trim, lowercase domain, remove trailing slash

**Performance Optimization:**
- Supabase batch insert: Insert in chunks of 1000 records per operation
- Node.js streams: Use for large file processing (>1MB files)
- Database transaction: Ensure atomicity (job + URLs inserted together)

## Dev Agent Record

### Context Reference

- [Story Context XML](../story-context-2.2.2.xml) - Generated 2025-10-14

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
