

## Issue: Storefront Showing Login Page on Published Domain

### Root Cause
The code is correct — `/storefront` is properly defined as a public route in `AppRoutes` (line 138 of App.tsx), outside of the `AuthenticatedApp` component. This means it should NOT require authentication.

The screenshot shows the published custom domain (`swiftdispatch.localservicepro.com.au/storefront`), which is likely running an **older version** of the code from before the storefront was added.

### Fix
**Republish the app** to push the latest code (including the `/storefront` route) to the custom domain. No code changes are needed — the routing is already correctly configured.

### Verification
After republishing, visiting `/storefront` should show the Account Number validation step (with the KeyRound icon, "Account Login" title, and the account number input field), not the login page.

