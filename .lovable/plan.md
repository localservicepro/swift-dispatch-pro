

## Redesign Time and Driver Selectors for Better Usability

Based on your preferences: enhanced dropdown for time, searchable combobox for driver, balanced spacing.

### Problem
The current Radix Select component has persistent scrolling issues. Despite multiple fixes, it remains difficult to navigate long lists of time slots and drivers. The core issue is that Radix Select's "popper" position mode fights against proper scrolling behavior.

### Solution

#### 1. Time Selector — Enhanced Dropdown with Search and Sticky Sections

Replace the Radix `Select` with a `Popover` + `Command` (cmdk) combo in `DeliveryScheduler`, `PickupScheduler`, and `CommonDateTimeSelector`. This gives us:

- A search/filter input at the top to quickly find time slots
- Sticky section headers ("Priority" and "Time Slots")
- Visible scrollbar via the existing `CommandList` max-height scroll
- Proper keyboard navigation

```text
┌─────────────────────────────┐
│ 9:30 AM - 10:00 AM       ▼ │  ← Trigger button
├─────────────────────────────┤
│ 🔍 Search time...          │
│─────────────────────────────│
│ Priority                    │
│   ⚡ Urgent                 │
│   ⏰ ASAP                   │
│   📅 Any time               │
│─────────────────────────────│
│ Time Slots                  │
│   7:00 AM - 7:30 AM        │
│   7:30 AM - 8:00 AM        │
│   ...scrollable...          │
│ ✓ 9:30 AM - 10:00 AM       │
│   10:00 AM - 10:30 AM      │
└─────────────────────────────┘
```

**Files changed:**
- New: `src/components/order/TimeSlotSelector.tsx` — reusable time picker component
- Modified: `src/components/order/DeliveryScheduler.tsx` — use `TimeSlotSelector`
- Modified: `src/components/order/PickupScheduler.tsx` — use `TimeSlotSelector`
- Modified: `src/components/order/CommonDateTimeSelector.tsx` — use `TimeSlotSelector`

#### 2. Driver Selector — Searchable Combobox

Replace the Radix `Select` with `Popover` + `Command` combobox pattern (same pattern used by `SuburbSelector`). This provides:

- Type-to-search filtering by name or email
- Grouped sections: "Drivers" and "Admins"
- Role badges next to each name
- Check mark for selected driver

```text
┌─────────────────────────────┐
│ John Smith (Driver)       ⇅ │  ← Trigger button
├─────────────────────────────┤
│ 🔍 Search by name...       │
│─────────────────────────────│
│ Drivers                     │
│ ✓ John Smith                │
│   Jane Doe                  │
│─────────────────────────────│
│ Admins                      │
│   Admin User                │
│─────────────────────────────│
│   No driver assigned        │
└─────────────────────────────┘
```

**Files changed:**
- Modified: `src/components/order/DriverSelector.tsx` — rewrite to use `Popover` + `Command`

### Technical Details

- Both components use the existing `Popover` + `Command` pattern already in the codebase (see `SuburbSelector.tsx`)
- `CommandList` already has `max-h-[300px] overflow-y-auto` which provides reliable scrolling
- No changes to `select.tsx` needed — we bypass the problematic Radix Select entirely for these specific use cases
- The `TimeSlotSelector` component accepts `value`, `onValueChange`, and `placeholder` props for drop-in replacement
- All three time slot consumers (`DeliveryScheduler`, `PickupScheduler`, `CommonDateTimeSelector`) will use the same shared component

### Files Summary
- **New:** `src/components/order/TimeSlotSelector.tsx`
- **Modified:** `src/components/order/DeliveryScheduler.tsx`
- **Modified:** `src/components/order/PickupScheduler.tsx`
- **Modified:** `src/components/order/CommonDateTimeSelector.tsx`
- **Modified:** `src/components/order/DriverSelector.tsx`

