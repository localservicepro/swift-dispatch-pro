

## Plan: Replace Stripe Integration with MYOB in Payment Settings

### Overview
Remove the entire Stripe Integration section from the Payment Settings dialog and replace it with an inline MYOB connection status and link to the MYOB settings in the main Settings page.

### Changes

**File: `src/components/payment/PaymentSettings.tsx`**

1. **Remove Stripe section** (lines 344-466) — Delete the entire "Stripe Integration" block including mode selector, API key inputs, webhook secret, test connection button, and the Stripe dashboard link.

2. **Remove Stripe state/logic** — Remove `isTestingStripe` state, `handleTestStripeConnection` function, `getConnectionStatusIcon`, and `getConnectionStatusText` helpers. Remove Stripe-related fields from `PaymentSettingsData` interface and `formData` state.

3. **Add MYOB connection status section** — Replace the removed Stripe block with a simple MYOB status card that:
   - Fetches MYOB connection status from `myob_settings` table
   - Shows connection status badge (Connected / Not Configured)
   - Displays a note: "Configure MYOB integration in Settings > MYOB AccountRight Integration"
   - No credential fields here (those stay in the main Settings page MyobSettings component)

### What stays the same
- Tax Settings section
- Credit Card Surcharge section
- Delivery Markup section
- General Settings (currency, default delivery fee)
- Save/Cancel buttons
- The `payment_settings` table columns remain unchanged (Stripe columns stay in DB but are unused in UI)

### Files Modified
1. `src/components/payment/PaymentSettings.tsx` — remove Stripe UI, add MYOB status indicator

