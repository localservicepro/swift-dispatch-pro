

## Add Quantity Adjustment in Cart Drawer

### What changes
The cart drawer currently only shows item details and a remove (X) button. We'll add +/- quantity controls so users can adjust quantities directly in the cart without going back to the product grid.

### How

**File: `src/components/storefront/StorefrontProductBrowser.tsx`**

Replace the static quantity display in the cart drawer (lines 266-281) with an inline quantity stepper:
- Add `-` and `+` buttons flanking the quantity number
- `-` button removes the item when quantity reaches 0
- Reuse the existing `updateCart`-style logic via `onCartChange`
- Keep the X button for quick full removal

The cart item row changes from:
```
[Name + price×qty]  [$total]  [X]
```
To:
```
[Name + $price]  [- qty +]  [$total]  [X]
```

### Files modified
- `src/components/storefront/StorefrontProductBrowser.tsx` — add quantity stepper controls in cart drawer items

