

## Fix: "Move Items to Backorder" Button Triggering Form Submit

### Root Cause
The "Move Items to Backorder" button in `OrderEditSections.tsx` is rendered inside the `<form>` element from `OrderEditForm.tsx`. Since it doesn't have `type="button"`, it defaults to `type="submit"`, causing the entire order edit form to submit whenever the button is clicked.

### Fix

**File: `src/components/order/OrderEditSections.tsx`** (line 89)

Add `type="button"` to the "Move Items to Backorder" button:

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setBackorderDialogOpen(true)}
  className="border-orange-300 text-orange-700 hover:bg-orange-100"
>
```

This prevents the button from triggering the parent form's `onSubmit` handler.

