

## Remove Address Requirement from Customer Dialog

### Problem
The "Edit Customer" / "Create Customer" dialog shows an error "Address is required for all customers" when saving without an address. The user wants address to be optional.

### Change
**File: `src/hooks/useCustomerDialogActions.ts`** (lines 38-46)

Remove the address validation block that checks for `full_address` and returns an error toast.

