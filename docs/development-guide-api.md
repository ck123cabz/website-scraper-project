# Development Guide - API Backend

**Part:** API Backend (`apps/api/`)
**Framework:** NestJS 10.3
**Language:** TypeScript 5.5
**Last Updated:** 2025-01-18

---

## Quick Start

### Prerequisites

- **Node.js:** 20+ (check `.nvmrc` in project root)
- **npm:** 10+
- **Redis:** Running locally or via Docker
- **PostgreSQL:** Via Supabase account

**Install Node.js (using nvm):**
```bash
nvm install 20
nvm use 20
```

**Start Redis (Docker):**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

---

### Environment Setup

1. **Clone Repository:**
```bash
git clone <repository-url>
cd website-scraper-project
```

2. **Install Dependencies:**
```bash
npm install
```

3. **Configure Environment Variables:**

Create `apps/api/.env`:
```env
# External APIs (REQUIRED)
SCRAPINGBEE_API_KEY=your_scrapingbee_key
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Infrastructure (REQUIRED)
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Testing (OPTIONAL)
USE_MOCK_SERVICES=false  # Set to 'true' to bypass external API calls
```

**Get API Keys:**
- ScrapingBee: https://www.scrapingbee.com/
- Gemini: https://ai.google.dev/
- OpenAI: https://platform.openai.com/
- Supabase: https://supabase.com/ (create project, get service role key)

4. **Run Database Migrations:**
```bash
cd supabase
npx supabase db push
```

---

### Development Commands

**Start Development Server:**
```bash
cd apps/api
npm run dev
```

Server starts on: http://localhost:3001

**Available URLs:**
- API: http://localhost:3001
- Swagger Docs: http://localhost:3001/api/docs
- Bull Board (Queue Dashboard): http://localhost:3001/admin/queues
- Health Check: http://localhost:3001/health

---

### Build & Production

**Build for Production:**
```bash
npm run build
```

Output: `apps/api/dist/`

**Start Production Server:**
```bash
npm run start:prod
```

---

## Project Structure

```
apps/api/
├── src/
│   ├── main.ts                    # Entry point & bootstrap
│   ├── app.module.ts              # Root module
│   │
│   ├── jobs/                      # Jobs module
│   │   ├── jobs.controller.ts
│   │   ├── jobs.service.ts
│   │   ├── jobs.module.ts
│   │   ├── dto/                   # Data Transfer Objects
│   │   └── services/              # Sub-services
│   │
│   ├── queue/                     # BullMQ queue management
│   ├── workers/                   # Background processors
│   ├── scraper/                   # Web scraping
│   ├── settings/                  # Settings management
│   ├── supabase/                  # Database client
│   ├── health/                    # Health check
│   └── __tests__/                 # Integration & load tests
│
├── dist/                          # Compiled JavaScript
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env                           # Environment variables (gitignored)
```

---

## Common Development Tasks

### 1. Create a New Module

```bash
cd apps/api
nest generate module my-module
nest generate controller my-module
nest generate service my-module
```

**Files Created:**
- `src/my-module/my-module.module.ts`
- `src/my-module/my-module.controller.ts`
- `src/my-module/my-module.service.ts`

**Register in App Module:**
```typescript
// src/app.module.ts
import { MyModule } from './my-module/my-module.module';

@Module({
  imports: [MyModule, ...],
})
export class AppModule {}
```

---

### 2. Add a New API Endpoint

**Create DTO:**
```typescript
// src/my-module/dto/create-item.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Add Controller Method:**
```typescript
// src/my-module/my-module.controller.ts
@Post()
async create(@Body() dto: CreateItemDto) {
  return this.service.create(dto);
}
```

**Implement Service Logic:**
```typescript
// src/my-module/my-module.service.ts
async create(dto: CreateItemDto) {
  const result = await this.supabase
    .from('items')
    .insert(dto)
    .select()
    .single();
  return result.data;
}
```

---

### 3. Add Database Migration

```bash
cd supabase
npx supabase migration new migration_name
```

**Edit Migration File:**
```sql
-- supabase/migrations/YYYYMMDDHHmmss_migration_name.sql
ALTER TABLE my_table
ADD COLUMN new_column TEXT;
```

**Apply Migration:**
```bash
npx supabase db push
```

---

### 4. Add Background Job Worker

**Create Processor:**
```typescript
// src/workers/my-worker.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('my-queue')
export class MyWorkerProcessor extends WorkerHost {
  async process(job: Job<any>) {
    console.log('Processing job:', job.data);
    // Your processing logic here
    return { result: 'success' };
  }
}
```

**Register in Module:**
```typescript
// src/workers/workers.module.ts
@Module({
  providers: [MyWorkerProcessor],
})
export class WorkersModule {}
```

**Enqueue Jobs:**
```typescript
// In your service
await this.queueService.addJob('my-queue', { data: 'value' });
```

---

## Testing

### Unit Tests

**Run All Tests:**
```bash
npm test
```

**Run Tests in Watch Mode:**
```bash
npm run test:watch
```

**Run with Coverage:**
```bash
npm run test:cov
```

**Test File Pattern:** `**/__tests__/*.spec.ts`

**Example Test:**
```typescript
// src/jobs/__tests__/jobs.service.spec.ts
import { Test } from '@nestjs/testing';
import { JobsService } from '../jobs.service';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [JobsService],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should create a job', async () => {
    const result = await service.createJob({ name: 'Test Job' });
    expect(result).toBeDefined();
    expect(result.name).toBe('Test Job');
  });
});
```

---

### Integration Tests

**Location:** `src/__tests__/integration/*.spec.ts`

**Run Integration Tests:**
```bash
npm test -- integration
```

**Example:**
```typescript
// src/__tests__/integration/csv-export.spec.ts
describe('CSV Export Integration', () => {
  it('should export results to CSV', async () => {
    const stream = await exportService.streamCSVExport(jobId, 'complete');
    expect(stream).toBeDefined();
  });
});
```

---

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/apps/api",
      "console": "integratedTerminal",
      "restart": true
    }
  ]
}
```

**Set Breakpoints:**
- Click line number gutter in VS Code
- Debugger will pause at breakpoint

---

### Logging

**Use NestJS Logger:**
```typescript
import { Logger } from '@nestjs/common';

export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething() {
    this.logger.log('Doing something...');
    this.logger.warn('Warning message');
    this.logger.error('Error message', error.stack);
  }
}
```

**Log Levels:**
- `log`: General information
- `warn`: Warning messages
- `error`: Error messages with stack traces
- `debug`: Debug information (development only)

---

## Code Quality

### Linting

**Run ESLint:**
```bash
npm run lint
```

**Auto-Fix Issues:**
```bash
npm run lint -- --fix
```

**ESLint Rules:** `.eslintrc.js`

---

### Type Checking

**Run TypeScript Compiler Check:**
```bash
npm run type-check
```

**Fix Type Errors:**
- Check `tsconfig.json` for strict mode settings
- Add type annotations where needed
- Use `@ts-expect-error` for unavoidable issues (with comment)

---

### Formatting

**Prettier Configuration:** `.prettierrc`

**Format Code:**
```bash
npx prettier --write "src/**/*.ts"
```

**IDE Integration:** Install Prettier extension for auto-format on save

---

## Troubleshooting

### Redis Connection Error

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Start Redis via Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally (macOS)
brew install redis
brew services start redis
```

---

### Missing Environment Variables

**Error:** `Missing required environment variables: GEMINI_API_KEY`

**Solution:**
- Check `apps/api/.env` file exists
- Verify all required variables are set
- Restart development server

---

### Database Connection Error

**Error:** `Error: connect ETIMEDOUT (Supabase)`

**Solution:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Check network connectivity
- Ensure Supabase project is not paused (free tier)

---

### Queue Not Processing Jobs

**Check:**
1. Redis is running
2. Workers module is registered in `AppModule`
3. Check Bull Board dashboard: http://localhost:3001/admin/queues
4. Review worker logs in console

---

## Performance Tips

### Database Queries

**Use Indexes:**
- Ensure indexes exist for frequently queried columns
- Check query plans with `EXPLAIN ANALYZE`

**Batch Operations:**
```typescript
// Good: Batch insert
await this.supabase.from('results').insert(results);

// Bad: Loop with individual inserts
for (const result of results) {
  await this.supabase.from('results').insert(result);
}
```

---

### Caching

**In-Memory Cache (node-cache):**
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min TTL

// Get or fetch
let data = cache.get('key');
if (!data) {
  data = await fetchExpensiveData();
  cache.set('key', data);
}
```

---

## Deployment

### Railway Deployment

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm run start:prod
```

**Environment Variables:**
- Set all `.env` variables in Railway dashboard
- Use Railway's Redis addon for `REDIS_URL`

**Health Check:**
- Endpoint: `/health`
- Expected response: `{ "status": "ok" }`

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Architecture - API](./architecture-api.md)
- [API Contracts](./api-contracts-api.md)
- [Data Models](./data-models-api.md)

---

**Document Version:** 1.0.0
**Generated:** 2025-01-18
