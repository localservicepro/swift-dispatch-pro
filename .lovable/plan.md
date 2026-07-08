## Bug

The "Combined" total on split-order groups double-counts. Master `total_amount` already equals the sum of splits ($191 = $82 + $109), but `groupOrdersBySplit` adds master + splits, producing $382.

## Fix

In `src/components/order/utils/groupOrdersBySplit.ts`, change `combinedTotal` to be the sum of splits only (falling back to master total if splits sum is 0):

```ts
const splitsSum = splits.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
const combinedTotal = splitsSum > 0 ? splitsSum : (Number(o.total_amount) || 0);
```

No other changes. This fixes both Order Management and Opportunities since both use the same utility.

## Verification

- MO with master $191 and splits $82 + $109 shows `Combined: $191.00`.
- MO with no splits present falls back to master total.
