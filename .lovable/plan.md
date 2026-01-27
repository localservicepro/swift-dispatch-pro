

# Account Orders Monthly Statement PDF Export

## Overview
Create a simple PDF export feature for **Account customers** that generates a monthly statement showing all orders, their details, and a total calculation for what needs to be paid.

## What This Will Include

### PDF Content
The exported PDF will be a **Monthly Account Statement** with:

1. **Header Section**
   - Business logo and details (Surrey Hills Garden Supplies)
   - Statement title: "Monthly Account Statement"
   - Account customer company name
   - Statement period (e.g., "January 2026")
   - Generated date

2. **Orders Table** (one row per order)
   | Order Date | Order # | Status | Items | Units | Amount |
   |------------|---------|--------|-------|-------|--------|
   | 15/01/2026 | ORD-619957JT | Delivered | 20mm Gravel, River Sand | 3, 2 | $450.00 |
   | 18/01/2026 | ORD-619982JT | Delivered | Premium Mulch | 5 | $275.00 |

3. **Bottom Calculation Section**
   - Subtotal of all orders
   - Total delivery fees
   - Any adjustments
   - GST included
   - **Total Amount Due** (highlighted)
   - Payment status breakdown (Paid vs Pending)

---

## User Interface

### Access Point
Add an **"Export Statement"** button in the **Customer Management** area, visible when viewing an Account customer's details or orders.

### Export Dialog
A simple dialog with:
- **Month/Year selector**: Quick buttons for "This Month", "Last Month", or custom date range picker
- **Preview**: Shows count of orders and estimated total before export
- **"Generate PDF"** button: Downloads the statement immediately

---

## Technical Implementation

### Files to Create

#### 1. `supabase/functions/generate-account-statement/index.ts`
New edge function that:
- Accepts `customerId`, `startDate`, `endDate` parameters
- Fetches all orders for that account customer within the date range
- Fetches business settings for header
- Generates HTML receipt similar to existing `generate-pdf-receipt` but formatted as a statement
- Returns base64-encoded HTML for printing/download

#### 2. `src/components/customer/AccountStatementExportDialog.tsx`
New dialog component with:
- Month/year selection using existing Calendar component
- Quick select buttons: "This Month", "Last Month"
- Preview showing order count and total
- "Generate Statement" button that calls the edge function
- Uses existing dialog patterns from the codebase

#### 3. `src/hooks/useAccountStatementExport.ts`
Hook to handle:
- Date range state management
- Fetching orders preview (count and total)
- Calling the edge function
- Handling the PDF download

### Files to Modify

#### 1. `src/components/customer/CustomerOrders.tsx`
- Add "Export Statement" button in the header area
- Opens the `AccountStatementExportDialog`

#### 2. `src/components/customer/CustomerManagementHeader.tsx`
- Optionally add a menu item for "Export Account Statements" for bulk access

---

## PDF Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Surrey Hills Garden Supplies                       │
│          680 Canterbury Rd, Surrey Hills 3127               │
│          Ph: 03 9890 3901  ABN: 44 788 796 653             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              MONTHLY ACCOUNT STATEMENT                      │
│                                                             │
│  Customer: ABC Landscaping Pty Ltd                          │
│  Statement Period: January 2026                             │
│  Generated: 27/01/2026                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Date        Order #        Status    Items      Amount     │
│  ─────────────────────────────────────────────────────────  │
│  05/01/2026  ORD-619900JT  Delivered  Gravel x3  $450.00   │
│  12/01/2026  ORD-619925JT  Delivered  Mulch x5   $275.00   │
│  18/01/2026  ORD-619957JT  Pending    Sand x2    $180.00   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                              Orders Subtotal:    $905.00    │
│                              Delivery Fees:      $120.00    │
│                              Adjustments:        -$25.00    │
│                              ──────────────────────────     │
│                              TOTAL DUE:       $1,000.00     │
│                                                             │
│                              GST Included:        $90.91    │
│                                                             │
│  Payment Summary:                                           │
│  ├─ Paid Orders (2):     $725.00                           │
│  └─ Pending Orders (1):  $275.00                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

1. User opens Account customer's orders view
2. Clicks "Export Statement" button
3. Dialog opens with month selection (defaults to current month)
4. System fetches order count and totals for preview
5. User clicks "Generate PDF"
6. Edge function fetches:
   - Customer details (company name, etc.)
   - All orders within date range for that customer
   - Business settings for letterhead
7. Generates HTML statement
8. Returns as base64 data URL
9. Opens print dialog in new window

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-account-statement/index.ts` | Create | Edge function to generate PDF statement |
| `src/components/customer/AccountStatementExportDialog.tsx` | Create | Dialog with month picker and export button |
| `src/hooks/useAccountStatementExport.ts` | Create | Hook for data fetching and export logic |
| `src/components/customer/CustomerOrders.tsx` | Modify | Add "Export Statement" button |

---

## Key Benefits

- **Simple for monthly invoicing**: One-click export of all orders for the month
- **Clear payment tracking**: Shows which orders are paid vs pending
- **Professional format**: Matches existing receipt styling
- **Detailed breakdown**: Shows all items, quantities, and amounts
- **Easy integration**: Uses existing PDF generation patterns

