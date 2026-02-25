

## Replace Select Dropdowns with Scrollable Lists

The user finds the current Select/dropdown UI for **Delivery Time** and **Driver Assignment** not user-friendly (as shown in the uploaded screenshots). The fix is to replace these dropdowns with always-visible, scrollable lists using the existing `ScrollArea` component.

### Changes

#### 1. `src/components/order/DeliveryScheduler.tsx`
Replace the `Select` for delivery time with a `ScrollArea` containing a list of clickable time slot items. The selected item will be highlighted. Height capped at ~200px with scroll.

#### 2. `src/components/order/PickupScheduler.tsx`
Same change — replace the `Select` for pickup time with a scrollable list.

#### 3. `src/components/order/DriverSelector.tsx`
Replace the `Select` dropdown with a `ScrollArea` list showing drivers with role badges, highlighted selection, and the same refresh button.

#### 4. `src/components/order/CommonDateTimeSelector.tsx`
Replace the time `Select` with a compact scrollable list (smaller height to fit the compact layout).

### Design
- Each list item is a clickable row with hover and selected states
- Selected item gets a highlighted background (blue for time, indigo for driver)
- ScrollArea with a fixed max-height (~200px for time, ~250px for drivers)
- Border around the scroll container matching existing card styles
- Special time options (Urgent, ASAP, Any time) shown with a subtle separator

### Files Changed
- `src/components/order/DeliveryScheduler.tsx`
- `src/components/order/PickupScheduler.tsx`
- `src/components/order/DriverSelector.tsx`
- `src/components/order/CommonDateTimeSelector.tsx`

