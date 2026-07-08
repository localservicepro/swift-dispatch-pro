## Plan

Fix the `Combined` total so split groups show the actual split totals, not stale/raw stored totals.

## What I’ll change

1. Update the shared split grouping calculation used by both:
   - Order Management
   - Opportunities tab

2. Calculate `combinedTotal` from the same display-total logic used by the order cards:
   - Sum the displayed totals of split orders only.
   - Fall back to the master order display total only when no split totals exist.

3. Add a defensive recalculation at the split group display level if needed, so the toggle strip cannot show `$382` when the visible splits are `$82 + $109`.

## Expected result

For the shown order:

```text
Master: $191.00
Split A: $109.00
Split B: $82.00
Combined: $191.00
```

The same corrected total will apply in both Order Management and Opportunities.