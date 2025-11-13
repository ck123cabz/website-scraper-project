import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Layer3Factors as Layer3FactorsType } from '@website-scraper/shared';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface Layer3FactorsProps {
  factors: Layer3FactorsType | null;
  loading?: boolean;
  error?: string;
}

export function Layer3Factors({ factors, loading, error }: Layer3FactorsProps) {
  // State for expandable sections
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer 3: Sophistication Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="animate-pulse">Loading Layer 3 analysis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer 3: Sophistication Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Null data state
  if (!factors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer 3: Sophistication Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            No Layer 3 data available. This may be a pre-migration record or the URL did not reach Layer 3.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get badge variant for signal score
  const getScoreVariant = (
    score: number
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    if (score >= 0.4) return 'outline';
    return 'destructive';
  };

  // Helper function to format score as percentage
  const formatScore = (score: number): string => {
    return `${(score * 100).toFixed(0)}%`;
  };

  // Define signal sections with their display names and colors
  const signalSections = [
    {
      key: 'design_quality',
      title: 'Design Quality',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      key: 'authority_indicators',
      title: 'Authority Indicators',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    },
    {
      key: 'professional_presentation',
      title: 'Professional Presentation',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      key: 'content_originality',
      title: 'Content Originality',
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    },
  ];

  // Check if classification is accepted or rejected
  const isAccepted = factors.classification === 'accepted';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Layer 3: Sophistication Analysis</span>
          {isAccepted ? (
            <div className="flex items-center gap-2 text-sm font-normal text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-3 py-1 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              <span>ACCEPTED</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-normal text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 px-3 py-1 rounded-md">
              <XCircle className="h-4 w-4" />
              <span>REJECTED</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Classification */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Classification</div>
          <Badge variant={isAccepted ? 'default' : 'destructive'}>
            {factors.classification.charAt(0).toUpperCase() + factors.classification.slice(1)}
          </Badge>
        </div>

        {/* Sophistication Signals */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3">
            Sophistication Signals
          </div>
          {!factors.sophistication_signals ? (
            <div className="text-sm text-muted-foreground">No signals detected</div>
          ) : (
            <div className="space-y-3">
              {signalSections.map((section) => {
                const signal = factors.sophistication_signals[
                  section.key as keyof typeof factors.sophistication_signals
                ];
                const isExpanded = expandedSections.has(section.key);

                if (!signal) {
                  return null;
                }

                return (
                  <div
                    key={section.key}
                    className="border rounded-lg overflow-hidden hover:border-muted-foreground/20 transition-colors"
                  >
                    {/* Section Header - Clickable */}
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{section.title}</span>
                        <Badge variant={getScoreVariant(signal.score)}>
                          {formatScore(signal.score)}
                        </Badge>
                      </div>
                    </button>

                    {/* Section Content - Expandable */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {signal.indicators && signal.indicators.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {signal.indicators.map((indicator, index) => (
                              <Badge key={index} variant="outline" className={section.color}>
                                {indicator}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No indicators found</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Analysis Reasoning</div>
          {factors.reasoning ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words bg-muted/30 p-3 rounded-lg">
              {factors.reasoning}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No analysis provided</div>
          )}
        </div>

        {/* LLM Metadata */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3">LLM Metadata</div>
          {!factors.llm_provider && !factors.model_version && !factors.tokens_used ? (
            <div className="text-sm text-muted-foreground">Metadata unavailable</div>
          ) : (
            <div className="bg-muted/20 rounded-lg p-3 space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Provider:</span>{' '}
                  <span className="font-medium">
                    {factors.llm_provider || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>{' '}
                  <span className="font-medium font-mono text-xs">
                    {factors.model_version || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Processing Time:</span>{' '}
                  <span className="font-medium">
                    {factors.processing_time_ms ? `${factors.processing_time_ms}ms` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cost:</span>{' '}
                  <span className="font-medium">
                    {factors.cost_usd !== undefined && factors.cost_usd !== null
                      ? `$${factors.cost_usd.toFixed(4)}`
                      : 'N/A'}
                  </span>
                </div>
              </div>
              {factors.tokens_used && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Token Usage:</span>{' '}
                  <span className="font-medium">
                    {factors.tokens_used.input || 0} input / {factors.tokens_used.output || 0}{' '}
                    output
                  </span>{' '}
                  <span className="text-muted-foreground">
                    ({(factors.tokens_used.input || 0) + (factors.tokens_used.output || 0)} total)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
