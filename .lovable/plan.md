

## Show contact name for business customers with partial names

### Problem
The contact subtitle only appears when both `first_name` AND `last_name` exist. Many trade/business customers only have one name field filled in (or neither), so they show no contact info.

### Fix
**`src/components/customer/CustomerCard.tsx`** — Change the condition to show the contact line when *either* `first_name` or `last_name` is present, and display whichever is available.

```tsx
{customer.entity_type === 'business' && (customer.first_name || customer.last_name) && (
  <span className="text-sm text-muted-foreground">
    Contact: {[customer.first_name, customer.last_name].filter(Boolean).join(' ')}
  </span>
)}
```

Also update the same logic in the `getCustomerSubtitle` function for consistency.

### Scope
Single file change: `src/components/customer/CustomerCard.tsx`

