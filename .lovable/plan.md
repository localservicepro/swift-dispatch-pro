## Goal

Cash on Delivery (COD) orders currently get blocked in the Opportunity pipeline with a "Payment Required" toast when moving past "Requested", because the gate only allows account customers to bypass it. COD is paid at delivery, so it should pass through the same way and only flip to `paid` when the order reaches Delivered.

## Changes — `src/components/OpportunityPipeline.tsx`

1. **Bypass the payment gate for COD** (around line 286 in `handleDragEnd`):
   - Treat COD the same as account customers — allow the drag without requiring `payment_status === 'paid'`.
   - New condition: block only when `customerType !== 'account'` AND `payment_method !== 'cod'`.

2. **Stop auto-marking COD as paid when moving into Preparing** (`buildStagePatch`, line 240, and `handleAssignmentComplete`, line 322):
   - Today: non-account customers get `payment_status: 'paid'` set on the `preparing` transition.
   - New: if `payment_method === 'cod'`, keep `payment_status: 'pending'` (do not write `paid`). Account customers stay `pending` as today; other non-COD non-account orders keep the current `paid` behavior.

3. **Auto-mark COD as paid on Delivered** (`buildStagePatch`, `delivered` case, and inside `updateOrderStatus` write path):
   - When the destination stage is `delivered` and `payment_method === 'cod'` and `payment_status !== 'paid'`, also set `payment_status: 'paid'` and `payment_date: new Date().toISOString()`. This matches how `PaymentStatusDropdown` handles the paid transition.

## Out of scope

- No DB schema / RLS / trigger / edge function changes — the gate is enforced only in the client pipeline component; there is no server-side rule blocking the transition.
- `OpportunityCardActionButton` (sequential "next stage" button) already calls `updateOrderStatus` directly without the paid gate, so it inherits the COD-on-delivered auto-paid behavior from change #3 once routed through the same patch builder. No other UI changes.
- Order edit form, payment dropdown, and split-order logic are untouched.

## How it behaves after

- COD order in Requested → drags to Preparing/Loading/En route freely, stays `payment_status: pending`.
- COD order dropped on Delivered → status becomes `delivered`, payment flips to `paid` automatically with `payment_date` set.
- Non-COD non-account orders: unchanged (still require paid before leaving Requested).
- Account customers: unchanged.
