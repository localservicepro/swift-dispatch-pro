

## Move Items to Backorder — Manual Selection

### What This Does
Adds a "Move to Backorder" action on any existing order. An admin selects specific items (and quantities) to move out of the current order into a new linked backorder. This covers scenarios like out-of-stock items, excess quantity the client doesn't need, or partial deliveries.

### How It Works
1. Admin opens an order and clicks "Move to Backorder"
2. A dialog shows all items in the order with checkboxes and quantity inputs
3. Admin selects which items/quantities to move
4. On confirm:
   - Selected items are removed (or quantity reduced) from the original order
   - A new linked order is created with status `back_order`, `is_split_order: true`, `master_order_id` pointing to the original
   - Both orders' totals are recalculated
5. On the monthly statement, orders with `back_order` status show a **BACKORDER** badge next to the order number

### Implementation

#### 1. New Component: `MoveToBackorderDialog.tsx`
- Shows a list of the order's products with checkboxes and editable quantity fields
- Validates that at least one item is selected and quantities don't exceed original
- On submit: calls a service function to split selected items into a new backorder

#### 2. New Service: `backorderService.ts`
- `moveItemsToBackorder(orderId, selectedItems)`:
  - Fetches the original order
  - Creates a new order with selected items, status `back_order`, linked via `master_order_id`
  - Updates the original order's products JSON and recalculates subtotal/total
  - If ALL items are moved, sets original order to `cancelled`

#### 3. Update `OrderEditSections.tsx`
- Add a "Move to Backorder" button in the order edit view (next to the Returns section)
- Opens the `MoveToBackorderDialog`

#### 4. Update `OpportunityCard.tsx` / `OrderCard.tsx`
- Add a quick-action button for "Move to Backorder" on order cards in the pipeline

#### 5. Update `generate-account-statement/index.ts`
- Change query from `.eq("status", "delivered")` to `.in("status", ["delivered", "back_order"])` so backorder orders appear on statements
- Add a BACKORDER badge next to order numbers with `back_order` status:
  ```html
  <span class="status-badge status-back_order">BACKORDER</span>
  ```

#### 6. Add `back_order` status styling in statement CSS
- Add a CSS class for the backorder badge (e.g., orange/yellow background)

### Files Changed
- **New**: `src/components/order/MoveToBackorderDialog.tsx` — item selection dialog
- **New**: `src/components/order/services/backorderService.ts` — split logic
- **Edit**: `src/components/order/OrderEditSections.tsx` — add Move to Backorder button
- **Edit**: `supabase/functions/generate-account-statement/index.ts` — include backorder orders + badge

### Technical Detail
- The `orders` table already has `is_split_order`, `master_order_id`, `split_number`, and `back_order` as a valid `order_status` enum value — no database migration needed
- The backorder service will update the original order's `products` JSONB column in-place (removing/reducing moved items) and recalculate `subtotal` and `total_amount`

