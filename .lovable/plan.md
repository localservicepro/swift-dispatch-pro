# Fix slow "apply specials" in order forms

## Problem

When opening the order/product selection step, the app calls a Postgres RPC **once per product** in a sequential `for` loop. With 866 active products that's 866 round-trips, even though there are currently **0 active specials** — so users wait 60+ seconds for nothing.

Bottleneck (in `src/hooks/useSpecialPricing.ts`):

```ts
for (const productId of productIds) {
  const special = await getActiveSpecialForProduct(productId, customerTier); // 1 network call each
}
```

Called from:
- `src/components/order/ProductSelectionStep.tsx` (every time products list loads)
- `src/components/product/ProductList.tsx`

## Solution

Replace the per-product loop with a single batch query that fetches all currently-active specials and matches them client-side against the requested product IDs and their categories.

### 1. New batch DB function (single round-trip)

Create `get_active_specials_for_products(product_ids uuid[], customer_tier text)` that returns one row per matched product with the best discount, using the same logic as the existing single-product function but in one set-based query.

```text
INPUT : product_ids[], customer_tier
OUTPUT: product_id, special_id, special_name, discount_type, discount_value, end_date
       (DISTINCT ON (product_id) ORDER BY discount_value DESC)
```

Keep the existing single-product function for backward compatibility.

### 2. Rewrite `useSpecialPricing.loadSpecialsForProducts`

- Single `supabase.rpc('get_active_specials_for_products', { product_ids, customer_tier })` call.
- Build the `Map<productId, ProductSpecial>` from the returned rows.
- Early-exit if `productIds.length === 0`.

### 3. Minor guard in `ProductSelectionStep.tsx`

- Track the last loaded product-id set (sorted+joined as a key) so the effect doesn't re-run when the array reference changes but the IDs are identical.

## Expected result

- 866 sequential calls → 1 call.
- Applying specials drops from ~60s to <500ms regardless of catalogue size.
- No behavior change when specials exist (same selection logic, same discount math).

## Files to change

- `supabase/migrations/*` — new `get_active_specials_for_products` function (set search_path to 'public', SECURITY INVOKER, STABLE).
- `src/hooks/useSpecialPricing.ts` — replace loop with batch RPC.
- `src/components/order/ProductSelectionStep.tsx` — add stable-key guard on the load effect.

No UI changes, no schema changes to existing tables.