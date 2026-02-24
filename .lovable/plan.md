

## Add Search Filter and Fix Scroll in Bulk PIN Management Dialog

### Problem
The Bulk PIN Management dialog shows 209 customers but has no search/filter input and the table may not scroll properly within the dialog's constrained height.

### Changes

#### `src/components/customer/BulkPinManagementDialog.tsx`

1. **Add a search input** above the table (below the action buttons) that filters customers by name, email, or company name
2. **Add state** `searchTerm` and filter the displayed customers list using it
3. **Ensure the ScrollArea** has a fixed max height so the table scrolls properly within the dialog

The search input will use the existing `Input` component with a `Search` icon from lucide-react. Filtering happens client-side since all customers are already loaded.

### Technical Details

- Add `searchTerm` state and an `Input` with placeholder "Search customers..."
- Filter `customers` array by matching `searchTerm` against `company_name`, `business_name`, `first_name`, `last_name`, and `email`
- The filtered list is used for rendering the table and for the "select all" checkbox logic
- The ScrollArea already wraps the table but needs an explicit height constraint (e.g., `max-h-[400px]`) to ensure scrolling works

