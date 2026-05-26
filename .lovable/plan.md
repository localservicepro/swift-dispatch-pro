# Review Step — Redesign + Inline Edit

Apply the selected **Steel-edged split layout** direction to `OrderReviewStep.tsx`, surface per-split delivery addresses (currently hidden), and let the user edit per-split address, date/time, and special instructions directly on the Review step.

## Scope

In scope (Review step only):
- Visual redesign of `OrderReviewStep.tsx` to the sidebar-summary layout.
- Per-split delivery address now displayed (with "Same as billing" or the custom suburb + street).
- Inline edit for each split: delivery address (suburb + street), delivery date, delivery time, special instructions.
- Auto-recalculate the split's delivery fee when its suburb changes (reuse existing `useDeliveryFeeCalculation` + `fetchSuburbData` + `parseDeliveryRate`).
- Fully responsive (sidebar collapses below totals on mobile, splits stack, no horizontal scroll).

Out of scope:
- Other steps (`CompactSplitConfig`, delivery method, payment, etc.) — unchanged.
- Data model (`SplitConfig`) — unchanged.
- Order creation services, backend, RPCs, fee math — unchanged.
- Single-order (non-split) flow keeps its existing editable delivery fee input.

## Files to change

1. **`src/components/order/OrderReviewStep.tsx`** — rewrite layout, wire new props.
2. **`src/components/order/MultiStepOrderForm.tsx`** — pass `onUpdateSplit` and `fetchSuburbData`/`parseDeliveryRate` results so Review can persist split edits.
3. **`src/components/order/review/SplitEditPopovers.tsx`** *(new, small)* — three small popover components (`EditAddressPopover`, `EditSchedulePopover`, `EditInstructionsPopover`) reused per split card, to keep `OrderReviewStep.tsx` readable.

No new dependencies. Uses existing shadcn `Popover`, `Calendar`, `Select`, `Textarea`, `Input`, `Button`, `Badge`, `Card`, plus `EnhancedAddressInput` and `SuburbSelector` already used in `CompactSplitConfig`.

## Layout (matches selected direction)

```
┌─────────────────────────────────────────┬──────────────────┐
│ Review Your Order                       │  Order Summary   │
│                                         │  (sticky, slate) │
│ ┌─Customer──────────┐ ┌─Billing──────┐  │  Subtotal        │
│ │ name + contact    │ │ full_address │  │  Delivery fees   │
│ └───────────────────┘ └──────────────┘  │  GST             │
│                                         │  ──────────      │
│ Split Shipments                  [3]    │  Total           │
│ ┌─Split #1 — Suburb  • Fee $50 ──────┐  │                  │
│ │ items list ...                     │  │  [ Confirm CTA ] │
│ │ ─────                              │  │                  │
│ │ Address ✎      Date & Time ✎       │  ┌────────────────┐│
│ │ Special instructions ✎             │  │ Payment Method ││
│ └────────────────────────────────────┘  │ Badge          ││
│ ┌─Split #2 — ... ────────────────────┐  └────────────────┘│
│ └────────────────────────────────────┘                    │
│                                                            │
│ Order Notes / Delivery Notes / PO (kept editable)         │
└────────────────────────────────────────────────────────────┘
```

Mobile (`<lg`): single column, summary card moves to the bottom (still contains the Confirm CTA).

## Inline edit behavior

For each split card, three pencil-icon triggers open a Popover:

- **Address** — toggles "Same as billing" pill; when custom, shows `EnhancedAddressInput` + `SuburbSelector`. On suburb change, calls `fetchSuburbData` → `parseDeliveryRate` and updates `deliveryFee` on that split (same logic as `CompactSplitConfig.handleSuburbChange`). Saves via `onUpdateSplit(index, {...})`.
- **Date & Time** — `Calendar` + `Select` (reuses `generateTimeSlots`, `isDateBeforeToday`).
- **Special Instructions** — `Textarea` with Save/Cancel.

The Save button in each popover calls the parent's `onUpdateSplit` (added as a new prop). No optimistic state needed — the parent already drives `splits`.

## New props on `OrderReviewStep`

```ts
onUpdateSplit?: (splitIndex: number, updates: Partial<SplitConfig>) => void;
```

`MultiStepOrderForm` already has `updateSplit` / `setSplits` in scope — wire the existing updater through.

## Visual tokens

The locked Slate & Steel palette + Space Grotesk/DM Sans are mapped to existing semantic tokens in `index.css` / `tailwind.config.ts` (no inline hex per project rules):
- Headings: `font-display` class (Space Grotesk) — add if missing.
- Body: existing default (DM Sans) — add if missing.
- Surfaces: `bg-card`, `border-border`, `bg-muted` for split header strip.
- Summary rail: `bg-foreground text-background` (slate-700-like) with `bg-primary` confirm button.

If `font-display` / DM Sans aren't already configured, add them in `tailwind.config.ts` `fontFamily` and import via the existing Google Fonts link in `index.html`. (Token additions only — no hex literals in components.)

## Validation

- Run dev preview at desktop 1234px and mobile 390px to confirm responsive behavior.
- Verify editing a split's suburb on Review immediately updates its delivery fee chip and the sidebar total.
- Verify editing a split's date/time and special instructions persists when navigating back to a previous step and forward again.
- Verify single-order (non-split) Review still renders correctly with its existing editable delivery fee.

