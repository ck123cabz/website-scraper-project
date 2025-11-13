/**
 * FactorBreakdown Component (T048)
 *
 * Container component that displays Layer 1, 2, and 3 analysis factors together.
 * Used within ResultRow to show expanded factor details for URL results.
 *
 * Features:
 * - Orchestrates display of all three layer components
 * - Handles loading and error states
 * - Gracefully handles null factors (pre-migration data)
 * - Responsive layout with consistent spacing
 */

import * as React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
  Layer1Factors as Layer1FactorsType,
  Layer2Factors as Layer2FactorsType,
  Layer3Factors as Layer3FactorsType
} from '@website-scraper/shared';
import { Layer1Factors } from './Layer1Factors';
import { Layer2Factors } from './Layer2Factors';
import { Layer3Factors } from './Layer3Factors';

export interface FactorBreakdownProps {
  /** Layer 1 domain analysis factors (may be null for pre-migration data) */
  layer1?: Layer1FactorsType | null;

  /** Layer 2 publication detection factors (may be null for pre-migration data) */
  layer2?: Layer2FactorsType | null;

  /** Layer 3 sophistication analysis factors (may be null for pre-migration data) */
  layer3?: Layer3FactorsType | null;

  /** Loading state indicator */
  isLoading?: boolean;

  /** Error message to display if factor loading fails */
  error?: string;
}

/**
 * FactorBreakdown displays detailed factor analysis across all three layers.
 *
 * Each layer is rendered in its own card with proper spacing:
 * - Layer 1: Domain Analysis
 * - Layer 2: Publication Detection
 * - Layer 3: Sophistication Analysis
 *
 * The component handles:
 * - Loading states (passed through to layer components)
 * - Error states (displayed at container level)
 * - Null factors (pre-migration data)
 * - Responsive layout
 */
export function FactorBreakdown({
  layer1,
  layer2,
  layer3,
  isLoading = false,
  error
}: FactorBreakdownProps) {
  // Error state at container level
  if (error) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state at container level
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-sm text-muted-foreground">Loading factor analysis...</p>
        </div>
      </div>
    );
  }

  // Check if we have any data at all (handle pre-migration records)
  const hasAnyData = layer1 || layer2 || layer3;

  if (!hasAnyData) {
    return (
      <div className="w-full bg-muted/30 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          No factor data available. This may be a pre-migration record.
        </p>
      </div>
    );
  }

  // Main render: display all present layers
  return (
    <div className="w-full space-y-6" data-testid="factor-breakdown">
      {/* Layer 1: Domain Analysis */}
      {layer1 && (
        <div data-testid="layer1-data">
          <Layer1Factors factors={layer1} />
        </div>
      )}

      {/* Layer 2: Publication Detection */}
      {layer2 && (
        <div data-testid="layer2-data">
          <Layer2Factors factors={layer2} />
        </div>
      )}

      {/* Layer 3: Sophistication Analysis */}
      {layer3 && (
        <div data-testid="layer3-data">
          <Layer3Factors factors={layer3} />
        </div>
      )}
    </div>
  );
}
