

## Change Account Statement to Use Delivery Date Instead of Created Date

### The Problem
Currently, the account statement filters orders by `created_at` date. This means an order placed in January but delivered in February would appear in the January statement, not February - causing potential billing confusion.

### The Solution
Change the date filter to use `delivery_date` (or for pickup orders, `pickup_date`) instead of `created_at`. This ensures orders appear in the statement for the month they were actually fulfilled.

### Logic for Date Selection
- For **delivery** orders: Use `delivery_date`
- For **pickup** orders: Use `pickup_date`
- Only include orders with status `delivered` (to ensure they've been completed)

---

### Files to Modify

#### 1. Frontend Preview: `src/hooks/useAccountStatementExport.ts`

**Lines 29-35** - Update preview query to filter by delivery_date for delivered orders:

```typescript
const { data, error } = await supabase
  .from("orders")
  .select("id, total_amount, payment_status, delivery_date, pickup_date, delivery_method")
  .eq("customer_id", customerId)
  .eq("status", "delivered")  // Only delivered orders
  .is("deleted_at", null);

// Then filter in JavaScript based on delivery_date or pickup_date
const filteredData = data?.filter(order => {
  const orderDate = order.delivery_method === 'pickup' 
    ? order.pickup_date 
    : order.delivery_date;
  return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
});
```

#### 2. Backend: `supabase/functions/generate-account-statement/index.ts`

**Lines 64-85** - Update order query:

```typescript
const { data: orders, error: ordersError } = await supabase
  .from("orders")
  .select(`
    id,
    order_number,
    created_at,
    delivery_date,
    pickup_date,
    delivery_method,
    status,
    products,
    subtotal,
    delivery_fee,
    adjustments,
    total_amount,
    payment_status,
    admin_id,
    delivery_address,
    profiles:admin_id(full_name)
  `)
  .eq("customer_id", customerId)
  .eq("status", "delivered")  // Only include delivered orders
  .is("deleted_at", null)
  .order("delivery_date", { ascending: true });

// Filter orders based on delivery_date or pickup_date
const filteredOrders = (orders || []).filter((order: any) => {
  const orderDate = order.delivery_method === 'pickup' 
    ? order.pickup_date 
    : order.delivery_date;
  return orderDate && orderDate >= startDate && orderDate <= endDate;
});
```

**Update HTML generation** to display delivery date instead of created date:
- Change `formatDateAU(order.created_at)` to use `order.delivery_date` or `order.pickup_date`
- Update column header from "Date" to "Delivery Date"

---

### Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Date filter | `created_at` | `delivery_date` / `pickup_date` |
| Order status | All statuses | Only `delivered` |
| Date column | Order created date | Delivery/pickup date |

### Benefits
- Statements reflect actual service delivery month
- Aligns with standard accounting practices
- No missed orders due to delayed delivery
- Clearer for customer billing reconciliation

