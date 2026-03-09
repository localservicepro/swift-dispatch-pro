

## Plan: Update Delivery Time Slots to Include Both 30-min and 1-hour Windows

### What Changes

**File: `src/utils/timeSlotUtils.ts`**

Update the `generateTimeSlots` function to produce two groups of time slots:

1. **30-Minute Windows** (7:00–9:30am range, plus "up to 4:00pm"):
   - 7:00–7:30am, 7:30–8:00am, 8:00–8:30am, 8:30–9:00am, 9:00–9:30am
   - A final option: "Up to 4:00pm"

2. **1-Hour Windows** (7:00–10:30am range, plus "up to 3:00–4:00pm"):
   - 7:00–8:00am, 7:30–8:30am, 8:00–9:00am, 8:30–9:30am, 9:00–10:00am, 9:30–10:30am
   - A final option: "Up to 3:00pm–4:00pm"

- Keep the existing special priority options (Urgent, ASAP, Any time) unchanged at the top
- Add a `group` property to each time slot so the selector can display them in separate sections

**File: `src/components/order/TimeSlotSelector.tsx`**

Update to render three groups instead of two:
- **Priority** — Urgent, ASAP, Any time (unchanged)
- **30-Minute Windows** — the short slots
- **1-Hour Windows** — the longer slots

Each group separated by a `CommandSeparator`.

### Backward Compatibility

Existing orders that stored time values like `"07:00"` or `"08:30"` will still match and display correctly since the values remain the same format. The new "up to" slots will use distinct string values (e.g., `"upto-4pm"`, `"upto-3pm-4pm"`).

