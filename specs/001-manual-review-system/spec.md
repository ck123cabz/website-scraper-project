# Feature Specification: Complete Settings Implementation

**Feature Branch**: `001-manual-review-system`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "Fully implement the features in the settings"

## Clarifications

### Session 2025-11-11

- Q: What should happen when a URL in the manual review queue reaches the auto-review timeout? → A: Move to a "stale" queue for expedited review (defer decision, don't auto-approve/reject)
- Q: When a URL is approved/rejected from the manual review queue, where should the final result be persisted? → A: Insert into existing url_results table; soft-delete manual_review_queue entry (set reviewed_at, keep row for audit)
- Q: When a URL requires manual review but the queue is full (queue_size_limit reached), what final status should it receive? → A: Status "queue_overflow" in url_results (explicitly indicates capacity issue, not quality issue)
- Q: When displaying the manual review queue count badge on the dashboard, should it include stale items (is_stale=true) in the count? → A: Include all items (WHERE reviewed_at IS NULL) - total queue workload including stale
- Q: Where should the email notification recipient address be stored and configured? → A: Store in manual_review_settings table as a single email address field (notifications.email_recipient)
- Q: Should the manual review UI show all filter factors/checks being evaluated with visual indicators of which ones were detected? → A: Yes - display all Layer 1, 2, and 3 checks with visual representation (checkmarks, highlights) showing which factors were triggered. This provides frontend feedback of what's actually working in the backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Review Queue Management (Priority: P1)

Users need to review URLs that fall into confidence bands requiring manual review, approve or reject them with reasoning, and track the queue status.

**Why this priority**: This is the core missing functionality. The settings UI allows configuration of manual review rules, but there is no actual queue, making the entire manual review feature non-functional. Without this, users cannot act on URLs that require human judgment.

**Independent Test**: Create a job with URLs that trigger manual review (medium/low confidence), verify they appear in a manual review queue page, approve/reject items from the queue, and verify they move to final results with appropriate status.

**Acceptance Scenarios**:

1. **Given** a URL is processed and assigned a medium confidence band (0.5-0.79), **When** the processing completes, **Then** the URL is added to the manual review queue (not directly to final results) with confidence score, reasoning, and sophistication signals
2. **Given** there are 5 URLs in the manual review queue, **When** a user navigates to the manual review page, **Then** they see all 5 URLs with their confidence scores, domains, reasoning, and sophistication signals in a table
2a. **Given** a URL is displayed in the manual review queue, **When** a user views the URL details, **Then** they see a comprehensive factor breakdown showing all Layer 1 checks (domain age, TLD type, registrar), Layer 2 checks (guest post red flags, content indicators), and Layer 3 checks (sophistication signals) with visual indicators (✓/✗ or highlighted) showing which factors were detected/triggered
3. **Given** a user is viewing a URL in the manual review queue, **When** they click "Approve" and provide optional notes, **Then** the URL is inserted into url_results table with status "approved" and reviewer notes, and the manual_review_queue entry is soft-deleted (reviewed_at set, row retained for audit)
4. **Given** a user is viewing a URL in the manual review queue, **When** they click "Reject" and provide reasoning, **Then** the URL is inserted into url_results table with status "rejected" and rejection reasoning, and the manual_review_queue entry is soft-deleted (reviewed_at set, row retained for audit)
5. **Given** 10 URLs are in the manual review queue (8 fresh + 2 stale), **When** the dashboard loads, **Then** the dashboard shows the total queue count (10) prominently, including both fresh and stale items
6. **Given** the manual review queue is empty, **When** a user navigates to the manual review page, **Then** they see an empty state message indicating no URLs require review

---

### User Story 2 - Confidence Band Action Routing (Priority: P2)

Users configure confidence band actions (auto_approve, manual_review, reject) in settings, and the system routes URLs according to these configured actions rather than hardcoded logic.

**Why this priority**: The confidence_bands settings have an "action" field that is stored in the database but never used. This means users can configure custom routing behavior (e.g., auto-rejecting low confidence instead of manual review) but the system ignores it. This is a quick fix that unlocks flexible routing configurations.

**Independent Test**: Configure confidence bands with custom actions (e.g., set low band action to "reject" instead of "manual_review"), process URLs that fall into each band, and verify they are routed according to the configured actions (not hardcoded logic).

**Acceptance Scenarios**:

1. **Given** confidence bands are configured with high=auto_approve (0.8-1.0), medium=manual_review (0.5-0.79), low=manual_review (0.3-0.49), auto_reject=reject (0-0.29), **When** a URL receives a confidence score of 0.75, **Then** the system reads the "medium" band's action ("manual_review") and routes the URL to the manual review queue
2. **Given** a user changes the "low" confidence band action from "manual_review" to "reject" in settings, **When** a URL receives a confidence score of 0.35, **Then** the system routes the URL directly to final results with status "rejected" (not to manual review queue)
3. **Given** a user changes the "high" confidence band action from "auto_approve" to "manual_review", **When** a URL receives a confidence score of 0.92, **Then** the system routes the URL to the manual review queue instead of auto-approving
4. **Given** confidence bands are configured, **When** any URL is processed through Layer 3, **Then** the system logs which confidence band and action were applied for audit purposes

---

### User Story 3 - Queue Size Limiting (Priority: P3)

Users set a maximum manual review queue size in settings, and the system prevents queue overflow by rejecting or warning when the limit is reached.

**Why this priority**: This prevents the manual review queue from growing uncontrollably, which would make manual review unmanageable. It's a queue management feature that depends on P1 (the queue itself) being built first.

**Independent Test**: Set queue_size_limit to 10, process 15 URLs that would trigger manual review, verify only 10 are queued and the remaining 5 are handled according to overflow policy (rejected with logging).

**Acceptance Scenarios**:

1. **Given** queue_size_limit is set to 100 and there are currently 99 items in the queue, **When** a URL is processed that requires manual review, **Then** the URL is added to the queue (total = 100)
2. **Given** queue_size_limit is set to 100 and there are currently 100 items in the queue, **When** a URL is processed that requires manual review, **Then** the URL is inserted into url_results with status "queue_overflow" and reason "Manual review queue full", and an activity log is created documenting the overflow rejection
3. **Given** queue_size_limit is set to null (unlimited), **When** URLs requiring manual review are processed, **Then** all URLs are queued regardless of queue size
4. **Given** the manual review queue has reached its size limit, **When** a user reviews and approves/rejects an item (reducing queue size to 99), **Then** new URLs requiring manual review can be queued again
5. **Given** a URL receives status "queue_overflow" due to queue size limit, **When** a user views the results table, **Then** the status is clearly distinguishable from quality-based rejections to enable capacity planning and potential re-processing

---

### User Story 4 - Stale Queue Management (Priority: P3)

Users configure auto_review_timeout_days in settings, and URLs sitting in the manual review queue longer than this threshold are flagged as "stale" for expedited review priority without automatic approval/rejection.

**Why this priority**: Prevents URLs from sitting in the queue indefinitely while preserving human judgment. This helps maintain queue velocity by surfacing aged items for prioritized review rather than making automatic quality decisions. Depends on P1 (queue infrastructure).

**Independent Test**: Set auto_review_timeout_days to 7, add a URL to manual review queue, wait 7 days (or manually set queued_at timestamp to 8 days ago), run the scheduled stale-marking job, verify the URL is flagged as stale (is_stale=true) and appears in a "Stale Items" filter on the manual review page.

**Acceptance Scenarios**:

1. **Given** auto_review_timeout_days is set to 7 and a URL has been in the queue for 8 days, **When** the daily stale-marking job runs, **Then** the URL is flagged with is_stale=true, remains in manual review queue, and an activity log entry is created indicating stale status
2. **Given** auto_review_timeout_days is set to 7 and a URL has been in the queue for 5 days, **When** the daily stale-marking job runs, **Then** the URL remains unflagged (is_stale=false)
3. **Given** auto_review_timeout_days is set to null (disabled), **When** URLs sit in the queue for any length of time, **Then** they are never flagged as stale
4. **Given** 10 URLs in the queue are older than the timeout threshold, **When** the stale-marking job runs, **Then** all 10 URLs are flagged as stale in a single batch operation and activity logs are created for each
5. **Given** the manual review page displays 50 items including 12 stale items, **When** a user applies the "Stale Items" filter, **Then** only the 12 stale items are shown, sorted by queued_at (oldest first)
6. **Given** a URL has been flagged as stale (is_stale=true), **When** a user reviews and approves/rejects it, **Then** the URL is processed normally with the stale flag preserved in activity logs for audit purposes

---

### User Story 5 - Email Notifications (Priority: P4)

Users configure email notification settings (threshold, recipient address), and the system sends email alerts when the manual review queue reaches the configured threshold.

**Why this priority**: Helps users stay aware of manual review workload without constantly checking the dashboard. This is a notification enhancement that depends on P1 (queue) being functional.

**Independent Test**: Set email_threshold to 50 and email_recipient to "admin@example.com" in manual_review_settings, fill manual review queue to exactly 50 items, verify an email is sent to admin@example.com with queue size and link to manual review page.

**Acceptance Scenarios**:

1. **Given** email_threshold is set to 50, email_recipient is "admin@example.com", and the queue reaches exactly 50 items, **When** a new URL is added to reach the threshold, **Then** an email is sent to admin@example.com with subject "Manual Review Queue Alert: 50 items pending" and a link to the manual review page
2. **Given** email_threshold is set to 50 and the queue is at 48 items, **When** 5 new URLs are added to the queue (total = 53), **Then** only one email is sent to the configured recipient (not multiple emails for crossing the threshold)
3. **Given** email_threshold is set to 50 and the queue reaches 50 items triggering an email, **When** the queue drops to 45 items and then grows back to 50, **Then** another email is sent to the configured recipient (threshold is re-triggered)
4. **Given** notifications.email_threshold is 0 or not configured, **When** the queue grows, **Then** no emails are sent
5. **Given** notifications.email_recipient is not configured (null or empty), **When** the queue reaches the email_threshold, **Then** no email is sent and an error is logged indicating missing recipient configuration

---

### User Story 6 - Dashboard Badge and Slack Integration (Priority: P4)

Users enable dashboard_badge in settings to see manual review queue count on the dashboard, and optionally enable Slack integration to receive notifications in a Slack channel.

**Why this priority**: Provides real-time visibility into manual review workload. These are notification enhancements that improve user experience but aren't critical to core functionality.

**Independent Test**: Enable dashboard_badge, verify queue count appears as a badge on the dashboard navigation/header. Configure Slack webhook, verify Slack messages are sent when queue reaches threshold.

**Acceptance Scenarios**:

1. **Given** dashboard_badge is enabled and there are 12 items in the manual review queue (10 fresh + 2 stale), **When** a user views the dashboard, **Then** they see a badge showing "12" (total count including stale items) next to the Manual Review link in the navigation
2. **Given** dashboard_badge is disabled, **When** a user views the dashboard, **Then** no badge is shown (even if queue has items)
3. **Given** slack_integration is enabled with a webhook URL and the queue reaches the notification threshold, **When** the threshold is crossed, **Then** a Slack message is posted to the configured channel with queue size and a link to the manual review page
4. **Given** slack_integration is disabled, **When** the queue reaches the notification threshold, **Then** no Slack messages are sent

---

### Edge Cases

- What happens when a URL in the manual review queue is part of a job that gets cancelled? (URL should be removed from queue or marked as cancelled)
- What happens if a user tries to review a URL that was already reviewed by another user? (Show message "This URL was already reviewed" and prevent duplicate action)
- What happens when confidence band thresholds are changed while URLs are in the queue? (Existing queued items retain their original band assignment; only new URLs use new thresholds)
- What happens if notifications.email_recipient is not configured when queue reaches threshold? (Log error indicating missing recipient configuration, skip email send, continue processing)
- What happens if notifications.email_recipient contains an invalid email format? (Settings validation should prevent this during save; reject with error message)
- What happens if email service fails when sending notification? (Log error, retry with exponential backoff, don't block processing)
- What happens if Slack webhook is invalid or service is down? (Log error, continue processing without blocking)
- What happens when stale-flagging job runs and database is unavailable? (Log error, skip this run, retry on next scheduled execution)
- What happens when a user reviews a URL that has been flagged as stale? (Process normally - approve/reject decision is recorded with the stale flag preserved in activity logs for audit)
- What happens if a URL is flagged as stale multiple times by repeated job runs? (Stale flag remains true, no duplicate activity logs; job should only flag items transitioning from fresh to stale)
- How should the manual review queue be queried to exclude reviewed items? (Filter WHERE reviewed_at IS NULL to return only active queue items; reviewed items remain in table for audit but are excluded from queue views/counts)
- Should the dashboard badge count include stale items? (Yes - badge shows total queue workload (WHERE reviewed_at IS NULL) including both fresh and stale items; users can filter for stale items on the manual review page itself)
- What happens if queue_size_limit is reduced below current queue size? (Existing items remain in queue; new items receive status "queue_overflow" until queue size drops below new limit)
- What happens to a URL with status "queue_overflow" if queue capacity becomes available later? (Remains as "queue_overflow" in url_results - no automatic re-processing; user must manually re-submit if desired)
- What happens if a user configures confidence bands with overlapping ranges? (Settings validation should prevent this during save; reject with error message)
- What happens if layer1/2/3_results data is missing or malformed when displaying factor breakdown? (Display error state "Factor data unavailable" for that layer, show available layers normally, log error for debugging)

## Requirements *(mandatory)*

### Functional Requirements

**Manual Review Queue**
- **FR-001**: System MUST persist URLs requiring manual review to a dedicated manual_review_queue table with fields: id, url, job_id, url_id, confidence_band, confidence_score, reasoning, sophistication_signals, layer1_results, layer2_results, layer3_results, queued_at, reviewed_at, review_decision, reviewer_notes
- **FR-001A**: System MUST capture complete evaluation results from all three layers with boolean/status indicators for each factor: **Layer 1** (domain_age, tld_type, registrar_reputation, whois_privacy, ssl_certificate), **Layer 2** (guest_post_red_flags: contact_page, author_bio, pricing_page, submission_guidelines; content_quality_flags: thin_content, duplicate_content, low_engagement), **Layer 3** (design_quality, content_originality, authority_indicators, professional_presentation)
- **FR-002**: System MUST provide API endpoints: **GET /api/manual-review** (fetch paginated queue with filters), **GET /api/manual-review/status** (fetch queue count and metrics), **GET /api/manual-review/:id/factors** (fetch detailed factor breakdown with all Layer 1, 2, and 3 evaluation results per FR-001A), **GET /api/manual-review/:id** (fetch single queue entry), **POST /api/manual-review/:id/review** (mark item as reviewed with approval/rejection decision)
- **FR-003**: System MUST route URLs based on the action field in confidence_bands settings (auto_approve, manual_review, reject) instead of hardcoded band name logic
- **FR-004**: Users MUST be able to approve URLs from the manual review queue with optional notes
- **FR-005**: Users MUST be able to reject URLs from the manual review queue with required reasoning
- **FR-006**: System MUST insert reviewed URLs into the url_results table with appropriate status (approved, rejected) and preserve reviewer notes/reasoning, then soft-delete the manual_review_queue entry by setting reviewed_at timestamp (row retained for audit trail). Implementation note: ManualReviewRouterService.reviewAndSoftDelete() method performs this operation.
- **FR-007**: System MUST display manual review queue count (COUNT(*) WHERE reviewed_at IS NULL) on the dashboard when dashboard_badge setting is enabled, including both fresh and stale items in the total
- **FR-007A**: Manual review page UI MUST display a visual factor breakdown for each URL showing all evaluated factors per FR-001A with clear visual indicators (checkmarks ✓ for detected/triggered factors, X or grayed out for non-triggered factors)
- **FR-007B**: Factor breakdown UI MUST organize checks by layer and factor category matching FR-001A structure (e.g., "Layer 1 - Domain Analysis: domain_age ✓, tld_type ✗, registrar_reputation ✓" / "Layer 2 - Guest Post Red Flags: contact_page ✓, author_bio ✗" / "Layer 3 - Sophistication: design_quality ✓, content_originality ✓") to enable rapid visual assessment of backend detection accuracy

**Queue Management**
- **FR-008**: System MUST enforce queue_size_limit setting by preventing queue insertion when current queue size (WHERE reviewed_at IS NULL) equals or exceeds limit
- **FR-009**: System MUST insert URLs that exceed queue_size_limit directly into url_results table with status "queue_overflow" and reason "Manual review queue full", and create activity log entries documenting the overflow rejection
- **FR-010**: System MUST support unlimited queue size when queue_size_limit is null
- **FR-011**: System MUST run a daily scheduled job to flag URLs older than auto_review_timeout_days setting as stale (is_stale=true)
- **FR-012**: System MUST create activity log entries when URLs are flagged as stale due to timeout
- **FR-013**: System MUST skip stale-flagging when auto_review_timeout_days is null (disabled)
- **FR-013A**: System MUST provide filtering capability on manual review page to show only stale items (is_stale=true), sorted by queued_at ascending

**Confidence Band Routing**
- **FR-014**: System MUST load confidence_bands settings from database during URL processing
- **FR-015**: System MUST determine the confidence band based on score thresholds (e.g., 0.8-1.0 = high)
- **FR-016**: System MUST read the action field from the matching confidence band configuration
- **FR-017**: System MUST route URLs to manual review queue, final results, or rejection based on the configured action
- **FR-018**: System MUST log which confidence band and action were applied for each URL for audit purposes

**Notifications**
- **FR-019**: System MUST send email notification to the address specified in notifications.email_recipient field when manual review queue reaches email_threshold
- **FR-020**: System MUST send only one email per threshold crossing (not multiple emails for same threshold) by tracking last notification timestamp in Redis with key pattern `manual_review:last_email_threshold:{threshold_value}` and TTL of 1 hour
- **FR-020A**: System MUST use Redis to store notification state with key pattern `manual_review:notification_state:{type}` where type is 'email' or 'slack', storing JSON object with fields: last_threshold_crossed (number), last_notification_sent_at (timestamp), current_queue_size (number). Keys expire after 24 hours to allow threshold re-triggering after cooldown period.
- **FR-021**: System MUST include queue count and link to manual review page in email notifications
- **FR-022**: System MUST validate that notifications.email_recipient is configured (not null/empty) before sending email; if missing, log error and skip email send
- **FR-023**: System MUST post Slack message to configured webhook when slack_integration is enabled and queue reaches threshold, using same Redis threshold tracking mechanism as email notifications (see FR-020, FR-020A) to prevent duplicate messages
- **FR-024**: System MUST log errors and continue processing if email or Slack services fail (do not block processing)

### Key Entities

- **ManualReviewQueueEntry**: Represents a URL awaiting manual review (fields: id, url, job_id, url_id, confidence_band, confidence_score, reasoning, sophistication_signals, layer1_results, layer2_results, layer3_results, queued_at, reviewed_at, review_decision, reviewer_notes, is_stale). Active queue items have reviewed_at=null; soft-deleted items (reviewed) have reviewed_at set and are retained for audit trail. The layer1/2/3_results fields contain structured JSON/objects with evaluation results for all factors checked in each layer.
- **FactorEvaluationResults**: Structured evaluation results from each processing layer showing which specific checks were performed and their outcomes. Layer 1: domain age, TLD type, registrar reputation, etc. Layer 2: guest post indicators (contact page, author bio, pricing page), content quality flags. Layer 3: sophistication signals from LLM analysis (design quality, content originality, authority indicators). Each factor has a boolean/status indicator showing if it was detected/triggered.
- **UrlResult**: Final result entry in url_results table containing status (approved/rejected/queue_overflow), confidence score, reasoning, and reviewer notes/reasoning. This is the existing table used for all URL results, including those from manual review. Status "queue_overflow" distinguishes operational rejections (capacity limits) from quality-based rejections.
- **ConfidenceBandAction**: The routing action (auto_approve, manual_review, reject) configured for a specific confidence band
- **NotificationSettings**: Email and Slack notification preferences from manual_review_settings (fields: email_threshold, email_recipient, slack_webhook_url, slack_threshold, dashboard_badge)
- **ReviewDecision**: User's approval/rejection decision with notes/reasoning
- **StaleQueueItem**: URLs flagged as stale due to exceeding auto_review_timeout_days threshold (same table as ManualReviewQueueEntry with is_stale=true)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully review and approve/reject URLs from the manual review queue, with decisions persisted to final results within 2 seconds
- **SC-002**: Manual review queue count is displayed accurately on the dashboard within 1 second of page load when dashboard_badge is enabled
- **SC-003**: System processes 100 URLs through confidence band routing logic, correctly routing each URL based on configured actions (not hardcoded logic) with 100% accuracy
- **SC-004**: Queue size limit is enforced with 100% accuracy - when limit is reached, all new manual review items are rejected with appropriate logging
- **SC-005**: Stale-flagging job marks timed-out queue items as stale (is_stale=true) within 5 minutes of scheduled execution time
- **SC-006**: Email notifications are sent within 30 seconds when manual review queue reaches the configured threshold
- **SC-007**: Slack notifications are sent within 30 seconds when enabled and queue threshold is crossed
- **SC-008**: System handles notification service failures gracefully - URL processing continues even if email/Slack services are unavailable, with error logging for troubleshooting
- **SC-009**: Manual review queue page loads and displays all queued URLs with full details (confidence score, reasoning, signals) in under 2 seconds for queues up to 1000 items
- **SC-010**: 90% of confidence band routing operations complete within 100ms (low latency overhead)
- **SC-011**: Manual review page displays comprehensive factor breakdown showing all Layer 1, 2, and 3 evaluation results with visual indicators (✓/✗) for each checked factor, enabling users to verify backend detection accuracy within 3 seconds of viewing a URL detail view

## Technical Context *(for reference)*

**Current Implementation Status**:
- ✅ Layer 1, 2, and 3 settings are fully implemented and actively used in processing
- 🟡 Confidence bands stored in database but action field NOT used in routing logic (hardcoded instead)
- 🔴 Manual review settings UI exists but zero backend implementation (no queue, no enforcement, no notifications)

**Technology Stack**:
- Backend: NestJS with BullMQ for queue/workers
- Database: Supabase PostgreSQL
- Frontend: Next.js with React Query

**Files Requiring Changes**:
- `apps/api/src/jobs/services/confidence-scoring.service.ts` - Return action field
- `apps/api/src/jobs/services/layer1-domain-analysis.service.ts` - Return structured evaluation results (layer1_results)
- `apps/api/src/jobs/services/layer2-rules.service.ts` - Return structured evaluation results (layer2_results)
- `apps/api/src/jobs/services/llm.service.ts` - Return structured evaluation results (layer3_results)
- `apps/api/src/jobs/services/manual-review-router.service.ts` - Use action from settings, persist layer results
- `apps/api/src/workers/url-worker.processor.ts` - Route to queue with full layer evaluation results
- Create: `apps/api/src/manual-review/` module (service, controller, DTOs for queue and factor breakdown)
- Create: `supabase/migrations/[timestamp]_create_manual_review_queue.sql` (include layer1_results, layer2_results, layer3_results JSONB fields)
- Create: `apps/web/app/manual-review/page.tsx` (manual review queue page)
- Create: `apps/web/components/FactorBreakdown.tsx` (visual factor display component)
- Create: `apps/web/hooks/useManualReviewQueue.ts` (queue data fetching)
- Create: `apps/web/hooks/useFactorBreakdown.ts` (factor data fetching)
