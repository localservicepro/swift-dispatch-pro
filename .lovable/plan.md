

## Plan: Extend Time Slots to Cover Full Day Until 4 PM

### What Changes

**File: `src/utils/timeSlotUtils.ts`**

Extend both time slot arrays to cover the full day:

- **30-Minute Windows**: Generate slots from 7:00 AM through 3:30 PM (last slot: 3:30–4:00 PM). Remove the "Up to 4:00 PM" catch-all.
  - Full list: 7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30

- **1-Hour Windows**: Generate slots from 7:00 AM through 3:00 PM (last slot: 3:00–4:00 PM). Remove the "Up to 3:00 PM - 4:00 PM" catch-all.
  - Full list: 7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00

- Priority options (Urgent, ASAP, Any time) remain unchanged.

### Backward Compatibility

Existing orders using old values like `"upto-4pm"` or `"upto-3pm-4pm"` will no longer match a slot in the dropdown but will still be stored correctly in the database. The `timeFormatUtils.ts` special values list can remain as-is for safe passthrough.

