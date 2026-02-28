

## Add Missing Status Filters to Order Management

The `back_order` and `requested` statuses exist in the database enum and work in the Opportunity Pipeline, but the Order Management page's status filter dropdown is missing them. The data is already being fetched — it's just not filterable.

### Changes

**File: `src/components/order/OrderSearchFilters.tsx`** (lines 76-81)

Add the missing status options to the status filter `<Select>`:

```
<SelectItem value="all">All Statuses</SelectItem>
<SelectItem value="requested">Requested</SelectItem>
<SelectItem value="preparing">Preparing</SelectItem>
<SelectItem value="back_order">Back Order</SelectItem>
<SelectItem value="loading">Loading</SelectItem>
<SelectItem value="en_route">En Route</SelectItem>
<SelectItem value="delivered">Delivered</SelectItem>
<SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
<SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
<SelectItem value="cancelled">Cancelled</SelectItem>
```

This adds `requested`, `back_order`, `ready_for_pickup`, and `pickup_scheduled` to the dropdown. No other changes needed — the filtering logic in `useFilteredOrders` already matches on `order.status` directly.

