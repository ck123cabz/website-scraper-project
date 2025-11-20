'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { Layer1Factors, Layer2Factors, Layer3Factors } from '@website-scraper/shared';

interface LayerFactorsDisplayProps {
  layer1?: Layer1Factors | null;
  layer2?: Layer2Factors | null;
  layer3?: Layer3Factors | null;
}

export function LayerFactorsDisplay({ layer1, layer2, layer3 }: LayerFactorsDisplayProps) {
  const [layer1Open, setLayer1Open] = useState(false);
  const [layer2Open, setLayer2Open] = useState(false);
  const [layer3Open, setLayer3Open] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layer Analysis Factors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layer 1: Domain Analysis */}
        <Collapsible open={layer1Open} onOpenChange={setLayer1Open}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              {layer1Open ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">Layer 1: Domain Analysis</span>
              {layer1 && (
                <Badge variant={layer1.passed ? 'default' : 'destructive'}>
                  {layer1.passed ? 'Passed' : 'Rejected'}
                </Badge>
              )}
            </div>
            {!layer1 && (
              <span className="text-xs text-muted-foreground">No data available</span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 px-4 pb-3">
            {layer1 ? (
              <>
                <div className="grid gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">TLD Type</div>
                      <div className="text-sm font-medium">{layer1.tld_type.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">TLD Value</div>
                      <div className="text-sm font-medium font-mono">{layer1.tld_value}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Domain Classification</div>
                    <Badge variant="outline" className="capitalize">
                      {layer1.domain_classification}
                    </Badge>
                  </div>

                  {layer1.pattern_matches && layer1.pattern_matches.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Pattern Matches</div>
                      <div className="flex flex-wrap gap-1">
                        {layer1.pattern_matches.map((pattern, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {layer1.target_profile && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Target Profile</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{layer1.target_profile.type}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(layer1.target_profile.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  )}

                  {layer1.reasoning && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Analysis Reasoning</div>
                      <div className="text-sm bg-background p-3 rounded border">
                        {layer1.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground rounded-lg border bg-muted/20">
                <AlertCircle className="h-4 w-4" />
                <span>Layer 1 factor data not available (processed before schema migration)</span>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Layer 2: Publication Detection */}
        <Collapsible open={layer2Open} onOpenChange={setLayer2Open}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              {layer2Open ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">Layer 2: Publication Detection</span>
              {layer2 && (
                <Badge variant={layer2.passed ? 'default' : 'destructive'}>
                  {layer2.passed ? 'Passed' : 'Rejected'}
                </Badge>
              )}
            </div>
            {!layer2 && (
              <span className="text-xs text-muted-foreground">No data available</span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 px-4 pb-3">
            {layer2 ? (
              <>
                <div className="grid gap-3 rounded-lg border p-3 bg-muted/30">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Publication Score</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {(layer2.publication_score * 100).toFixed(0)}%
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${layer2.publication_score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {layer2.module_scores && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Module Scores</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(layer2.module_scores).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-2 rounded bg-background border">
                            <span className="text-xs capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {(value * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {layer2.content_signals && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Content Signals</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(layer2.content_signals).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center gap-1 px-2 py-1 rounded border bg-background text-xs"
                          >
                            {value ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="capitalize">{key.replace(/has_/g, '').replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {layer2.keywords_found && layer2.keywords_found.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Keywords Found</div>
                      <div className="flex flex-wrap gap-1">
                        {layer2.keywords_found.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {layer2.ad_networks_detected && layer2.ad_networks_detected.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Ad Networks Detected</div>
                      <div className="flex flex-wrap gap-1">
                        {layer2.ad_networks_detected.map((network, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {network}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {layer2.reasoning && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Analysis Reasoning</div>
                      <div className="text-sm bg-background p-3 rounded border">
                        {layer2.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground rounded-lg border bg-muted/20">
                <AlertCircle className="h-4 w-4" />
                <span>Layer 2 factor data not available (processed before schema migration)</span>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Layer 3: Sophistication Analysis */}
        <Collapsible open={layer3Open} onOpenChange={setLayer3Open}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              {layer3Open ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">Layer 3: Sophistication Analysis</span>
              {layer3 && (
                <Badge variant={layer3.classification === 'accepted' ? 'default' : 'destructive'}>
                  {layer3.classification}
                </Badge>
              )}
            </div>
            {!layer3 && (
              <span className="text-xs text-muted-foreground">No data available</span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 px-4 pb-3">
            {layer3 ? (
              <>
                <div className="grid gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">LLM Provider</div>
                      <div className="text-sm font-medium capitalize">{layer3.llm_provider}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Model Version</div>
                      <div className="text-sm font-medium font-mono text-xs">
                        {layer3.model_version}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Processing Time</div>
                      <div className="text-sm font-medium">{layer3.processing_time_ms}ms</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Cost</div>
                      <div className="text-sm font-medium">${layer3.cost_usd.toFixed(4)}</div>
                    </div>
                    {layer3.tokens_used && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Tokens Used</div>
                        <div className="text-sm font-medium">
                          {layer3.tokens_used.input + layer3.tokens_used.output}
                        </div>
                      </div>
                    )}
                  </div>

                  {layer3.sophistication_signals && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Sophistication Signals</div>
                      <div className="grid gap-2">
                        {Object.entries(layer3.sophistication_signals).map(([key, signal]) => (
                          <div
                            key={key}
                            className="p-3 rounded-lg border bg-background space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <Badge variant="outline">
                                {(signal.score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            {signal.indicators && signal.indicators.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {signal.indicators.map((indicator, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {indicator}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {layer3.reasoning && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">LLM Explanation</div>
                      <div className="text-sm bg-background p-3 rounded border max-h-48 overflow-y-auto">
                        {layer3.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground rounded-lg border bg-muted/20">
                <AlertCircle className="h-4 w-4" />
                <span>Layer 3 factor data not available (processed before schema migration)</span>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
