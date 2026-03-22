

## Plan: Remove Default Account Number from MYOB Settings

### Changes

**1. `src/components/settings/MyobSettings.tsx`**
- Remove the `defaultAccount` state variable and its input field
- Remove `defaultAccountNumber` from the `saveCredentials` payload

**2. `src/components/payment/PaymentSettings.tsx`**
- No changes needed (doesn't reference default account)

**3. `supabase/functions/myob-auth/index.ts`**
- Remove `defaultAccountNumber` from the save-credentials handler (stop writing it)

**4. `supabase/functions/myob-push-invoice/index.ts`**
- Remove the default account lookup logic (lines ~167-178 that fetch account by `default_account_number`)
- Instead, let MYOB use its own default account mapping, or skip the `Account` field on invoice lines so MYOB assigns automatically

**5. `src/components/payment/MyobBatchInvoiceDialog.tsx`**
- Remove the "Account No." column from the editable line items if it references the default account
- Or keep it but don't pre-fill from settings

### Database
- No migration needed — the `default_account_number` column can stay in `myob_settings` (unused, has a default value)

### Files Modified
1. `src/components/settings/MyobSettings.tsx`
2. `supabase/functions/myob-auth/index.ts`
3. `supabase/functions/myob-push-invoice/index.ts`
4. `src/components/payment/MyobBatchInvoiceDialog.tsx` (if applicable)

