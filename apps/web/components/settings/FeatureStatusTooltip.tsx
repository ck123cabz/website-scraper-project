import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FeatureStatusTooltipProps {
  implemented: boolean;
  children: React.ReactNode;
  message?: string;
}

export function FeatureStatusTooltip({ implemented, children, message }: FeatureStatusTooltipProps) {
  if (implemented) {
    return <>{children}</>;
  }

  const defaultMessage = '⚠️ Not yet implemented - Settings saved but not applied to job processing until Story 3.1';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex items-start gap-2">
            {children}
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-1" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{message || defaultMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
