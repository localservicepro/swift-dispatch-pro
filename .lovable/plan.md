
## Fix customer edit validation for address + last name

### What I found
The issue is coming from multiple layers, not just one check:

1. `src/components/customer/CustomerAddressForm.tsx`
   - `full_address` is still marked `required`
   - `EnhancedAddressInput` for delivery address is also still passed `required`

2. `src/components/customer/CustomerContactForm.tsx`
   - `last_name` is still marked required for most customer types
   - the label logic still adds `*` to both first and last name

3. `src/hooks/useCustomerDialogActions.ts`
   - save validation still blocks all non-account-business customers unless both `first_name` and `last_name` are filled

4. Database constraint risk
   - `supabase/migrations/20250630173459-7676d104-c47d-4edc-86a4-b03b6c3986ce.sql` added `customers_contact_or_company_check`
   - right now it requires either:
     - `first_name + last_name + email`, or
     - business customer with `company_name`
   - so even if the UI stops requiring last name, saves can still fail at the database level unless that constraint is updated too

### Plan
1. Update customer address UI to be optional
   - Remove `required` from office/business address input
   - Remove `required` from delivery address input
   - Remove any visual wording that implies address is mandatory

2. Update customer contact UI so last name is optional
   - Remove the required marker from Last Name
   - Keep First Name required only where needed
   - Make sure business-account wording still reflects optional contact details

3. Relax save validation in `useCustomerDialogActions`
   - Stop requiring address entirely
   - Stop requiring `last_name`
   - Validate by scenario instead:
     - business entity: require valid `company_name`
     - individual entity: require `first_name`, allow empty `last_name`
   - trim values before validation so whitespace-only input does not pass

4. Fix the database constraint so edits actually save
   - Add a new migration that drops `customers_contact_or_company_check`
   - Replace it with a rule aligned to the UI:
     - business entity requires `company_name`
     - individual entity requires `first_name`
   - keep `email` optional
   - keep `last_name` optional

5. Verify affected flows
   - Edit residential customer with blank address
   - Edit trade customer with blank address
   - Save customer with first name only and no last name
   - Save business customer with company name and no personal surname
   - Confirm no native browser validation or Supabase constraint error remains

### Files to change
- `src/components/customer/CustomerAddressForm.tsx`
- `src/components/customer/CustomerContactForm.tsx`
- `src/hooks/useCustomerDialogActions.ts`
- new Supabase migration to replace `customers_contact_or_company_check`

### Technical note
I would keep this rule simple and consistent:
- `individual` customers: `first_name` required, `last_name` optional, `email` optional, address optional
- `business` customers: `company_name` required, contact/address optional
