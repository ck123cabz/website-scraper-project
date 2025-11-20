'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useEffect, useState } from 'react';

interface ViewToggleProps {
  onViewChange: (view: 'cards' | 'table') => void;
  className?: string;
}

export function ViewToggle({ onViewChange, className }: ViewToggleProps) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [currentView, setCurrentView] = useState<'cards' | 'table'>('cards');

  // Initialize view from preferences
  useEffect(() => {
    if (preferences?.defaultView) {
      setCurrentView(preferences.defaultView);
      onViewChange(preferences.defaultView);
    }
  }, [preferences, onViewChange]);

  const handleViewChange = (view: string) => {
    const newView = view as 'cards' | 'table';
    setCurrentView(newView);
    onViewChange(newView);

    // Persist preference to backend
    updatePreferences({ defaultView: newView });
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="h-10 w-[200px] animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs value={currentView} onValueChange={handleViewChange}>
        <TabsList>
          <TabsTrigger
            value="cards"
            className="flex items-center gap-2"
            aria-label="Switch to cards view"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cards</span>
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="flex items-center gap-2"
            aria-label="Switch to table view"
          >
            <Table className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Table</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
