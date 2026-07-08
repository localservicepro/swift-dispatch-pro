## Goal
In the Opportunities pipeline, hide the master order card when it has splits. Show only the split children as individual draggable cards. Order Management is unchanged (master + toggle strip remains).

## Changes

**`src/components/opportunity/SplitOpportunityGroupCard.tsx`**
- Remove the `OpportunityCard` render for the master.
- Remove the collapsible toggle strip and expand/collapse state (sessionStorage logic, chevrons, "Combined" label).
- Render each split directly as `DraggableOpportunityCard` (or `OpportunityCard` when `draggable` is false), just like standalone orders in the column.

**`src/components/opportunity/DroppablePipelineColumn.tsx` and `PipelineColumn.tsx`**
- No structural change needed; the group card component itself will now output only split cards, so column counts/behavior stay consistent.
- Optional: keep using `groupOrdersBySplit` so we still filter/hide the master consistently.

## Result
- Opportunities pipeline: masters with splits are not displayed at all; only the split orders appear as normal cards that can be dragged between stages.
- Order Management list: unchanged — master card on top, toggle strip, splits underneath.
