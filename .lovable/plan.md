

## Plan: Make Phone Number the Only Required Field for New Customer Creation in Order Flow

### What the User Wants
Per the PDF workflow: the team types a phone number in the search bar. If no customer is found, they click "+ New Customer". The phone number should auto-populate, and they should be able to click "Create Customer" immediately with just the phone number. All other fields (name, email, address, suburb) can be filled in later as the order progresses.

### Changes

**File: `src/components/order/CustomerSearchStep.tsx`**

1. **Auto-populate phone from search query** — When the user clicks "+ New Customer", if the search query looks like a phone number (using existing `isPhoneNumber` utility), pre-fill the `phone` field in the new customer form.

2. **Change validation (lines 293-336)** — Replace the current validation logic in `createCustomer()`:
   - Only require `phone` for all non-account-business customers
   - Remove the requirement for `first_name`, `last_name`, `email`, and `full_address`
   - Keep account-business validation (company name required) as-is

3. **Update form labels** — Change the UI to reflect the new requirements:
   - Phone label: `"Phone *"` (required)
   - First Name, Last Name, Email: remove the `*` indicators and `required` attributes
   - Full Address: remove the `*` from label, remove `required` prop
   - Suburb: remove the `*` from label

4. **Update database insert (lines 338-354)** — The `full_address` field is typed as non-nullable in the interface. Set it to empty string `''` when not provided so the insert doesn't fail.

### What Stays the Same
- The Customer Management dialog (separate from order flow) keeps its current validation
- Account-business logic remains unchanged
- All fields remain visible and fillable — they're just not required anymore

### Files Modified
1. `src/components/order/CustomerSearchStep.tsx` — validation, labels, auto-populate phone from search

