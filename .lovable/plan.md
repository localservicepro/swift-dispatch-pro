
# Delivery address bugs — investigation + fix plan

Investigation confirmed with reads of `EnhancedAddressInput`, `SplitConfigurationManager`, `CommonDateTimeSelector`, and `orderCreationService.createSplitOrder`. All three bugs live in code paths still on disk today.

---

## 1. Files & handlers responsible

**Bug 1 — place selection loses formatted address**
- `src/components/ui/enhanced-address-input.tsx` — `handleInputChange`, `handlePredictionSelect`, `handleBlur`, `debouncedValue` effect. The prop `onChange` fires on every keystroke AND is fired again inside `handlePredictionSelect(prediction.description)` before the async `google-places-details` call resolves to write `formatted_address` via `onAddressSelect`. No "selection locked" flag exists to suppress subsequent raw writes.
- `src/components/order/SplitConfigurationManager.tsx` — `handleCommonAddressChange` (writes raw typed string into every split on each keystroke via `applyCommonToAllSplits`) and `handleCommonAddressSelect` (writes formatted string + suburb, but from an async callback). Because `applyCommonToAllSplits` is `async` (awaits `fetchSuburbData`), the last-resolving call wins — a keystroke apply can land AFTER the selection apply, leaving the raw text in `splits[].deliveryAddress`. This matches ORD-073507-A: raw `"25 kintore cr"` in address, but suburb correctly resolved.

**Bug 2 — `same_as_billing` overrides typed address, master gets no suburb**
- `src/components/order/services/orderCreationService.ts` `createSplitOrder`:
  - Lines 379–394: master address is ALWAYS `params.customer.full_address` (or a fallback string); `masterSameAsBilling` is hardcoded `true`.
  - `masterOrderData` (467–504) does **not** include `delivery_suburb_id` at all → always NULL on master.
  - Split branch 574–591: when `split.sameAsBilling` is true it re-derives `customer.full_address` verbatim (206 of 219 account customers only have a street fragment → no suburb in the address string).
- `createSingleOrder` (lines 249–257) has the same "derive from profile when sameAsBilling" pattern.

**Bug 3 — "Same address and Time" doesn't propagate to every split**
- `SplitConfigurationManager` — `handleSameAddressToggle` calls `applyCommonToAllSplits({address:true})` once with the *initial* `commonSameAsBilling=true` default, then subsequent `handleCommonSameAsBillingToggle` / `handleCommonAddressChange` / `handleCommonAddressSelect` each fire more async applies. Because they share state via React closures and each `await fetchSuburbData` before writing, the ordering is non-deterministic — this is why ORD-073507-B kept `sameAsBilling=true`, profile address, fee $0 while ORD-073507-A got the typed address.
- Master is never included in propagation (the master is built independently in `createSplitOrder`, not from `splits[]`).

---

## 2. Specific fix per bug

### Bug 1 — atomic place selection, then lock the field

In `EnhancedAddressInput`:
- Track a `selectedPlaceRef` (ref, not state — avoids re-render race). Set it to the formatted address at the START of `handlePredictionSelect`, before any async work.
- Introduce one commit callback shape: `onAddressSelect({ fullAddress, suburbId?, … })` is the ONLY write path once a prediction has been picked. Do **not** call `onChange(prediction.description)` first — replace it with a single `onAddressSelect` that carries the full formatted address. Parents commit *both* the address string and suburb id in a single state setter (see Split fix below).
- After a selection commits, ignore `onChange` writes whose value equals the last raw typed prefix. Only re-arm typing when the user actively edits (keydown that changes length beyond the selected value). `handleBlur` must NOT fire an onChange.
- The debounced-search effect must gate on `selectedPlaceRef.current === null || value !== selectedPlaceRef.current` to stop it re-firing predictions right after selection.

In `SplitConfigurationManager.handleCommonAddressSelect` and every other `onAddressSelect` consumer (`OrderAddressForm`, `CustomerAddressForm`, `OrderDeliveryForm`, `DeliveryAddressStep`):
- Replace the two-step "call `onChange(fullAddress)` then trigger suburb auto-detect callback" pattern with a single setState that carries `{ deliveryAddress, deliverySuburbId }`. Do it via a functional updater to eliminate stale closure risk.
- Delete `handleCommonAddressChange`'s per-keystroke `applyCommonToAllSplits` call. Raw typing must NEVER be persisted into splits — only committed selections propagate.

### Bug 2 — never re-derive from profile after a manual entry; compose complete address when we do

In `orderCreationService.ts`:
- Introduce `resolveDeliveryAddress(customer, suburbRow, {typedAddress, sameAsBilling})`:
  - if `sameAsBilling` is false → use `typedAddress` (throw if empty).
  - if `sameAsBilling` is true → if `customer.full_address` contains a comma treat it as complete and return as-is; otherwise compose `${customer.full_address}, ${suburb.name} ${suburb.state} ${suburb.postcode}` from a fresh suburbs lookup by `customer.suburb_id`.
- Apply this to both `createSingleOrder` and every split (and master) in `createSplitOrder`.
- Master row in `createSplitOrder`:
  - Add `delivery_suburb_id` to `masterOrderData`, sourced from the common address selection (or from the first split when no common address was set).
  - Compute `master.delivery_address` / `same_as_billing` from the same common values used to propagate to splits — never from the profile in isolation.
- Validation before insert: if `delivery_method === 'delivery'` and `delivery_suburb_id` is null → throw `"Please select a delivery suburb before submitting."`. Apply to master and every split. Wire the throw to a toast + focus on the suburb selector rather than losing draft.
- Auto-flip `sameAsBilling` to false the moment `deliveryAddress` diverges from the customer profile address. Do this in the form state layer so the flag can never be `true` while a different address is persisted.
- `$0` delivery fee guard: in `createSplitOrder`, replace the "no suburb on this split → trust client value" branch with a hard throw for delivery orders unless `split.deliveryFeeManual === true` AND the operator explicitly set 0 (surface a confirm in the review step first — matches the legitimate "free delivery on specials" case). Same guard in `createSingleOrder`.

### Bug 3 — one source of truth for common address; propagate synchronously to master + all splits

In `SplitConfigurationManager`:
- Refactor `applyCommonToAllSplits` to be **synchronous** in state: compute the next `splits` array from the incoming overrides + current common state, call `onSplitsChange` immediately. Move the fee lookup into a `useEffect` that watches `(commonSuburbId, commonSameAsBilling, useSameAddress)` and issues **one** `onSplitsChange` with the resolved fee once — no in-handler awaits, no interleaved writes.
- When `useSameAddress` is true, disable per-split address editors entirely (read-only) so the common values cannot desync.
- Include the master in the "common" propagation via a new callback on `MultiStepOrderForm` (or by lifting common address into shared draft state) so the master row saved by `createSplitOrder` uses the same address, suburb, and fee as every split.
- `handleSameAddressToggle(true)` must snapshot current customer defaults into `commonSameAsBilling`/`commonDeliveryAddress`/`commonDeliverySuburbId` before propagating, so toggling on doesn't reset splits that already had per-split overrides to `sameAsBilling=true`.

---

## 3. Regression test

Add a Playwright spec `tests/split-address-propagation.spec.ts`:

1. Seed an account customer whose `customers.full_address` is a legacy fragment (e.g. `"58 Normanby Rd"`) with `suburb_id` = Kew (rate $40, markup $5 → $45).
2. Log in as an admin, open the new-order flow for that customer.
3. Add 2 products, choose Delivery, choose Split (2 splits).
4. Enable "Same address and Time" and "Use Different Address".
5. Type `"25 kintore"` in the common address field, wait for the Places dropdown, click the `"25 Kintore Crescent, Box Hill VIC 3128, Australia"` prediction.
6. Pick a delivery date + time, allocate products across both splits, submit.
7. Query `orders` by the returned master `order_number`. Assert, for master + both splits:
   - `delivery_address === "25 Kintore Crescent, Box Hill VIC 3128, Australia"` (case-exact, no lowercase/abbreviated variant).
   - `delivery_suburb_id === <Box Hill 3128 uuid>` (never NULL).
   - `same_as_billing === false`.
   - `delivery_fee === 45.00` (never 0, never divided).
8. Second scenario: same flow but leave "Same address" OFF and manually enter a different address on Split 1. Assert Split 1 keeps the typed formatted address, and the master row's suburb + address reflect Split 1 (or common), never the raw customer profile fragment.
9. Negative case: attempt to submit a delivery split with suburb cleared → expect the UI to block submit with a suburb-required error, and no orders to be inserted.

---

## 4. Regression risk on existing flows

- **Order edit flow (`OrderEditFormLogic` / `OrderPricingForm`)** — shares `EnhancedAddressInput` and the same `onAddressSelect` contract. Changing the callback shape needs a matching update in `OrderAddressForm`, `CustomerAddressForm`, `OrderDeliveryForm`, `DeliveryAddressStep`, and any storefront form using `EnhancedAddressInput`. Low risk if a compat wrapper preserves the old `(value:string)=>void` `onChange` for callers that don't consume the atomic payload.
- **Single (non-split) order create** — same address resolution helper will now compose a full address for legacy profile fragments. Historically these saved as bare street; downstream printouts and Sheets sync will start seeing full addresses. That's an improvement, but MYOB push mapping should be spot-checked (it already reads `delivery_address`, so no schema change).
- **Storefront (unauthenticated) order flow** — uses its own `AccountNumberStep` + `StorefrontOrderFlow`; not touched by these fixes, but confirm no accidental import of the changed handler signatures.
- **Legitimate $0 delivery** ("free delivery on specials") — protected by requiring `deliveryFeeManual === true` before allowing 0; automated fallbacks can no longer produce 0.
- **Editing existing orders that already have `same_as_billing=true` + fragment address** — no back-migration is planned in this change; only newly created/edited orders get the composed address. Existing history is preserved.
