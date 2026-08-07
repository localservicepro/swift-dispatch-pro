# Fix suburb matching on edit + edit splits from the master order

## What's wrong today (verified on MO - ORD-925482JT)

- The master order `ORD-925482` was saved with delivery address text `Blackburn Rd`, delivery fee `$60`, and **no delivery suburb** stored. Its two splits (`-A`, `-B`) do have the Blackburn suburb stored.
- Blackburn does exist in the suburb list (Blackburn, VIC 3130, AU$40 base).
- When the edit dialog opens, it tries to auto-detect the suburb for orders that have none. That check fires immediately on mount, **before the suburb list has finished loading from the database**, so the matcher runs against an empty list and always reports "No Matching Suburb". Selecting the suburb by hand works, which is why the list itself looks fine.

## Part 1 — Suburb auto-detect fix (small)

1. Make the auto-detect wait until suburbs are actually loaded before running, and re-run once they arrive. No toast is shown while the list is still loading.
2. Keep the existing backwards-scanning matcher (street segment excluded, longest suburb name wins) — only the timing changes, so `Blackburn Rd` will now resolve to Blackburn.
3. Only auto-detect once per open dialog: if it genuinely finds nothing, show the "select manually" message once instead of on every keystroke.

## Part 2 — Editing splits from the master order

When the order being edited is a split master, the edit dialog gains a tab bar:

```text
[ Master ] [ Split A ] [ Split B ] ...
```

- **Master tab** — the existing form, but item/price fields become read-only summaries, since the master's amounts are derived from its splits.
- **Each split tab** — the same full edit form for that split: products/quantities, delivery date & time, delivery address + suburb, delivery fee (including $0), driver, truck, status and notes. Edited independently; nothing is copied between splits.
- **One Save** — saving writes every changed tab (master fields plus each edited split) and then rewrites the master's subtotal, delivery fee, fuel surcharge and total as the **sum of its splits**, so master and pipeline totals always reconcile.
- Unsaved-change markers on each tab so it's obvious which splits were touched.
- A confirm step before saving lists what will change per split.

## Technical notes

- `useSuburbManagement` gets a `loading` flag; `OrderDeliveryForm`'s legacy auto-detect effect depends on it and on a "already attempted" ref.
- New `useSplitOrderEditor` hook loads siblings via `master_order_id`, holds one `useOrderFormData` state per order, and exposes a single submit that reuses the existing `useOrderFormSubmission` per order sequentially, then a final master-total recompute.
- Master recompute is done in the client from the saved split rows (same arithmetic used elsewhere: subtotal + adjustments + delivery fee + fuel surcharge). No changes to the per-order total calculation logic, split creation flow, or statement/payment-type logic.
- No database schema changes needed.
