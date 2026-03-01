

## Group Statement Rows by Delivery Address

### What changes
**File: `supabase/functions/generate-account-statement/index.ts`**

1. **Include `delivery_address` in the order query** (line 62) — add it to the select fields.

2. **Group orders by address** — After filtering delivered orders, group them by `delivery_address`. Orders with no address go under a "No Address" group.

3. **Render address-grouped tables** — For each unique address, output:
   - A bold address header row (e.g., "**12 Smith St, Blackburn VIC 3130**")
   - The same 5-column table rows (Date, Invoice No., Charges, Payments, Balance Due) for orders at that address
   - The running balance continues across all address groups (not reset per address)

4. **Keep everything else the same** — Totals row, Balance Due, Aging Summary, Payment Info footer all remain unchanged.

### Layout example
```text
Statement Period: March 2026

  12 Smith Street, Blackburn VIC 3130
  ─────────────────────────────────────────────────
  Date       Invoice No.    Charges    Payments    Balance Due
  03/03/2026 ORD-082514-B   $65.00                $65.00

  45 High Street, Glen Iris VIC 3146
  ─────────────────────────────────────────────────
  Date       Invoice No.    Charges    Payments    Balance Due
  04/03/2026 ORD-240293     $245.00               $310.00

  Totals                    $310.00    $0.00
                                    BALANCE DUE:   $310.00
```

