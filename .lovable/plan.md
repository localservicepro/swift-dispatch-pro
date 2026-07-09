## Goal
Make the split-orders reveal strip in Order Management visually prominent so it's immediately obvious that a master order has splits.

## Scope
Only `src/components/order/SplitOrderGroupCard.tsx` (Order Management list). Opportunities pipeline is unchanged (master already hidden there).

## Design changes to the reveal strip

Replace the current thin one-line strip with a bolder, badge-forward banner:

- **Stronger container**: gradient background (amber/indigo tint tied to customer type accent), 2px dashed top border visually "connecting" it to the master card, subtle shadow, larger padding (`py-3 px-4`), rounded-lg.
- **Prominent split icon**: circular filled badge (e.g. amber-500 bg, white `Split` icon) instead of a plain slate icon.
- **Bold label**: "Split into N orders" in `font-semibold text-slate-800`, replaces the muted "Show split orders".
- **Split count chip**: solid colored pill (e.g. `bg-amber-500 text-white`) instead of outline badge.
- **Combined total**: larger, right-aligned, with a small "Combined total" caption above the amount.
- **Toggle affordance**: chevron inside a rounded button-like control on the right with "Show" / "Hide" text, so it clearly reads as interactive.
- **Expanded state**: when open, keep the banner styled the same but swap chevron direction; the dashed left border on the nested splits stays and gets the matching accent color.
- **Hover state**: slight background darken + subtle scale/elevation to reinforce clickability.

No changes to logic, state, calculations, or props — purely presentational Tailwind class updates inside the existing `<button>` and expanded-children wrapper.

## Result
Master order card in Order Management is clearly followed by an eye-catching "Split into N orders — Combined $X" banner that reads unmistakably as a split-order group and as a clickable reveal.
