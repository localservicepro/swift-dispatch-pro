## Plan

1. **Change pipeline sorting priority**
   - Update the Opportunity Pipeline ordering so cards are sorted by:
     1. delivery date
     2. delivery time/window
     3. order creation time, oldest first
   - This means if two orders are for the same date and timeframe, the order placed first appears above newer same-slot orders.

2. **Preserve existing stage grouping**
   - Keep the current columns and status/payment logic unchanged.
   - Only change the order of cards inside each stage.

3. **Show placed time on cards**
   - Add a compact “Placed” date/time line to each opportunity card so staff can see exactly when the order was created.
   - Use Australian date formatting already used elsewhere in the app.

4. **Handle unscheduled orders safely**
   - Orders without a delivery date/time will remain lower priority than scheduled orders.
   - For orders without scheduling, keep a clear fallback sort by creation time.

## Technical details

- Modify `src/components/opportunity/useOpportunityData.ts` sorting logic.
- Modify `src/components/opportunity/OpportunityCardInfo.tsx` to display `created_at` using existing `formatCreatedDate` / `formatCreatedTime` helpers.
- No database changes required because `created_at`, `delivery_date`, and `delivery_time` already exist and are already fetched for the pipeline.