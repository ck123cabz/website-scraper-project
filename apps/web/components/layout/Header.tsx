'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const pathLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/jobs': 'Jobs',
  '/jobs/all': 'All Jobs',
  '/jobs/active': 'Active Jobs',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function Header({ sidebarCollapsed = false, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Dashboard', href: '/' }];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = pathLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const currentPage = breadcrumbs[breadcrumbs.length - 1]?.label || 'Page';

  return (
    <header
      className="sticky top-0 border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-2">
            {breadcrumbs.map((breadcrumb, index) => (
              <React.Fragment key={breadcrumb.href}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span
                  className={cn(
                    'text-sm',
                    index === breadcrumbs.length - 1
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {breadcrumb.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Placeholder for user menu or other actions */}
          <span className="text-xs text-muted-foreground">{currentPage}</span>
        </div>
      </div>
    </header>
  );
}
