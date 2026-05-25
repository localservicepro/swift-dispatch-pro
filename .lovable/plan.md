# Fix Split Order Allocation UX

The split allocation controls treat zero as invalid because `roundToValidQuantity` bumps any value below the product minimum (0.001 for bulk, 1 for others) up to that minimum. This causes:
- Pressing − on a split with quantity 1 → goes to 0.001 instead of clearing the split.
- Typing `0` in a split input → rejected/bumped to 0.001.
- Trash icon refuses to delete a product when anything is allocated, forcing the user to manually zero out every split first (and they can't easily reach zero — see above).

The cart-level quantity rules (a product in the cart must respect its minimum) are correct and should stay. The fix is to treat split allocations as independent: 0 is a valid split value meaning "not allocated to this split".

## Changes

**`src/components/order/CompactProductTable.tsx`**

1. `handleSplitQuantityChange` (− / + buttons):
   - When decreasing, do not call `roundToValidQuantity` on the result. Compute `rawNewQuantity = max(0, current - 1)` and pass it through directly so it can reach exactly 0. `SplitConfigurationManager.handleUpdateSplitQuantity` already removes the product from the split when quantity ≤ 0.
   - When increasing, keep current rounding behavior but only for bulk products if the result exceeds 0.

2. `handleSplitQuantitySubmit` (typed input):
   - Allow `newQuantity === 0` to pass through unchanged (clears the split).
   - Only apply `roundToValidQuantity` when `newQuantity > 0`.
   - Change input `min` attribute reference accordingly (already `"0"`, fine).

3. `handleDeleteProduct`:
   - Remove the "Cannot delete product" block. Instead, when allocations exist, clear all splits for that product first (call `onUpdateSplitQuantity` with 0 for each split or extend the API), then remove from cart.
   - Simpler approach: add a new optional prop `onRemoveProductCompletely(productId)` that the parent implements to (a) strip the product from every split and (b) remove from cart. `SplitConfigurationManager.handleRemoveFromCart` already does both — just wire the trash button to it directly and drop the guard.

**`src/components/order/ProductAllocationCard.tsx`** (legacy card view, same bug)

Apply the same three changes for consistency: allow 0 on −, allow typed 0, and let delete cascade through to `onRemoveFromCart` which already clears splits in the parent.

## Out of scope

- Cart-level minimum quantity rules (unchanged).
- `roundToValidQuantity` utility (unchanged — still used for cart quantities and for non-zero split values).
- Backend / RPC logic.

## Technical notes

`SplitConfigurationManager.handleUpdateSplitQuantity` (lines ~210-240) already handles `fixedQuantity <= 0` by filtering the product out of `split.products`, and `handleRemoveFromCart` already strips the product from every split before removing it from the cart. So the parent contract is correct; only the child component's over-eager validation needs to relax.
