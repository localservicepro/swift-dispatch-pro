

## Plan: Fix Google Sheets OAuth Redirect URI Mismatch

### Problem
The redirect URI uses `?action=callback` as a query parameter, which can cause matching issues with Google OAuth. The URI must match exactly between Google Console and the code.

### Fix

**File: `supabase/functions/google-sheets-auth/index.ts`**

1. Change the redirect URI from:
   `${supabaseUrl}/functions/v1/google-sheets-auth?action=callback`
   to:
   `${supabaseUrl}/functions/v1/google-sheets-auth`

2. Update the action detection logic: if the request has a `code` or `error` query parameter, treat it as a callback. Otherwise, parse `action` from POST body as before.

### Google Console Update
After this change, update your **Authorised redirect URI** in Google Cloud Console to:
`https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/google-sheets-auth`
(remove the `?action=callback` part)

### Files Modified
1. `supabase/functions/google-sheets-auth/index.ts` — simplify redirect URI and callback detection

