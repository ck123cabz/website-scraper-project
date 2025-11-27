'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '@/components/command/CommandPalette';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);

  // Auto-collapse sidebar on mobile viewports (< 768px)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setSidebarCollapsed(true);
      }
    };

    // Set initial state
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Main Content */}
        <div
          className={cn(
            'flex flex-1 flex-col overflow-hidden transition-[margin] duration-300',
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
          )}
        >
          {/* Header */}
          <Header
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="px-4 py-6 sm:px-6">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Mobile overlay - shown when sidebar is open on mobile */}
        {sidebarCollapsed === false && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
