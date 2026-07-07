## Delivery Fee & Split Order Pricing Fix

### Problems
1. **Wrong suburb match on delivery address** — Fee is being derived from street-name tokens instead of the suburb, producing incorrect pricing.
2. **Manual suburb not selectable in storefront flow** — Staff/customers can't override the auto-match reliably.
3. **Split orders lose manually adjusted delivery fees** — Adjusted fee reverts when the invoice/receipt is printed or the order is reloaded.
4. **$5 delivery markup not consistently applied to splits** — The global markup skips some split legs.

### Fix Plan

**1. Fix suburb detection from address (shared logic)**
- File: `src/hooks/useSuburbManagement.ts` (`findSuburbInAddress`, `handleAutoSuburbSelection`).
- Split the address on commas, iterate from the LAST segment backward (Australian address order: `street, suburb STATE postcode`).
- Match exact suburb name (case-insensitive) against `delivery_suburbs` first; fall back to postcode; never match arbitrary substrings inside the street segment.
- Guard against false positives like a suburb name appearing in a street name.

**2. Manual suburb selector in storefront delivery flow**
- File: `src/components/storefront/StorefrontOrderFlow.tsx`.
- Render the existing `SuburbSelector` directly below the delivery address input (matching the staff order form pattern).
- Selecting a suburb updates suburb id, name, and delivery fee immediately and overrides auto-match.

**3. Persist manual delivery-fee overrides on split orders**
- Files: split order creation/update path (`useSplitOrder*` / order edit hooks) and the receipt/invoice renderer.
- Store the manually edited `delivery_fee` on each split's order row and stop recomputing it from the suburb on read/print.
- Add an `is_delivery_fee_manual` (or reuse existing override flag if present) so the print path uses the stored value verbatim.

**4. Apply the $5 markup consistently to splits**
- File: delivery-fee calculation utility used by split creation (per memory: "Sequential calculation per split based on suburb").
- Ensure the global markup from settings is added ONCE per split leg's base suburb fee at calculation time, and is included in what gets saved (so manual overrides in step 3 continue to win).
- Verify totals recompute (subtotal + delivery + GST) after markup is applied on each split.

**5. Verification**
- Create a delivery order where the street name coincidentally contains another suburb's name → correct suburb/fee picked.
- Manually change suburb in storefront → fee updates.
- Split an order, manually edit split B's delivery fee, save, reload, print receipt → edited fee persists.
- Split an order across two suburbs → each split shows base suburb fee + $5 markup.

### Out of scope
- No DB schema changes unless step 3 needs a new override flag; if so, a small migration adds `is_delivery_fee_manual boolean default false` to `orders` (with GRANTs unchanged).
- No changes to storefront checkout business logic beyond suburb selection + fee wiring.
