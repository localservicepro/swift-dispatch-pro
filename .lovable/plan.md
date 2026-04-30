## Goal

In Order Review Step, when a product has a special discount applied, show the original price struck through next to the discounted price (e.g. ~~AU$10.00~~ **AU$9.00** × 1). Just display `item.product.price` — no recalculation.

## Change

Single file: `src/components/order/OrderReviewStep.tsx`

In both render branches (split and non-split products), compare `cartItem.product.price` (original) to `cartItem.unit_price` (already-discounted). If original is greater, render it with `line-through text-muted-foreground` before the discounted price (which is shown in red to highlight the saving). Line totals stay unchanged — they continue to use `unit_price * quantity`.

```text
SHGS Washed Sand Bag
AU$10.00 (strikethrough)  AU$9.00 (red)  × 1            AU$9.00
```

No DB changes, no other files touched.
