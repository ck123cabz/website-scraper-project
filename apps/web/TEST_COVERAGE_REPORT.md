# Web App Test Coverage Report

**Date:** 2025-11-18
**Command Run:** `npm run test:coverage`
**Working Directory:** `/Users/s0mebody/Desktop/dev/projects/website-scraper-project/apps/web`

## Executive Summary

- **Test Status:** 482 passing, 123 failing out of 605 total tests (79.7% pass rate)
- **Test Suites:** 21 passed, 10 failed, 31 total
- **Execution Time:** 9.376 seconds

## Overall Coverage Metrics

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | 47.81% | ❌ Below 80% |
| **Branches** | 47.29% | ❌ Below 80% |
| **Functions** | 41.88% | ❌ Below 80% |
| **Lines** | 48.26% | ❌ Below 80% |

## Hooks Coverage (Detailed Breakdown)

**Overall Hooks Directory Coverage:**

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | 40.96% | ❌ Below 80% |
| **Branches** | 41.42% | ❌ Below 80% |
| **Functions** | 38.46% | ❌ Below 80% |
| **Lines** | 42.37% | ❌ Below 80% |

### Individual Hook Files

| File | Statements | Branches | Functions | Lines | Uncovered Lines |
|------|-----------|----------|-----------|-------|-----------------|
| **job-transform.ts** | 100% ✅ | 92.30% ✅ | 100% ✅ | 100% ✅ | 5-6 |
| **use-activity-logs.ts** | 0% ❌ | 0% ❌ | 0% ❌ | 0% ❌ | 1-97 |
| **use-current-url-timer.ts** | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ | - |
| **use-export-results.ts** | 100% ✅ | 50% ⚠️ | 100% ✅ | 100% ✅ | 20 |
| **use-jobs.ts** | 19.56% ❌ | 11.11% ❌ | 11.53% ❌ | 20.68% ❌ | 16-18, 55-243 |
| **use-results.ts** | 0% ❌ | 0% ❌ | 0% ❌ | 0% ❌ | 1-84 |
| **use-toast.ts** | 0% ❌ | 0% ❌ | 0% ❌ | 0% ❌ | 4-194 |
| **use-user-preferences.ts** | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ | - |
| **useQueuePolling.ts** | 90.32% ✅ | 69.69% ⚠️ | 88.88% ✅ | 93.10% ✅ | 35, 66 |
| **useSettings.ts** | 100% ✅ | 66.66% ⚠️ | 100% ✅ | 100% ✅ | 84-95 |

### Hooks Coverage Analysis

**✅ Hooks Meeting >80% Threshold (5 files):**
1. `job-transform.ts` - 100% coverage (near perfect)
2. `use-current-url-timer.ts` - 100% coverage (perfect)
3. `use-export-results.ts` - 100% statements (needs branch improvement)
4. `use-user-preferences.ts` - 100% coverage (perfect)
5. `useQueuePolling.ts` - 90.32% statements (good)

**❌ Hooks Below >80% Threshold (5 files):**
1. `use-activity-logs.ts` - 0% coverage (completely untested)
2. `use-jobs.ts` - 19.56% coverage (minimal coverage)
3. `use-results.ts` - 0% coverage (completely untested)
4. `use-toast.ts` - 0% coverage (completely untested)
5. `useSettings.ts` - needs branch coverage improvement (66.66%)

## Component Coverage

### High Coverage Components (>80%)

| Component | Statements | Lines |
|-----------|-----------|-------|
| badge.tsx | 100% | 100% |
| button.tsx | 100% | 100% |
| card.tsx | 100% | 100% |
| checkbox.tsx | 100% | 100% |
| input.tsx | 100% | 100% |
| label.tsx | 100% | 100% |
| radio-group.tsx | 100% | 100% |
| skeleton.tsx | 100% | 100% |
| slider.tsx | 100% | 100% |
| tabs.tsx | 100% | 100% |
| textarea.tsx | 100% | 100% |
| utils.ts (lib/) | 100% | 100% |

### Low Coverage Components (<50%)

| Component | Statements | Lines | Issue |
|-----------|-----------|-------|-------|
| realtime-service.ts | 0% | 0% | No tests |
| supabase-client.ts | 0% | 0% | No tests |
| api-client.ts | 14.28% | 15.21% | Minimal coverage |
| toast.tsx | 0% | 0% | No tests |
| toaster.tsx | 0% | 0% | No tests |
| tooltip.tsx | 0% | 0% | No tests |
| command.tsx | 0% | 0% | No tests |

## Coverage Gaps and Recommendations

### Critical Priority (P0 - Immediate Action)

1. **use-toast.ts** - 0% coverage
   - This is a critical UI hook with 194 lines
   - Test file exists at `hooks/__tests__/use-toast.test.ts` but may not be comprehensive
   - Recommend: Add tests for all toast variants and edge cases

2. **use-activity-logs.ts** - 0% coverage
   - 97 lines completely untested
   - Core feature for activity tracking
   - Recommend: Add comprehensive test suite

3. **use-results.ts** - 0% coverage
   - 84 lines untested
   - Core data fetching hook
   - Recommend: Add React Query mocking and test all query states

### High Priority (P1 - Next Sprint)

4. **use-jobs.ts** - 19.56% coverage
   - Only 20% coverage with 188 uncovered lines (55-243)
   - Critical job management hook
   - Recommend: Expand existing tests to cover all job operations

5. **api-client.ts** - 14.28% coverage
   - Core API communication layer
   - 90+ lines uncovered
   - Recommend: Add integration tests with MSW (Mock Service Worker)

### Medium Priority (P2 - Future Sprints)

6. **Branch Coverage Improvements**
   - `useQueuePolling.ts` - 69.69% branches (target: 80%+)
   - `useSettings.ts` - 66.66% branches (target: 80%+)
   - `use-export-results.ts` - 50% branches (target: 80%+)

7. **UI Components**
   - toast.tsx, toaster.tsx, tooltip.tsx - 0% coverage
   - command.tsx - 0% coverage
   - Recommend: Add React Testing Library tests for user interactions

8. **Infrastructure**
   - realtime-service.ts - 0% coverage
   - supabase-client.ts - 0% coverage
   - Recommend: Add integration tests with mocked Supabase client

## Tech Spec Compliance

### Requirement: >80% coverage for hooks

**Status:** ❌ **NOT MET**

**Current Hooks Coverage:** 40.96% (statements)

**Gap Analysis:**
- Need to increase hooks coverage by **39.04 percentage points**
- 5 out of 10 hook files meet the threshold (50% of files)
- 5 hook files require significant testing work

### Path to Compliance

To achieve >80% hooks coverage, the following files must be improved:

| File | Current | Target | Additional Tests Needed |
|------|---------|--------|------------------------|
| use-activity-logs.ts | 0% → 80% | +80pp | Full test suite (est. 15-20 tests) |
| use-results.ts | 0% → 80% | +80pp | Full test suite (est. 12-15 tests) |
| use-toast.ts | 0% → 80% | +80pp | Full test suite (est. 20-25 tests) |
| use-jobs.ts | 19.56% → 80% | +60.44pp | Expand tests (est. 15-20 tests) |
| useSettings.ts | 100% → 80% | ✅ Met | Improve branch coverage only |

**Estimated Effort:**
- **Total Additional Tests:** 62-80 test cases
- **Estimated Time:** 3-4 developer days
- **Complexity:** Medium-High (requires React Query mocking, async state testing)

## Test Failures Summary

**Failed Test Suites:** 10 suites
**Failed Tests:** 123 individual test failures

Common failure patterns observed in output:
- XMLHttpRequest/JSDOM network errors (likely mock configuration issues)
- CSV export performance tests timing out
- Component rendering failures (potentially prop validation issues)

## Next Steps

1. **Immediate (This Week):**
   - Fix failing tests to achieve 100% pass rate
   - Add tests for `use-toast.ts` (most critical, most lines)
   - Add tests for `use-activity-logs.ts`

2. **Short-term (Next Sprint):**
   - Complete test coverage for `use-results.ts`
   - Expand `use-jobs.ts` coverage to 80%+
   - Improve branch coverage for partially covered hooks

3. **Medium-term (Following Sprint):**
   - Add infrastructure layer tests (api-client, supabase-client, realtime-service)
   - Add UI component tests for untested components
   - Achieve overall >80% coverage target

## Coverage Report Location

- **HTML Report:** `/Users/s0mebody/Desktop/dev/projects/website-scraper-project/apps/web/coverage/lcov-report/index.html`
- **Coverage Data:** `/Users/s0mebody/Desktop/dev/projects/website-scraper-project/apps/web/coverage/coverage-final.json`
- **LCOV Info:** `/Users/s0mebody/Desktop/dev/projects/website-scraper-project/apps/web/coverage/lcov.info`

## Conclusion

While some hooks demonstrate excellent test coverage (100% for 4 hooks), the overall hooks coverage of **40.96%** falls significantly short of the **>80% requirement** specified in the tech spec. To achieve compliance:

- **5 hook files** require immediate attention with substantial test additions
- Approximately **62-80 new test cases** need to be written
- Estimated **3-4 developer days** of focused testing work
- Current test pass rate (79.7%) should be improved to 100% before adding new tests

The infrastructure is in place (Jest, React Testing Library, test files exist), but comprehensive test cases need to be implemented to meet the coverage requirements.
