

## Fix: PIN Login Fails Because Portal Access Is Not Auto-Enabled

### Root Cause

The database shows that customer Jay Tagab has `pin_enabled: true` but `portal_access_enabled: false`. The edge function logs confirm repeated failures: **"Portal access is not enabled"**.

The `generate-portal-pin` function (used for single customer PIN generation/regeneration) updates `pin_enabled` to `true` but does **not** set `portal_access_enabled` to `true`. Only the `bulk-generate-portal-pins` function sets both. So when you regenerate a PIN from the customer card, the PIN is valid but portal access remains disabled, blocking login.

### Fix

Update `supabase/functions/generate-portal-pin/index.ts` to include `portal_access_enabled: true` in the customer update (line 118-129), matching what `bulk-generate-portal-pins` already does.

```text
Current (line 120-122):
  portal_access_pin: hashedPin,
  pin_enabled: true,
  pin_created_at: ...

Fixed:
  portal_access_pin: hashedPin,
  pin_enabled: true,
  portal_access_enabled: true,   // <-- add this
  pin_created_at: ...
```

### Files Changed
- `supabase/functions/generate-portal-pin/index.ts` -- add `portal_access_enabled: true` to the customer update

