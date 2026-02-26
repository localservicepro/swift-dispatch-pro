

## Fix: Invoice Delivery Time Showing 1-Hour Range Instead of 30-Minute

### Problem
The time slots are 30-minute windows (e.g., 7:00 AM - 7:30 AM), but the database stores only the start time (e.g., `07:00`). The receipt functions then reconstruct the range incorrectly:

- **`generate-pdf-receipt/index.ts`** (line 382): Uses `endHour = startHour + 1`, producing a 1-hour range (7:00 AM - 8:00 AM)
- **`generate-receipt/index.ts`** (line 433-438): For single time values, only shows the start time with no range at all

### Fix

#### 1. `supabase/functions/generate-pdf-receipt/index.ts`
Change the time range calculation from +1 hour to +30 minutes:
- Replace `endHour = startHour + 1` with proper 30-minute addition that handles the minute rollover (e.g., 7:30 becomes 8:00)

#### 2. `supabase/functions/generate-receipt/index.ts`
Update the single-time fallback (lines 433-438) to also calculate a 30-minute end time and display as a range, consistent with the PDF receipt.

### Technical Detail

Both functions will use the same logic:
```
startMinutes + 30 → if >= 60, increment hour and subtract 60
```

For example:
- `07:00` → 7:00 AM - 7:30 AM
- `07:30` → 7:30 AM - 8:00 AM
- `15:30` → 3:30 PM - 4:00 PM

### Files Changed
- `supabase/functions/generate-pdf-receipt/index.ts` — fix +1 hour to +30 minutes
- `supabase/functions/generate-receipt/index.ts` — add 30-minute range to single time format

