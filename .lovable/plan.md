

## Fix: "Failed to create order — RLS violation" + lost order data on session expiry

### Root cause

Your screenshot shows the toast "new row violates row-level security policy for table 'orders'" while the page behind it has reverted to the **Sign In** screen. That tells the whole story:

1. The admin's Supabase session silently expired (token refresh failed, browser was idle, laptop slept, etc.).
2. The "Create Order" button fired the INSERT against `orders`. With no valid `auth.uid()`, none of the admin/driver/customer RLS policies matched, so Postgres rejected the row.
3. `AuthProvider` then received `SIGNED_OUT` and rendered `<AuthPage />`, **destroying the order form's React state**. Everything the customer just dictated is gone.

There is a `clearOrderDraft()` helper in `useOrderFormState`, but **nothing ever writes the draft** — the persistence layer was never finished. So today there is zero recovery.

### Fix — three layers so this can never lose work again

**1. Pre-flight session check before insert (prevents the error entirely)**

In `orderCreationService.ts`, before calling `.from('orders').insert(...)`, call `supabase.auth.getSession()`. If there is no session (or the access token is expired), throw a typed `SessionExpiredError` instead of letting Postgres reject the insert. This converts a confusing RLS message into a clean, actionable one.

**2. Auto-save the order draft to sessionStorage on every change**

Wire up the missing half of `useOrderFormState`:

- Add a `useEffect` that serialises the relevant state (`selectedCustomer`, `selectedContact`, `cart`, `adjustments`, `deliveryMethod`, `orderType`, `splits`, dates/times, addresses, suburb, notes, PO, payment method, current step) to `sessionStorage` under `order_form_draft` whenever any of them change (debounced ~500ms to avoid thrash).
- On mount, hydrate state from `sessionStorage` if a draft exists.
- Keep the existing `clearOrderDraft()` call on successful submit.

This means even a hard refresh, browser crash, or auth redirect leaves the cart/customer/notes intact. The user is dropped back at the same step with the same data.

**3. Graceful session-expiry handling in MultiStepOrderForm**

In the `catch` block of the create-order handler:

- Detect the `SessionExpiredError` (or any error containing "row-level security" / "JWT expired" / status 401/403) and show a distinct toast: **"Your session expired. Your order is saved — please sign in and click Create Order again."**
- Do **not** reset the form state in this branch (the existing reset only runs on success, which is already correct — but we explicitly skip the redirect-clearing path).
- Because the draft is now persisted in sessionStorage, when `AuthProvider` swaps in `<AuthPage />` and the user signs back in, returning to Order Management will rehydrate the entire form at the Review step, ready to submit.

### Files

- Edit `src/components/order/services/orderCreationService.ts` — add session pre-flight check, export `SessionExpiredError`.
- Edit `src/components/order/hooks/useOrderFormState.ts` — add debounced auto-save effect and on-mount hydration from `sessionStorage`.
- Edit `src/components/order/MultiStepOrderForm.tsx` — branch on session-expiry errors with the new toast copy; keep state intact so the draft survives.

### Result

- The RLS error message that you see in the screenshot will no longer appear for expired sessions — you'll get a clear "session expired, please sign in" message instead.
- The customer's order (cart, customer, contact, address, notes, PO, payment method, step) survives sign-out, refresh, and even closing the tab within the same browser session.
- After signing back in, you click Create Order once more and it submits — no re-keying, no lost customer call.

