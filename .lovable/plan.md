

## Make Account Number Editable by Admins

### Problem
The account number field is currently read-only/disabled. Admins should be able to manually edit it if needed.

### Changes

**1. `src/components/customer/CustomerCompanyForm.tsx`**
- Remove `readOnly` and `disabled` from the account number `Input`
- Add an `onChange` handler that calls `onFormDataChange({ account_number: value })`
- Keep the `bg-muted font-mono` styling but make it editable
- Update placeholder to guide input

**2. `src/hooks/useCustomerDialogActions.ts`**
- Include `account_number` in the `customerData` object sent to Supabase on save (currently omitted, so manual edits aren't persisted)

**3. `src/components/customer/CustomerCompanyForm.tsx` interface**
- Add `account_number` to the `formData` interface (already present) — no change needed

### No database changes needed
The `account_number` column already exists and is writable. The auto-generation trigger only fires when the value is NULL on insert, so manual values will be preserved.

