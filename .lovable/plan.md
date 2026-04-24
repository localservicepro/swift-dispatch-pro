

## Enable Primary Contact for Trade & Residential customers (no email required)

### What's broken

1. **Hard error from DB**: `set_primary_contact()` RPC throws `Only account customers can have multiple contacts with primary designation` whenever a Trade or Residential customer tries to promote a contact — that's the red error in the screenshot.
2. **Email required guard**: `CustomerContactsManager.handleSetPrimaryContact` blocks the action when the contact has no email, and the star button is `disabled={!contact.email}`. That rule only makes sense for Account customers (portal access). Trade/Residential customers don't use the portal, so email shouldn't be mandatory.

### The fix

**1. Database — relax `set_primary_contact` (migration)**

Drop the `v_customer_type <> 'account'` block in `public.set_primary_contact`. Trade and Residential customers are now allowed to designate a primary contact. Keep all other guards (admin/account-customer authorization, contact-belongs-to-customer check, unset previous primary, activity log).

**2. Client — `src/components/customer/CustomerContactsManager.tsx`**

- Remove the "Email required" toast in `handleSetPrimaryContact` and the `disabled={!contact.email}` on the star button **for non-account customers**. For `customerType === 'account'`, keep the email requirement (portal access depends on it).
- Tooltip on the star button updates accordingly: "Set as Primary" for Trade/Residential; for Account, keep "Email required for portal access" when email is missing.

### Behaviour after fix

| Customer type | Promote primary without email | Portal-access guard |
|---|---|---|
| Residential | ✅ Allowed | n/a |
| Trade | ✅ Allowed | n/a |
| Account | ❌ Still requires email | Unchanged |

### Files

- New migration: relax `public.set_primary_contact` to allow all customer types.
- `src/components/customer/CustomerContactsManager.tsx`: gate the email requirement on `customerType === 'account'` only.

### Note on "all account-customer settings for Trade/Residential"

The Contacts tab itself is already exposed for Trade/Residential (previous fix). The only remaining account-only behaviour was this primary-contact restriction — that's exactly what this change removes. No other Account-only settings (portal access, store, PIN, credit terms) are intended to be enabled for Trade/Residential; if you want any of those too, tell me which and I'll add them.

