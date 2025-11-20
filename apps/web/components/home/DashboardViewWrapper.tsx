'use client';

import { useState } from 'react';
import { ViewToggle } from './ViewToggle';
import { JobsCardsView } from './JobsCardsView';
import { JobsTableView } from './JobsTableView';

/**
 * DashboardViewWrapper manages the client-side state for switching between cards and table views.
 * This separates client-side interactivity from server-side rendering for optimal performance.
 */
export function DashboardViewWrapper() {
  const [currentView, setCurrentView] = useState<'cards' | 'table'>('cards');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Recent Jobs</h2>
        <ViewToggle onViewChange={setCurrentView} />
      </div>

      {/* Conditional View Rendering */}
      {currentView === 'cards' ? (
        <JobsCardsView />
      ) : (
        <JobsTableView />
      )}
    </div>
  );
}
