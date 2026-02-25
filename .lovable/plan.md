

## Revert to Select Dropdowns

The scrollable list takes up too much space and doesn't look clean. Reverting all four components to use the standard `Select` dropdown from Radix, which is compact (single line) and opens a scrollable popover on click.

### Changes

#### 1. `src/components/order/DeliveryScheduler.tsx`
Replace the `ScrollArea` list with a `Select` dropdown. Special slots (Urgent, ASAP, Any time) will appear first with a separator, followed by regular time slots.

#### 2. `src/components/order/PickupScheduler.tsx`
Same change as DeliveryScheduler -- replace `ScrollArea` with `Select`.

#### 3. `src/components/order/DriverSelector.tsx`
Replace the `ScrollArea` list with a `Select` dropdown. "No driver assigned" as first option, separator, then drivers with role in parentheses.

#### 4. `src/components/order/CommonDateTimeSelector.tsx`
Replace the `ScrollArea` list with a compact `Select` dropdown for time selection.

### Design
- Single-line `Select` trigger showing the selected value (or placeholder like "Select time...")
- Clicking opens a scrollable dropdown popover with all options
- Special time slots grouped at top with `SelectSeparator` before regular slots
- Driver dropdown shows role badges as text suffix e.g. "John Smith (Driver)"

### Files Changed
- `src/components/order/DeliveryScheduler.tsx`
- `src/components/order/PickupScheduler.tsx`
- `src/components/order/DriverSelector.tsx`
- `src/components/order/CommonDateTimeSelector.tsx`

