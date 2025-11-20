'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Home,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const commands = [
  {
    category: 'Navigation',
    items: [
      {
        label: 'Home',
        description: 'Go to dashboard',
        href: '/',
        icon: <Home className="h-4 w-4" />,
      },
      {
        label: 'Jobs',
        description: 'View all jobs',
        href: '/jobs/all',
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        label: 'Analytics',
        description: 'View analytics dashboard',
        href: '/analytics',
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        label: 'Settings',
        description: 'Open settings',
        href: '/settings',
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  {
    category: 'Actions',
    items: [
      {
        label: 'Create Job',
        description: 'Start a new scraping job',
        action: 'create-job',
        icon: <Briefcase className="h-4 w-4" />,
      },
    ],
  },
];

export function CommandPalette({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: CommandPaletteProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const onOpenChange = externalOnOpenChange ?? setInternalOpen;

  // Register keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (item: any) => {
      if (item.href) {
        router.push(item.href);
      }
      onOpenChange(false);
    },
    [router, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search commands, go to pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.category} heading={group.category}>
            {group.items.map((item) => (
              <CommandItem
                key={item.label}
                value={item.label}
                onSelect={() => handleSelect(item)}
              >
                {item.icon}
                <div className="ml-2 flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
          ⌘K
        </kbd>
        <span className="ml-2">to open</span>
      </div>
    </CommandDialog>
  );
}
