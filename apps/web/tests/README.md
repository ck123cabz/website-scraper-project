# E2E Testing Framework - Playwright

This directory contains the end-to-end testing framework for the Website Scraper application using Playwright.

## Setup

### Prerequisites

- Node.js 20+ (see `.nvmrc` in project root)
- npm 10+

### Installation

1. Install dependencies (if not already installed):
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your local configuration.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see the browser)
```bash
npm run test:e2e:headed
```

### Debug a specific test
```bash
npm run test:e2e:debug
```

### View last test report
```bash
npm run test:e2e:report
```

## Project Structure

```
tests/
├── e2e/                    # E2E test files
│   ├── example.spec.ts     # Example tests
│   └── smoke.spec.ts       # Smoke tests
├── support/
│   ├── fixtures/           # Test fixtures
│   │   └── base-fixtures.ts
│   └── helpers/            # Helper functions
│       ├── assertions.ts   # Custom assertions
│       ├── job-factory.ts  # Job data factory
│       ├── page-helpers.ts # Page interaction helpers
│       └── user-factory.ts # User data factory
└── README.md              # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../support/fixtures/base-fixtures';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test logic here
  });
});
```

### Using Data Factories

```typescript
test('create job with factory', async ({ page, jobFactory }) => {
  const job = jobFactory.create({ url: 'https://example.com' });

  // Use the generated job data in your test
  await page.fill('[name="url"]', job.url);
});
```

### Using Helper Functions

```typescript
import { clickByTestId, fillFormByTestId } from '../support/helpers/page-helpers';
import { expectTestIdToBeVisible } from '../support/helpers/assertions';

test('use helpers', async ({ page }) => {
  await fillFormByTestId(page, {
    'email': 'test@example.com',
    'password': 'password123'
  });

  await clickByTestId(page, 'submit-button');
  await expectTestIdToBeVisible(page, 'success-message');
});
```

## Best Practices

### 1. Use data-testid selectors
Always add `data-testid` attributes to UI elements for stable selectors:
```typescript
<button data-testid="submit-button">Submit</button>
```

### 2. Use factories for test data
Don't hardcode test data - use the provided factories:
```typescript
const user = userFactory.create();
const jobs = jobFactory.createMany(5);
```

### 3. Follow the AAA pattern
Structure tests with Arrange, Act, Assert:
```typescript
test('example', async ({ page }) => {
  // Arrange - Set up test data and state
  const job = jobFactory.create();

  // Act - Perform the action
  await page.goto('/');
  await page.fill('[name="url"]', job.url);
  await page.click('button[type="submit"]');

  // Assert - Verify the outcome
  await expect(page.locator('.success')).toBeVisible();
});
```

### 4. Keep tests independent
Each test should be able to run independently in any order.

### 5. Use proper waits
Always wait for elements to be ready:
```typescript
// Good
await page.waitForSelector('[data-testid="result"]');
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// Bad
await page.click('button'); // Might click before button is ready
```

## Configuration

### Timeouts
- Action timeout: 15 seconds
- Navigation timeout: 30 seconds
- Test timeout: 60 seconds

These can be adjusted in `playwright.config.ts`.

### Browsers
Tests run on:
- Chromium (primary)
- Firefox
- WebKit (Safari)

Mobile viewports are available but commented out by default.

### Reporters
- HTML report (for visual review)
- JUnit XML (for CI integration)
- List (console output)

## CI/CD Integration

The framework is CI-ready:
- Tests retry 2 times on failure in CI
- Tests run serially in CI for stability
- Screenshots and videos only captured on failure
- HTML and JUnit reports generated

## Debugging

### Use Playwright Inspector
```bash
npm run test:e2e:debug
```

### Use trace viewer
Traces are automatically captured on first retry. View them:
```bash
npx playwright show-trace trace.zip
```

### Enable headed mode
```bash
npm run test:e2e:headed
```

## Common Issues

### Port already in use
Ensure no other process is using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Browsers not installed
```bash
npx playwright install
```

### Environment variables not loaded
Copy `.env.example` to `.env` and configure values.

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Faker.js Documentation](https://fakerjs.dev)
