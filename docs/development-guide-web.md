# Development Guide - Web Frontend

**Part:** Web Frontend (`apps/web/`)
**Framework:** Next.js 14.2 (App Router)
**Language:** TypeScript 5+
**Last Updated:** 2025-01-18

---

## Quick Start

### Prerequisites

- **Node.js:** 20+ (check `.nvmrc` in project root)
- **npm:** 10+
- **API Backend:** Running on port 3001

---

### Environment Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Configure Environment Variables:**

Create `apps/web/.env.local`:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Supabase (Direct Database Access)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Note:** `NEXT_PUBLIC_` prefix makes variables available in browser.

3. **Start Development Server:**
```bash
cd apps/web
npm run dev
```

Server starts on: http://localhost:3000

---

## Project Structure

```
apps/web/
├── app/                         # Next.js 14 App Router
│   ├── layout.tsx               # Root layout (providers, fonts)
│   ├── page.tsx                 # Home page (redirect to dashboard)
│   ├── globals.css              # Global styles + Tailwind
│   │
│   ├── dashboard/               # Dashboard route
│   │   └── page.tsx
│   │
│   ├── jobs/                    # Jobs routes
│   │   ├── page.tsx
│   │   └── [id]/page.tsx        # Job detail (dynamic route)
│   │
│   └── settings/                # Settings routes
│       ├── page.tsx
│       └── [tab]/page.tsx       # Settings tabs (dynamic)
│
├── components/                  # React components (61 total)
│   ├── ui/                      # Radix UI components (18)
│   ├── dashboard/               # Dashboard components (7)
│   ├── results/                 # Results display (8)
│   ├── settings/                # Settings UI (12)
│   └── [shared]/                # Shared components (15)
│
├── hooks/                       # Custom React hooks
│   ├── useJobs.ts               # Jobs data hook
│   ├── useResults.ts            # Results data hook
│   └── useQueuePolling.ts       # Real-time polling hook
│
├── lib/                         # Utilities
│   ├── api-client.ts            # API client (Axios)
│   ├── supabase.ts              # Supabase client
│   └── utils.ts                 # Helper functions (cn, etc.)
│
├── public/                      # Static assets
├── styles/                      # Additional styles
├── tests/                       # E2E tests (Playwright)
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── next.config.mjs              # Next.js configuration
└── tailwind.config.ts           # Tailwind configuration
```

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests (Jest + Playwright)
npm test

# E2E tests only
npm run test:e2e

# E2E tests in UI mode
npm run test:e2e:ui
```

---

## Routing (Next.js 14 App Router)

### File-Based Routing

```
app/
├── page.tsx                 → /
├── dashboard/page.tsx       → /dashboard
├── jobs/page.tsx            → /jobs
├── jobs/[id]/page.tsx       → /jobs/:id (dynamic route)
└── settings/[tab]/page.tsx  → /settings/:tab
```

### Navigation

**Programmatic:**
```tsx
import { useRouter } from 'next/navigation';

function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard');
  };
}
```

**Link Component:**
```tsx
import Link from 'next/link';

<Link href="/jobs/123">View Job</Link>
```

---

## Server vs Client Components

### Server Components (Default)

**Characteristics:**
- Rendered on server
- Can access backend resources directly
- Cannot use hooks (`useState`, `useEffect`, etc.)
- Cannot use browser APIs

**Example:**
```tsx
// app/dashboard/page.tsx (Server Component)
export default function DashboardPage() {
  // Can fetch data directly on server
  return <ClientComponent />;
}
```

### Client Components

**Characteristics:**
- Rendered in browser
- Can use React hooks
- Can handle user interactions
- Marked with `"use client"` directive

**Example:**
```tsx
// components/job-list.tsx
"use client";

import { useState } from 'react';

export function JobList() {
  const [filter, setFilter] = useState('all');
  return <div>...</div>;
}
```

---

## State Management

### Server State (React Query)

**Setup:**
```tsx
// components/providers/query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Custom Hook:**
```tsx
// hooks/useJobs.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiClient.getJobs(),
    refetchInterval: 5000, // Poll every 5s
  });
}
```

**Usage:**
```tsx
function JobList() {
  const { data: jobs, isLoading, error } = useJobs();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <Table data={jobs} />;
}
```

---

### Client State (Zustand)

**Create Store:**
```tsx
// stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

**Usage:**
```tsx
function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

---

## API Integration

### API Client (Axios)

**Client Setup:**
```tsx
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getJobs = async () => {
  const { data } = await apiClient.get('/jobs');
  return data.data;
};

export const createJob = async (formData: FormData) => {
  const { data } = await apiClient.post('/jobs/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};
```

**Usage with React Query:**
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function JobCreationForm() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiClient.createJob(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleSubmit = (formData: FormData) => {
    createMutation.mutate(formData);
  };
}
```

---

## Styling with Tailwind CSS

### Configuration

**Tailwind Config:**
```typescript
// tailwind.config.ts
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
      },
    },
  },
  plugins: [],
};
```

### Usage

**Utility Classes:**
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
  Submit
</button>
```

**Conditional Classes (using `cn` utility):**
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "primary" && "primary-classes"
)}>
  Content
</div>
```

---

## Component Development

### Creating a New Component

**1. Create Component File:**
```tsx
// components/my-component.tsx
"use client";

import { useState } from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

**2. Use Component:**
```tsx
// app/page.tsx
import { MyComponent } from '@/components/my-component';

export default function Page() {
  return (
    <MyComponent
      title="Test"
      onAction={() => console.log('Action!')}
    />
  );
}
```

---

### Using Radix UI Components

**Example: Dialog**
```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <button>Open Dialog</button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
    </DialogHeader>
    <p>This action cannot be undone.</p>
  </DialogContent>
</Dialog>
```

---

## Testing

### Unit Tests (Jest)

**Test File:** `__tests__/component.test.tsx`

**Example:**
```tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders title', () => {
    render(<MyComponent title="Test" onAction={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('increments count on click', () => {
    render(<MyComponent title="Test" onAction={() => {}} />);
    const button = screen.getByText('Increment');
    button.click();
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

---

### E2E Tests (Playwright)

**Test File:** `tests/e2e/dashboard.spec.ts`

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('should display dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Active Jobs')).toBeVisible();
});

test('should create a new job', async ({ page }) => {
  await page.goto('http://localhost:3000/jobs');

  await page.getByRole('button', { name: 'Create Job' }).click();
  await page.getByLabel('Job Name').fill('Test Job');
  await page.getByLabel('URLs').fill('https://example.com');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Job created successfully')).toBeVisible();
});
```

**Run E2E Tests:**
```bash
npm run test:e2e
```

---

## Debugging

### React Developer Tools

**Install:** [React DevTools](https://react.dev/learn/react-developer-tools)

**Features:**
- Inspect component tree
- View props and state
- Profile performance

---

### Network Debugging

**Browser DevTools:**
- Network tab: Monitor API calls
- Console: View logs and errors
- React Query DevTools: Inspect queries and mutations

**Enable React Query DevTools:**
```tsx
// components/providers/query-provider.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## Performance Optimization

### Code Splitting

**Dynamic Imports:**
```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Disable SSR if not needed
});
```

---

### Memoization

**React.memo:**
```tsx
import React from 'react';

export const ExpensiveComponent = React.memo(({ data }) => {
  // Only re-renders if data changes
  return <div>{data}</div>;
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});
```

**useMemo:**
```tsx
import { useMemo } from 'react';

function DataTable({ data }) {
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return <Table data={sortedData} />;
}
```

---

## Deployment

### Build for Production

```bash
npm run build
```

**Output:** `.next/` directory

---

### Railway Deployment

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm run start
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: Production API URL
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

---

## Troubleshooting

### API Connection Error

**Error:** `Network Error` or `CORS Error`

**Solution:**
- Ensure API backend is running on port 3001
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS configuration in API (`main.ts`)

---

### Hydration Mismatch

**Error:** `Warning: Text content did not match`

**Cause:** Server and client rendered different HTML

**Solution:**
- Avoid using `Date.now()` or `Math.random()` in SSR
- Use `useEffect` for client-only code
- Suppress hydration warning: `suppressHydrationWarning={true}`

---

### React Query Not Refetching

**Check:**
- `refetchInterval` is set correctly
- `staleTime` is appropriate
- Query key includes all dependencies

**Manual Refetch:**
```tsx
const { refetch } = useJobs();

<button onClick={() => refetch()}>Refresh</button>
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Architecture - Web](./architecture-web.md)
- [Component Inventory](./component-inventory-web.md)

---

**Document Version:** 1.0.0
**Generated:** 2025-01-18
