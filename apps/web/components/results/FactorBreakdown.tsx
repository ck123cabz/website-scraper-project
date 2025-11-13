// Stub file for FactorBreakdown component (to be implemented in T048)
// This allows tests to run and fail properly (TDD approach)

import { Layer1Factors, Layer2Factors, Layer3Factors } from '@website-scraper/shared';

export interface FactorBreakdownProps {
  layer1?: Layer1Factors | null;
  layer2?: Layer2Factors | null;
  layer3?: Layer3Factors | null;
  isLoading?: boolean;
}

export function FactorBreakdown({ layer1, layer2, layer3, isLoading }: FactorBreakdownProps) {
  // Stub implementation - will be replaced in T048
  return null;
}
