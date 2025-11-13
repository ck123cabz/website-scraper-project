# LayerBreakdown Component

## Overview

The `LayerBreakdown` component displays a visual breakdown of Layer 1, 2, and 3 analysis completion for job progress tracking. It shows an elimination funnel pattern with color-coded progress bars.

## Location

`/apps/web/components/dashboard/LayerBreakdown.tsx`

## Props Interface

```typescript
interface LayerBreakdownProps {
  layer1: number;          // URLs that passed Layer 1
  layer2: number;          // URLs that passed Layer 2
  layer3: number;          // URLs that passed Layer 3
  totalCompleted: number;  // Total URLs analyzed (for percentage calc)
}
```

## Features

### Visual Display
- **3 Horizontal Progress Bars**: One for each layer (1, 2, 3)
- **Color Coding**:
  - Layer 1: Blue (`text-blue-600`, `bg-blue-500`)
  - Layer 2: Purple (`text-purple-600`, `bg-purple-500`)
  - Layer 3: Green (`text-green-600`, `bg-green-500`)
- **Dark Mode Support**: Automatic color adjustment for dark theme

### Data Presentation
Each layer shows:
- Label: "Layer X"
- Count: Number of URLs completed
- Percentage: Calculated as `(layer_count / totalCompleted) * 100`

Example: `Layer 1: 60 completed (12%)`

### Percentage Calculation
```typescript
percentage = Math.min(Math.round((layer_count / totalCompleted) * 100), 100)
```

### Edge Case Handling

1. **Zero Total**: If `totalCompleted === 0`, all percentages return `0%`
2. **Null/Undefined Values**: Treated as `0`
3. **Values Exceed Total**: Capped at `100%`
4. **Rounding**: Uses `Math.round()` for integer percentages

## Usage Examples

### Example 1: Normal Progress (30% completion)
```tsx
<LayerBreakdown
  layer1={60}
  layer2={55}
  layer3={35}
  totalCompleted={500}
/>
```

Output:
```
Layer 1: 60 completed (12%)
[============                        ] 12%

Layer 2: 55 completed (11%)
[===========                         ] 11%

Layer 3: 35 completed (7%)
[=======                             ] 7%
```

### Example 2: Completed Job (100%)
```tsx
<LayerBreakdown
  layer1={500}
  layer2={500}
  layer3={500}
  totalCompleted={500}
/>
```

Output:
```
Layer 1: 500 completed (100%)
[====================================] 100%

Layer 2: 500 completed (100%)
[====================================] 100%

Layer 3: 500 completed (100%)
[====================================] 100%
```

### Example 3: Just Started (0%)
```tsx
<LayerBreakdown
  layer1={0}
  layer2={0}
  layer3={0}
  totalCompleted={0}
/>
```

Output:
```
Layer 1: 0 completed (0%)
[                                    ] 0%

Layer 2: 0 completed (0%)
[                                    ] 0%

Layer 3: 0 completed (0%)
[                                    ] 0%
```

### Example 4: Elimination Funnel
```tsx
<LayerBreakdown
  layer1={500}
  layer2={450}
  layer3={400}
  totalCompleted={500}
/>
```

Output:
```
Layer 1: 500 completed (100%)
[====================================] 100%

Layer 2: 450 completed (90%)
[==================================  ] 90%

Layer 3: 400 completed (80%)
[================================    ] 80%
```

## Integration

Used within `JobProgressCard` expanded section:

```tsx
import { LayerBreakdown } from './LayerBreakdown';

function JobProgressCard({ job }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      {/* Main card content */}

      {expanded && (
        <CardContent>
          <LayerBreakdown
            layer1={job.layerBreakdown.layer1}
            layer2={job.layerBreakdown.layer2}
            layer3={job.layerBreakdown.layer3}
            totalCompleted={job.totalCount}
          />
        </CardContent>
      )}
    </Card>
  );
}
```

## Styling

- Uses shadcn/ui `Progress` component
- Responsive layout with `space-y-4` for vertical spacing
- Tailwind CSS classes for colors and dark mode
- Height: `h-2` for progress bars
- Arbitrary variant syntax for color customization: `[&>div]:bg-{color}-500`

## Accessibility

- `aria-label` on each progress bar
- Semantic HTML structure
- Screen reader friendly text
- Keyboard navigation support (inherited from shadcn/ui)

## Testing

See test file: `__tests__/JobProgressCard.spec.tsx`

Key test cases:
- Normal progress display
- 0% and 100% edge cases
- Null/undefined handling
- Value > total (capping)
- Percentage calculation accuracy
- Responsive updates

Visual tests: `__tests__/LayerBreakdown.visual.tsx`

## Dependencies

- `@/components/ui/progress` (shadcn/ui Progress component)
- `@/lib/utils` (cn utility for class merging)
- `react` (React 18+)

## Technical Notes

1. **No State**: Pure component with no internal state
2. **Memoization**: Can be wrapped with `React.memo()` if needed
3. **Performance**: O(1) operations, suitable for real-time updates
4. **Type Safety**: Full TypeScript support with exported interface

## Future Enhancements

Possible improvements:
- Add animation on value changes
- Show delta/trend indicators (↑ ↓)
- Tooltip on hover with detailed stats
- Export breakdown as image/PDF
- Add Layer 0 (pre-filter) if needed
