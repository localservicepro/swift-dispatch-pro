

## Redesign Account Statement to Match Reference

The reference image shows a clean, traditional accounting statement format. The current statement has too many columns (items, units, status badges, address grouping). It needs to be simplified to match.

### Changes to `supabase/functions/generate-account-statement/index.ts`

**Replace the entire `generateStatementHTML` function** with a simplified layout:

1. **Header**: Keep business details (name, address, ABN, phones, emails, website) on the left. Date and "STATEMENT" title on the right. Add customer name and address below, with business hours info.

2. **Main table** - Simple 5 columns matching the reference:
   - **Date** (delivery/pickup date)
   - **Invoice No.** (order number - renamed from "Order #")
   - **Charges** (total amount for pending/unpaid orders)
   - **Payments** (total amount for paid orders)
   - **Balance Due** (running balance - charges minus payments accumulated row by row)

3. **Remove**: Items column, Units column, Status badges, Address grouping/sections, Address subtotals, Subtotal/Delivery/Adjustments breakdown, Payment Summary section, Back order styling (back orders still excluded from totals but no special visual treatment needed)

4. **Keep**: Aging summary box at bottom (Current, Over 30 Days, Over 60 Days, Over 90 Days, Total Due)

5. **Add bank payment details** at footer matching the reference:
   - "Payment: (NAB) Acc. Name: Surrey Hills Garden Supplies. : BSB: 083 153 Account No: 74 137 0674"
   - Credit/Debit card surcharge notes

6. **Running balance logic**: Start at $0, for each order row:
   - If unpaid: add to Charges column, running balance increases
   - If paid: add to Payments column, running balance decreases
   - Show the cumulative Balance Due in the last column

### Technical Detail

The running balance is calculated by iterating through orders sorted by date. Each row shows either a Charge or Payment amount (not both), and the Balance Due column accumulates. The final row's Balance Due should match the total. Back orders are excluded entirely from the table (not shown).

