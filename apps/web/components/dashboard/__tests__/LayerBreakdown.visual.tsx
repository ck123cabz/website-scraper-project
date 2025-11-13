/**
 * Visual Test for LayerBreakdown Component
 *
 * This file demonstrates various states of the LayerBreakdown component
 * for visual verification during development.
 */

import { LayerBreakdown } from '../LayerBreakdown';

export function LayerBreakdownVisualTests() {
  return (
    <div className="p-8 space-y-12 bg-background">
      <section>
        <h2 className="text-2xl font-bold mb-4">Test 1: Normal Progress (30%)</h2>
        <p className="text-muted-foreground mb-4">
          Layer 1: 60/500 (12%), Layer 2: 55/500 (11%), Layer 3: 35/500 (7%)
        </p>
        <LayerBreakdown
          layer1={60}
          layer2={55}
          layer3={35}
          totalCompleted={500}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Test 2: Complete (100%)</h2>
        <p className="text-muted-foreground mb-4">
          All layers completed: 500/500 each
        </p>
        <LayerBreakdown
          layer1={500}
          layer2={500}
          layer3={500}
          totalCompleted={500}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Test 3: Just Started (0%)</h2>
        <p className="text-muted-foreground mb-4">
          No URLs analyzed yet
        </p>
        <LayerBreakdown
          layer1={0}
          layer2={0}
          layer3={0}
          totalCompleted={0}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Test 4: Early Progress (5%)</h2>
        <p className="text-muted-foreground mb-4">
          Layer 1: 25/1000 (3%), Layer 2: 15/1000 (2%), Layer 3: 10/1000 (1%)
        </p>
        <LayerBreakdown
          layer1={25}
          layer2={15}
          layer3={10}
          totalCompleted={1000}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Test 5: Elimination Funnel</h2>
        <p className="text-muted-foreground mb-4">
          Shows typical elimination pattern: 500 → 450 → 400 analyzed
        </p>
        <LayerBreakdown
          layer1={500}
          layer2={450}
          layer3={400}
          totalCompleted={500}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Test 6: Edge Case - Values Exceed Total</h2>
        <p className="text-muted-foreground mb-4">
          Should cap at 100%: Layer1=600, Layer2=550, Layer3=500 (total=500)
        </p>
        <LayerBreakdown
          layer1={600}
          layer2={550}
          layer3={500}
          totalCompleted={500}
        />
      </section>
    </div>
  );
}
