

## Plan: Make Email Optional When Creating Customers

### Problem
Email is currently required for non-account-business customers — both in the form UI (marked with `*`, `required` attribute) and in the save validation logic.

### Changes

**1. `src/components/customer/CustomerContactForm.tsx`**
- Remove `required` from the email input for all customer types (keep it only for account business logic)
- Change the email label from `"Email *"` to `"Email"` for all types

**2. `src/hooks/useCustomerDialogActions.ts`**
- In the `handleSave` validation block for non-account-business customers, remove `!formData.email` from the required check — only require `first_name` and `last_name`
- Update the error message accordingly

**3. `src/components/customer/CustomerPersonalInfoForm.tsx`**
- Remove `required` from the email input

These are small, targeted changes across 3 files.

