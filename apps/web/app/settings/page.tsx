import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SettingsContent } from './SettingsContent';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
