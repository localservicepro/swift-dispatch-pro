

## Enable Contacts management for Trade and Residential customers

### What's broken

The Contacts tab is currently only shown for **Business + Account** customers. Trade and Residential customers have no UI at all to add additional contacts, and the existing primary contact can't be edited or removed because:

1. `CustomerDialogTabs.tsx` only renders the `Contacts` tab when `entity_type === 'business' && customer_type === 'account'`.
2. `CustomerContactsManager.tsx` early-returns `null` for any `customerType !== 'account'`, and its prop type is locked to `"trade" | "account"`.
3. Even when contacts are visible, the **primary contact** has no Edit or Delete buttons (the action group is wrapped in `{!contact.is_primary_contact && ...}`), so there's no way to fix a wrong name/phone/email on the main contact.

### Fix

**1. Show the Contacts tab for every customer (any type, any entity)**
In `src/components/customer/CustomerDialogTabs.tsx`, drop the `entity_type === 'business' && customer_type === 'account'` gate. As long as the customer exists (`isEdit && customer`), show the Contacts tab. Pass `customerType` through as-is.

**2. Let the manager render for trade and residential**
In `src/components/customer/CustomerContactsManager.tsx`:
- Widen the `customerType` prop to `"residential" | "trade" | "account"`.
- Remove the `if (customerType !== 'account') return null;` early return.
- Always load contacts on mount (drop the `customerType === 'account'` check in the `useEffect`).

**3. Allow editing and deleting the primary contact too**
In the same file, move the **Edit** and **Delete** buttons out of the `{!contact.is_primary_contact && ...}` block so they always appear. Keep the **Set as Primary** (star) button gated behind `!is_primary_contact` — that one only makes sense for non-primary rows.

Add a safety guard in `handleDeleteContact`: if the contact being deleted is the primary, show a toast "Promote another contact to primary before removing this one" and abort. This prevents leaving the customer with zero primary contacts (which would break portal access lookups for account customers, and is just confusing for trade/residential).

**4. No database changes needed**
- The `customer_contacts` table already supports any customer regardless of type.
- RLS already allows admins to manage contacts for all customers (`Admins can manage customer contacts` policy with `is_current_user_admin()`).
- Drivers can already view them.

### Result

- Trade and Residential customers now have a **Contacts** tab in their edit dialog identical to the one Account customers have.
- Admin can **add** unlimited additional contacts (e.g. spouse, site manager, secondary phone) for any customer type.
- Admin can **edit** any contact, including the primary one (fix typos in name/email/phone).
- Admin can **delete** any non-primary contact freely; deleting the primary is blocked with a clear message instructing them to promote another contact first.
- Account-customer behaviour (portal-access primary contact email, set-primary RPC, etc.) is unchanged.

### Files

- `src/components/customer/CustomerDialogTabs.tsx` — relax the tab visibility condition.
- `src/components/customer/CustomerContactsManager.tsx` — widen prop type, remove non-account guards, expose Edit/Delete for primary, block primary deletion.

