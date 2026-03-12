

## Plan: Fix 1-Hour Time Slot Parsing in Receipts

### Problem
When a 1-hour window like "8:00 AM - 9:00 AM" is selected, the stored value is `1h-08:00`. Receipt generation functions split on `:` without stripping the `1h-` prefix, causing `parseInt("1h-08")` to return `1` — resulting in "1:00 AM - 1:30 AM" on receipts.

### Root Cause
Three locations parse time values without handling the `1h-` prefix:
1. `supabase/functions/generate-receipt/index.ts` — `formatTimeRange()` (line ~434)
2. `supabase/functions/generate-pdf-receipt/index.ts` — `formatTimeRange()` (line ~380)
3. `src/utils/dateTimeUtils.ts` — `formatDeliveryTime()` (line ~24)

### Fix
In all three `formatTimeRange`/`formatDeliveryTime` functions, detect the `1h-` prefix, strip it, and use a 60-minute window instead of 30-minute:

```typescript
// Before splitting on ":", detect 1-hour prefix
let isOneHourSlot = false;
if (time.startsWith('1h-')) {
  time = time.substring(3); // strip "1h-"
  isOneHourSlot = true;
}
// ... existing parsing ...
const endTotalMin = min + (isOneHourSlot ? 60 : 30);
```

### Files Modified
1. `supabase/functions/generate-receipt/index.ts` — handle `1h-` prefix in `formatTimeRange`
2. `supabase/functions/generate-pdf-receipt/index.ts` — handle `1h-` prefix in `formatTimeRange`
3. `src/utils/dateTimeUtils.ts` — handle `1h-` prefix in `formatDeliveryTime`

