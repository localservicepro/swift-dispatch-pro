

## Show contact name on business customer cards

### Problem
When viewing trade customers with business entity type, the card shows the business name (e.g., "1ST CLASS CONCRETE PAVING") but doesn't display the personal contact name. The `getCustomerSubtitle` function exists in `CustomerCard.tsx` but is never rendered.

### Fix
In `src/components/customer/CustomerCard.tsx`, render the contact name subtitle below the business display name. For business entity customers with a first/last name on file, show "Contact: First Last" under the title. The `getCustomerSubtitle` function already handles this logic — it just needs to be displayed.

### Change
**`src/components/customer/CustomerCard.tsx`** — After the display name `<h3>` (line 70-72), add a line showing the subtitle text when the customer is a business entity with a personal name on record.

