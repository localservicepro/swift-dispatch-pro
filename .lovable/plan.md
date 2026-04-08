

## Convert Add/Edit Contact forms to Dialog popups

### Problem
In the Customer Portal's Contacts tab, clicking "Add Contact" renders the form at the bottom of the contact list. With many contacts, users must scroll down to find it.

### Solution
Replace the inline `Card` forms for both **Add Contact** and **Edit Contact** with `Dialog` popups that appear centered on screen.

### Changes

**File: `src/components/customer/CustomerContactsManager.tsx`**

1. Import `Dialog, DialogContent, DialogHeader, DialogTitle` from `@/components/ui/dialog`
2. Replace the "Add New Contact" `Card` block (lines 329-387) with a `Dialog` controlled by `isAddingContact` state — same form fields inside `DialogContent`
3. Replace the "Edit Contact" `Card` block (lines 389-447) with a `Dialog` controlled by `!!editingContact` state — same form fields inside `DialogContent`, closing sets `editingContact` to null
4. No logic changes — only the container changes from inline Card to Dialog

