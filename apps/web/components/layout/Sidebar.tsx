'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  Briefcase,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/components/shared/ThemeProvider';
import { useUserPreferences } from '@/hooks/use-user-preferences';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: 'Home', href: '/', icon: <Home className="h-5 w-5" /> },
  { name: 'Jobs', href: '/jobs/all', icon: <Briefcase className="h-5 w-5" /> },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  { name: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed: externalCollapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { preferences, updatePreferences } = useUserPreferences();
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // ALWAYS call useTheme hook unconditionally (Rules of Hooks requirement)
  const themeContext = useTheme();

  const collapsed = externalCollapsed ?? internalCollapsed;

  // Set mounted flag to enable theme functionality
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleCollapse = (newState: boolean) => {
    setInternalCollapsed(newState);
    onCollapsedChange?.(newState);
    // Persist to preferences
    updatePreferences({ sidebarCollapsed: newState });
  };

  // Sync with persisted preferences on load
  React.useEffect(() => {
    if (preferences?.sidebarCollapsed !== undefined) {
      setInternalCollapsed(preferences.sidebarCollapsed);
    }
  }, [preferences?.sidebarCollapsed]);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen border-r border-border bg-background transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-border px-4 py-6',
          collapsed && 'justify-center',
        )}
      >
        {!collapsed && <h1 className="text-lg font-semibold">Scraper</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleCollapse(!collapsed)}
          className="h-8 w-8"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-2 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center space-x-0',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle Footer */}
      {mounted && (
        <div
          className={cn(
            'absolute bottom-4 left-4 right-4 border-t border-border pt-4',
            collapsed && 'left-2 right-2',
          )}
        >
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={() => {
              const newTheme =
                themeContext.resolvedTheme === 'dark' ? 'light' : 'dark';
              themeContext.setTheme(newTheme as 'light' | 'dark');
            }}
            className="w-full"
            aria-label="Toggle theme"
          >
            {themeContext.resolvedTheme === 'dark' ? '🌙' : '☀️'}
            {!collapsed && <span className="ml-2">Theme</span>}
          </Button>
        </div>
      )}
    </aside>
  );
}
