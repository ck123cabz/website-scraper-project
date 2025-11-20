# API Contracts - Backend API

**Part:** API Backend (`apps/api/`)
**Base URL:** `http://localhost:3001` (development) / `${API_URL}` (production)
**API Documentation:** `/api/docs` (Swagger UI)
**Last Updated:** 2025-01-18

---

## Overview

This document specifies all REST API endpoints provided by the NestJS backend. All endpoints return JSON responses with a standardized structure:

```json
{
  "success": boolean,
  "data": object | array,
  "error": string (if success = false),
  "message": string (optional)
}
```

---

## Table of Contents

1. [Jobs Management API](#jobs-management-api)
2. [Settings API](#settings-api)
3. [Queue Monitoring API](#queue-monitoring-api)
4. [Health Check API](#health-check-api)
5. [Common Response Patterns](#common-response-patterns)
6. [Error Responses](#error-responses)

---

## Jobs Management API

### Base Path: `/jobs`

---

### POST `/jobs/create`

Create a new batch processing job with URLs.

**Supported Content Types:**
- `multipart/form-data` (file upload)
- `application/json` (URLs array)
- `text/plain` (line-separated URLs)

**Request (Multipart Form):**
```http
POST /jobs/create
Content-Type: multipart/form-data

name: "My Batch Job"
file: urls.csv (or urls.txt)
```

**Request (JSON):**
```http
POST /jobs/create
Content-Type: application/json

{
  "name": "My Batch Job",
  "urls": [
    "https://example.com",
    "https://test.com"
  ]
}
```

**Request (Plain Text):**
```http
POST /jobs/create
Content-Type: text/plain

https://example.com
https://test.com
https://another.com
```

**Request Body Schema:**
```typescript
{
  name?: string;           // Job title (default: "Untitled Job")
  urls?: string[];         // Array of URLs (max 10,000)
  file?: File;             // CSV or TXT file
}
```

**Validation:**
- File size: Max 10MB
- File types: `.csv`, `.txt` only
- URL count: Max 10,000 per job
- Each URL must be a valid string

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "url_count": 487,
    "duplicates_removed_count": 23,
    "invalid_urls_count": 12,
    "created_at": "2025-01-18T10:30:00.000Z",
    "status": "processing"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type, no valid URLs, or validation error
- `500 Internal Server Error`: Processing failure

---

###GET `/jobs`

Retrieve all jobs (ordered by creation date, newest first).

**Request:**
```http
GET /jobs
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Job",
      "status": "completed",
      "total_urls": 500,
      "processed_urls": 500,
      "created_at": "2025-01-18T10:00:00.000Z",
      "started_at": "2025-01-18T10:01:00.000Z",
      "completed_at": "2025-01-18T10:30:00.000Z",
      "archived_at": null,
      "is_archived": false
    }
  ]
}
```

**Status Values:**
- `pending`: Job created, not yet started
- `processing`: Actively processing URLs
- `paused`: User-paused job
- `completed`: All URLs processed
- `failed`: Job encountered fatal error

---

### GET `/jobs/:id`

Retrieve details for a specific job.

**Parameters:**
- `id` (path): Job UUID

**Request:**
```http
GET /jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "My Job",
    "status": "processing",
    "total_urls": 500,
    "processed_urls": 350,
    "created_at": "2025-01-18T10:00:00.000Z",
    "started_at": "2025-01-18T10:01:00.000Z",
    "completed_at": null,
    "archived_at": null,
    "is_archived": false
  }
}
```

**Error Responses:**
- `404 Not Found`: Job ID does not exist
- `500 Internal Server Error`: Database error

---

### GET `/jobs/:id/results`

Retrieve paginated job results with filtering options.

**Parameters:**
- `id` (path): Job UUID
- `page` (query, optional): Page number (default: 1)
- `pageSize` (query, optional): Results per page (default: 20, max: 100)
- `filter` (query, optional): Filter by approval status
  - Values: `approved`, `rejected`, `all`
- `layer` (query, optional): Filter by processing layer
  - Values: `layer1`, `layer2`, `layer3`, `passed_all`, `all`
- `confidence` (query, optional): Filter by confidence band
  - Values: `high`, `medium`, `low`, `very-high`, `very-low`, `all`

**Request:**
```http
GET /jobs/abc123/results?page=1&pageSize=20&filter=approved&confidence=high
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "result-uuid-1",
      "job_id": "job-uuid",
      "url_id": "url-uuid",
      "url": "https://example.com",
      "current_layer": "layer3",
      "layer1_status": "pass",
      "layer2_status": "pass",
      "layer3_classification": "approved",
      "confidence_band": "high",
      "confidence_score": 0.92,
      "layer1_processing_time_ms": 45,
      "layer2_processing_time_ms": 1203,
      "layer3_processing_time_ms": 3421,
      "total_processing_time_ms": 4669,
      "layer2_scraping_cost": 0.0001,
      "layer3_total_cost": 0.0034,
      "retry_count": 0,
      "last_error": null,
      "created_at": "2025-01-18T10:05:00.000Z",
      "processed_at": "2025-01-18T10:05:05.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 127,
    "totalPages": 7
  }
}
```

**Error Responses:**
- `404 Not Found`: Job not found
- `500 Internal Server Error`: Database error

---

### GET `/jobs/:id/results/:resultId`

Get detailed result with full Layer 1/2/3 factor breakdown.

**Parameters:**
- `id` (path): Job UUID
- `resultId` (path): Result UUID

**Request:**
```http
GET /jobs/abc123/results/result-xyz
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "result-uuid",
    "job_id": "job-uuid",
    "url": "https://example.com",
    "current_layer": "layer3",
    "layer1_status": "pass",
    "layer2_status": "pass",
    "layer3_classification": "approved",
    "confidence_band": "high",
    "confidence_score": 0.92,
    "layer1_factors": {
      "matched_patterns": [],
      "domain_category": "corporate",
      "url_structure_score": 0.9
    },
    "layer2_factors": {
      "has_about_page": true,
      "has_contact_page": true,
      "recent_post_count": 15,
      "last_post_date": "2025-01-15",
      "blog_freshness_days": 3,
      "detected_cms": "Custom",
      "tech_stack": ["React", "Node.js"]
    },
    "layer3_factors": {
      "llm_provider": "gemini",
      "classification_reasoning": "Site has clear guest posting guidelines...",
      "content_quality_score": 0.85,
      "relevance_indicators": ["guest post", "write for us"],
      "red_flags": [],
      "confidence_explanation": "Strong indicators of guest posting opportunity"
    },
    "total_processing_time_ms": 4669,
    "layer2_scraping_cost": 0.0001,
    "layer3_total_cost": 0.0034
  }
}
```

**Factor Fallback for Legacy Data:**
If factors are NULL (pre-migration data), returns:
```json
{
  "layer1_factors": {
    "message": "Factor data not available (processed before schema migration)",
    "reason": "Layer 1 analysis not completed"
  }
}
```

**Error Responses:**
- `404 Not Found`: Result not found or doesn't belong to job
- `500 Internal Server Error`: Database error

---

### POST `/jobs/:id/export`

Export job results to CSV format with filtering options.

**Parameters:**
- `id` (path): Job UUID
- `format` (query, optional): Export format (default: `complete`)
  - `complete`: All 48 columns (factors flattened)
  - `summary`: Core metrics only
  - `layer1`: Layer 1 analysis only
  - `layer2`: Layer 2 analysis only
  - `layer3`: Layer 3 analysis only
- `filter` (query, optional): Filter by approval (`approved`, `rejected`, `all`)
- `layer` (query, optional): Filter by layer (`layer1`, `layer2`, `layer3`, `passed_all`, `all`)
- `confidence` (query, optional): Filter by confidence (`high`, `medium`, `low`, `all`)

**Request:**
```http
POST /jobs/abc123/export?format=complete&filter=approved&confidence=high
```

**Response (200 OK):**
```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="job-abc123-complete.csv"

url,layer1_status,layer2_status,layer3_classification,confidence_band,confidence_score,...
https://example.com,pass,pass,approved,high,0.92,...
```

**CSV Columns (Complete Format):**
1. Basic: url, current_layer
2. Layer 1: layer1_status, layer1_processing_time_ms
3. Layer 1 Factors: matched_patterns, domain_category, url_structure_score
4. Layer 2: layer2_status, layer2_processing_time_ms, layer2_scraping_cost
5. Layer 2 Factors: has_about_page, has_contact_page, recent_post_count, etc.
6. Layer 3: layer3_classification, layer3_processing_time_ms, layer3_total_cost
7. Layer 3 Factors: llm_provider, classification_reasoning, content_quality_score, etc.
8. Metrics: confidence_band, confidence_score, total_processing_time_ms, retry_count

**Total Columns:** 48

**Error Responses:**
- `400 Bad Request`: Invalid job ID, format, filter, layer, or confidence value
- `404 Not Found`: Job not found
- `500 Internal Server Error`: Export stream failed

---

### PATCH `/jobs/:id/pause`

Pause an active job (stops processing new URLs).

**Parameters:**
- `id` (path): Job UUID

**Request:**
```http
PATCH /jobs/abc123/pause
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "My Job",
    "status": "paused",
    "total_urls": 500,
    "processed_urls": 250,
    "created_at": "2025-01-18T10:00:00.000Z"
  },
  "message": "Job paused successfully"
}
```

**Error Responses:**
- `500 Internal Server Error`: Failed to pause job

---

### PATCH `/jobs/:id/resume`

Resume a paused job.

**Parameters:**
- `id` (path): Job UUID

**Request:**
```http
PATCH /jobs/abc123/resume
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "status": "processing"
  },
  "message": "Job resumed successfully"
}
```

**Error Responses:**
- `500 Internal Server Error`: Failed to resume job

---

### DELETE `/jobs/:id/cancel`

Cancel a job (marks as cancelled, stops processing).

**Parameters:**
- `id` (path): Job UUID

**Request:**
```http
DELETE /jobs/abc123/cancel
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "status": "cancelled"
  },
  "message": "Job cancelled successfully"
}
```

**Error Responses:**
- `500 Internal Server Error`: Failed to cancel job

---

### GET `/jobs/queue/status`

Get real-time queue status with active and completed jobs.

**Query Parameters:**
- `includeCompleted` (optional): Include recently completed jobs (`true`/`false`)
- `limit` (optional): Max active jobs to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Request:**
```http
GET /jobs/queue/status?includeCompleted=true&limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "activeJobs": [
      {
        "id": "job-uuid-1",
        "name": "Active Job 1",
        "status": "processing",
        "total_urls": 1000,
        "processed_urls": 450,
        "created_at": "2025-01-18T10:00:00.000Z",
        "started_at": "2025-01-18T10:01:00.000Z"
      }
    ],
    "completedJobs": [
      {
        "id": "job-uuid-2",
        "name": "Completed Job",
        "status": "completed",
        "total_urls": 500,
        "processed_urls": 500,
        "created_at": "2025-01-18T09:00:00.000Z",
        "completed_at": "2025-01-18T09:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid limit or offset value
- `500 Internal Server Error`: Failed to retrieve queue status

---

## Settings API

### Base Path: `/api/settings`

---

### GET `/api/settings`

Retrieve current classification settings.

**Request:**
```http
GET /api/settings
```

**Response (200 OK):**
```json
{
  "id": "settings-uuid",
  "layer1_rules": {
    "url_pattern_exclusions": [
      {
        "id": "rule-1",
        "pattern": "blog\\.example\\.com",
        "category": "blog_platform",
        "enabled": true,
        "description": "WordPress.com hosted blogs"
      }
    ]
  },
  "layer2_rules": {
    "blog_freshness_threshold_days": 90,
    "minimum_about_page_length": 100,
    "required_company_pages": ["about", "contact"]
  },
  "layer3_rules": {
    "confidence_thresholds": {
      "high": 0.85,
      "medium": 0.65,
      "low": 0.45
    },
    "auto_reject_threshold": 0.30,
    "prompts": {
      "classification_system": "You are an expert...",
      "classification_user": "Analyze this website..."
    }
  },
  "created_at": "2025-01-18T00:00:00.000Z",
  "updated_at": "2025-01-18T12:00:00.000Z"
}
```

**Fallback Behavior:**
- If no settings exist in database, returns default settings with `id: "default"`

---

### PUT `/api/settings`

Update classification settings.

**Request:**
```http
PUT /api/settings
Content-Type: application/json

{
  "layer1_rules": {
    "url_pattern_exclusions": [...]
  },
  "layer2_rules": {
    "blog_freshness_threshold_days": 60
  },
  "layer3_rules": {
    "confidence_thresholds": {
      "high": 0.90
    }
  }
}
```

**Request Body:** Partial update supported (only include fields to update)

**Response (200 OK):**
```json
{
  "id": "settings-uuid",
  "layer1_rules": { ... },
  "layer2_rules": { ... },
  "layer3_rules": { ... },
  "updated_at": "2025-01-18T14:30:00.000Z"
}
```

**Validation:**
- Nested DTO validation with `class-validator`
- Whitelist mode (removes unknown properties)
- Transformation enabled for nested objects

**Error Responses:**
- `400 Bad Request`: Validation errors
- `500 Internal Server Error`: Database update failed

---

### POST `/api/settings/reset`

Reset settings to default values.

**Request:**
```http
POST /api/settings/reset
```

**Response (200 OK):**
```json
{
  "id": "default",
  "layer1_rules": { ... },
  "layer2_rules": { ... },
  "layer3_rules": { ... },
  "created_at": "2025-01-18T15:00:00.000Z",
  "updated_at": "2025-01-18T15:00:00.000Z"
}
```

---

## Health Check API

### GET `/health`

Check API server health status.

**Request:**
```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "uptime": 123456,
  "timestamp": "2025-01-18T15:30:00.000Z"
}
```

---

## Common Response Patterns

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Success with Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 127,
    "totalPages": 7
  }
}
```

### Success with Message

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST request (job creation) |
| 400 | Bad Request | Validation errors, invalid parameters |
| 404 | Not Found | Resource (job, result) does not exist |
| 500 | Internal Server Error | Server-side errors, database failures |

### Common Error Scenarios

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Invalid file type. Only .csv and .txt files are allowed."
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "Job not found"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "Failed to process upload. Please try again or contact support."
}
```

---

## Authentication & Authorization

**Current Implementation:** None (internal tool)

**Future Considerations:**
- API key authentication via `Authorization` header
- JWT-based user sessions
- Role-based access control (RBAC)

---

## Rate Limiting

**Current Implementation:** None

**Recommendations:**
- Implement rate limiting for production deployment
- Suggested: 100 requests/minute per IP
- Export endpoint: 10 requests/hour per job

---

## CORS Policy

**Allowed Origins:**
- `http://localhost:3000` (development)
- `process.env.FRONTEND_URL` (production)

**Credentials:** Enabled

**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS

---

## Versioning

**Current Version:** v1 (implicit)

**Future Versioning Strategy:**
- URL-based versioning: `/api/v2/jobs`
- Header-based versioning: `Accept: application/vnd.api.v2+json`

---

## Related Documentation

- [Architecture - API Backend](./architecture-api.md)
- [Data Models - API](./data-models-api.md)
- [Development Guide - API](./development-guide-api.md)
- [Integration Architecture](./integration-architecture.md)

---

**Document Version:** 1.0.0
**Generated:** 2025-01-18
**Last Updated:** 2025-01-18
