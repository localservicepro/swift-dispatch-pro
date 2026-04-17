
User wants the header area on /opportunities (greeting bar + "Jobs Management" header + filters) to be more compact so pipeline cards get more vertical space.

Two areas contribute to the header height:
1. The global desktop header in `src/pages/Index.tsx` (greeting + email + sign out) — currently `p-4`.
2. The `OpportunityPipeline` page header — "Jobs Management" title, subtitle, stats, search/filter row, customer type filters, and the "Scroll to navigate..." hint.

## Plan: Compact Opportunities Header

### Changes
1. **`src/components/OpportunityPipeline.tsx`** (main impact)
   - Reduce title size from `text-3xl` to `text-xl`, drop the subtitle line ("Track orders through your sales pipeline • Drag to move…") or merge into a single small caption.
   - Shrink the Total Orders / Pipeline Value stat block (smaller font, inline layout).
   - Tighten vertical spacing: `space-y-6` → `space-y-3`, remove extra padding/margins.
   - Combine the search bar, date filter, and customer-type checkboxes into a single compact row.
   - Remove or shrink the "Scroll to navigate pipeline stages • Drag cards…" hint text (move to a small muted line or tooltip).

2. **`src/pages/Index.tsx`** (minor)
   - Reduce desktop header padding from `p-4` to `py-2 px-4` so the greeting bar is slimmer.

### Result
The header section shrinks from ~280px tall to ~120–140px tall, giving roughly 140px more vertical space for pipeline cards without removing any functionality.

### Files Modified
- `src/components/OpportunityPipeline.tsx`
- `src/pages/Index.tsx`
