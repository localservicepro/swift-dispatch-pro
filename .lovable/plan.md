

## Change: Add Half-Hour Time Slots for Delivery

### What changes
The current time slots are 1-hour windows (e.g., 7:00 AM - 8:00 AM). The user wants 30-minute windows instead, running from 7:00-7:30 AM through 3:30-4:00 PM.

### File changed
**`src/utils/timeSlotUtils.ts`**

Change the end time calculation from +1 hour to +30 minutes:

```text
Current: 7:00-8:00, 7:30-8:30, 8:00-9:00 ... (1-hour windows)
New:     7:00-7:30, 7:30-8:00, 8:00-8:30 ... 3:30-4:00 (30-min windows)
```

- Change end time from `hour + 1` to `startMinutes + 30`
- Change the loop to stop at 15:30 (last slot: 3:30-4:00 PM) instead of 16:00
- Keep special options (Urgent, ASAP, Any time) unchanged

Also need to update `supabase/functions/generate-receipt/index.ts` `formatTimeRange` to handle 30-min slot values correctly on invoices (it already parses HH:MM format, so no change needed there).

