

## Fix: "ASAP" and "Any time" Not Showing on Printed Invoices

### Root Cause

In `supabase/functions/generate-receipt/index.ts` line 417, the special time slot check compares against `'any time'` (with a space), but the actual stored database value from `timeSlotUtils.ts` is `'anytime'` (no space). So the match fails and an empty string is returned, hiding the time on the invoice.

Additionally, when `'asap'` or `'urgent'` do match, the function returns the raw lowercase value (e.g., `'asap'`) instead of a properly formatted label (e.g., `'ASAP'`).

### Fix

Update `supabase/functions/generate-receipt/index.ts` line 417-418 to:
1. Match `'anytime'` (no space) in addition to the current values
2. Return properly formatted display labels instead of raw values

```text
Current (line 417-418):
  if (time.toLowerCase() === 'urgent' || time.toLowerCase() === 'asap' || time.toLowerCase() === 'any time') {
    return time
  }

Fixed:
  const timeLower = time.toLowerCase()
  if (timeLower === 'urgent') return 'Urgent'
  if (timeLower === 'asap') return 'ASAP'
  if (timeLower === 'anytime' || timeLower === 'any time') return 'Any time'
```

### Files changed
- `supabase/functions/generate-receipt/index.ts` -- fix special time slot matching and formatting

