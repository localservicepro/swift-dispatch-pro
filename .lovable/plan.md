

## Auto-Generate Default PINs for Account Customers + Bulk Send Feature

### Overview

Add the ability to auto-generate PINs for all account customers who don't have one yet, and provide admin controls to send/resend PINs in bulk or selectively.

### Changes Required

#### 1. New Edge Function: `bulk-generate-portal-pins/index.ts`

A new edge function that accepts a list of customer IDs (or a flag for "all account customers without PINs") and:
- For each customer: generates a secure 6-digit PIN, hashes it, saves to DB
- Enables `portal_access_enabled` and `pin_enabled` if not already
- Optionally sends the PIN email to each customer
- Returns a summary of successes/failures

Parameters:
```json
{
  "customer_ids": ["uuid1", "uuid2"],  // optional - specific customers
  "all_without_pins": true,             // optional - all account customers missing PINs
  "send_emails": true                   // whether to email PINs to customers
}
```

The function reuses the same PIN generation/hashing logic from `generate-portal-pin`. It processes customers sequentially to avoid PIN collisions.

#### 2. New Component: `src/components/customer/BulkPinManagementDialog.tsx`

A dialog accessible from the Customer Management header with:
- **Stats summary**: X account customers total, Y already have PINs, Z need PINs
- **"Generate All Missing PINs" button**: auto-generates PINs for all account customers who don't have one, enables portal access, and sends emails
- **Customer table with checkboxes**: allows selecting specific customers to send/resend PINs to
- **"Send Selected" button**: generates new PINs for selected customers and emails them
- Progress indicator showing how many have been processed
- Results summary showing successes and any failures

#### 3. Update `src/components/customer/CustomerManagementHeader.tsx`

Add a new "Bulk PIN Management" button (Key icon) next to the existing buttons that opens the `BulkPinManagementDialog`.

#### 4. Update `supabase/config.toml`

Add JWT verification setting for the new edge function:
```toml
[functions.bulk-generate-portal-pins]
verify_jwt = false
```

### Technical Details

- The edge function validates the caller is an admin by checking the Authorization header
- PINs are generated using `crypto.getRandomValues()` with weak-PIN rejection (same as existing)
- Each PIN is SHA-256 hashed before storage (same as existing)
- PIN uniqueness is checked against existing hashed PINs in the DB
- Portal access (`portal_access_enabled`) is automatically enabled when a PIN is generated
- Emails are sent via the existing `send-emails` function with the `portal-pin-created` template
- The dialog fetches account customers with their PIN status to show actionable data
- A progress bar updates as each customer is processed

### Data Flow

```text
Admin clicks "Bulk PIN Management"
  -> Dialog loads account customers list with PIN status
  -> Admin clicks "Generate All" or selects specific customers
  -> Frontend calls bulk-generate-portal-pins edge function
  -> Edge function loops through customers:
     1. Generate secure PIN
     2. Hash PIN
     3. Check uniqueness
     4. Update customer record (pin, portal_access_enabled, etc.)
     5. Optionally send email
  -> Returns results summary
  -> Dialog shows success/failure counts
```

