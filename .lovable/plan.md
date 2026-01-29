
## Group Account Statement Orders by Delivery Address

### Overview
Modify the monthly account statement to organize orders by delivery address. Each unique delivery address will have its own section with the address displayed as a header above its respective orders table.

### Current Behavior
- All orders are displayed in a single flat table sorted by date
- No grouping or categorization

### New Behavior
- Orders grouped by delivery address
- Each group shows the delivery address as a header
- Each group has its own table with the same columns (Date, Order #, Status, Items, Units, Amount)
- Groups sorted alphabetically by address
- Subtotals shown per address group (optional enhancement)
- Grand totals remain at the bottom for all orders combined

---

### File to Modify

**`supabase/functions/generate-account-statement/index.ts`**

#### 1. Update Order Query (Lines 64-84)
Add `delivery_address` to the selected fields:

```typescript
const { data: orders, error: ordersError } = await supabase
  .from("orders")
  .select(`
    id,
    order_number,
    created_at,
    status,
    products,
    subtotal,
    delivery_fee,
    adjustments,
    total_amount,
    payment_status,
    admin_id,
    delivery_address,  // ADD THIS FIELD
    profiles:admin_id(full_name)
  `)
  // ... rest remains the same
```

#### 2. Add Grouping Logic in `generateStatementHTML` function
After calculating totals, group orders by delivery address:

```typescript
// Group orders by delivery address
const ordersByAddress: { [address: string]: any[] } = {};
orders.forEach((order: any) => {
  const address = order.delivery_address || 'No Delivery Address';
  if (!ordersByAddress[address]) {
    ordersByAddress[address] = [];
  }
  ordersByAddress[address].push(order);
});

// Sort addresses alphabetically
const sortedAddresses = Object.keys(ordersByAddress).sort();
```

#### 3. Generate Address-Grouped Sections
Replace the single table with multiple address-grouped tables:

```typescript
const addressSections = sortedAddresses.map(address => {
  const addressOrders = ordersByAddress[address];
  
  // Calculate address subtotal
  const addressSubtotal = addressOrders.reduce((sum, order) => 
    sum + Number(order.total_amount || 0), 0
  );
  
  // Generate rows for this address
  const rows = addressOrders.map((order: any) => {
    // ... same row generation logic ...
  }).join("");
  
  return `
    <div class="address-section">
      <div class="address-header">
        <strong>Delivery Address:</strong> ${address}
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Order #</th>
            <th>Status</th>
            <th>Items</th>
            <th class="text-center">Units</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="address-subtotal">
            <td colspan="5" class="text-right"><strong>Address Subtotal:</strong></td>
            <td class="text-right"><strong>$${addressSubtotal.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}).join("");
```

#### 4. Add CSS Styles for Address Headers

```css
.address-section {
  margin-bottom: 25px;
}
.address-header {
  background: #e8f4e8;
  padding: 8px 12px;
  border-left: 4px solid #2e7d32;
  margin-bottom: 10px;
  font-size: 12px;
}
.address-subtotal {
  background: #f9f9f9;
}
.address-subtotal td {
  border-top: 2px solid #000;
  font-weight: bold;
}
```

#### 5. Update HTML Template
Replace the single `<table>` with `${addressSections}`:

```html
<!-- Before -->
<table>...</table>

<!-- After -->
${orders.length > 0 ? addressSections : '<p style="text-align: center; padding: 20px;">No orders found for this period.</p>'}
```

---

### Expected Result

```text
+----------------------------------------------+
|           MONTHLY ACCOUNT STATEMENT          |
+----------------------------------------------+
| Customer: Agostini Homes Pty Ltd             |
| Period: January 2026                         |
+----------------------------------------------+

Delivery Address: 22 Smythe Ave, Mont Albert VIC 3127
+-------+------------+-----------+-------------+-------+---------+
| Date  | Order #    | Status    | Items       | Units | Amount  |
+-------+------------+-----------+-------------+-------+---------+
| 08/01 | ORD-774764 | DELIVERED | Richie's... |   2   | $284.00 |
| 13/01 | ORD-857614 | DELIVERED | 4 Bar 6Mtr  |   1   | $65.00  |
+-------+------------+-----------+-------------+-------+---------+
                               Address Subtotal: $349.00

Delivery Address: 5 Sidwell Ave, St Kilda East VIC 3183
+-------+------------+-----------+-------------+-------+---------+
| Date  | Order #    | Status    | Items       | Units | Amount  |
+-------+------------+-----------+-------------+-------+---------+
| 14/01 | ORD-355212 | DELIVERED | 4 Bar 6Mtr  | 1,3,3 | $110.00 |
+-------+------------+-----------+-------------+-------+---------+
                               Address Subtotal: $110.00

+----------------------------------------------+
|                 GRAND TOTALS                 |
+----------------------------------------------+
```

---

### Deployment
After implementation, redeploy the `generate-account-statement` Edge Function.
