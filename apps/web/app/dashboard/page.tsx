import { redirect } from 'next/navigation';

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic';

/**
 * Dashboard page now redirects to home page (/)
 * The main dashboard functionality has been moved to the root route.
 * This redirect maintains backward compatibility for users who bookmarked /dashboard.
 */
export default function DashboardPage() {
  redirect('/');
}
