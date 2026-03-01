

## Account Statement: Back Orders Not Charged + Aging Summary Box

### Problem
Currently, back orders are included in the totals and charged on the statement. They should be listed for visibility but **excluded from the charged totals**. Additionally, an aging summary box (Current, Over 30 Days, Over 60 Days, Over 90 Days, Total Due) is needed at the bottom, matching the reference image.

### Changes

**File: `supabase/functions/generate-account-statement/index.ts`**

1. **Separate back order amounts from totals** - Back orders will still appear in the order list (with their BACKORDER badge) but their amounts will be excluded from Subtotal, Delivery Fees, Adjustments, and Total Due. Back order amounts will show as $0.00 in the Amount column or be listed separately with a "Back Order Total" deduction line.

2. **Add aging summary box** - Fetch ALL unpaid delivered orders for this customer (not just the selected month) to calculate:
   - **Current**: Unpaid orders from the current statement month
   - **Over 30 Days**: Unpaid orders 30-60 days old
   - **Over 60 Days**: Unpaid orders 60-90 days old
   - **Over 90 Days**: Unpaid orders older than 90 days
   - **Total Due**: Sum of all aging buckets

   This requires an additional query to fetch all historical unpaid orders across all months.

3. **HTML/CSS** - Add a styled aging table at the bottom matching the reference image layout (bordered cells, bold headers).

**File: `src/hooks/useAccountStatementExport.ts`**

4. **Keep preview aligned** - Update the preview query to also use `.in("status", ["delivered", "back_order"])` but only count delivered orders in the total amount (back orders shown as count only, not in dollar totals).

### Technical Detail

- In the totals calculation loop, orders with `status === 'back_order'` will be skipped for financial totals but still rendered in the table
- Back order rows will show the amount struck through or as "$0.00" to clearly indicate they are not charged
- The aging query will look at all unpaid orders regardless of date range, grouped by age buckets based on delivery/pickup date relative to today

