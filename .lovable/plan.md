

## Plan: Switch Google Sheets to OAuth2 (Sign in with Google)

### Overview
Replace the service account JSON approach with Google OAuth2. Admin clicks "Connect with Google" in settings, authorizes Sheets access, and tokens are stored for API calls.

### How It Works

```text
Admin clicks "Connect Google Sheets"
  → Redirected to Google OAuth consent screen
  → Grants spreadsheets access
  → Callback saves tokens to google_sheets_settings
  → Edge function uses access/refresh tokens for API calls
```

### Setup Required (by you)
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web Application)
3. Add authorized redirect URI: `https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/google-sheets-auth/callback`
4. Enable the **Google Sheets API** in your project
5. Add the Client ID and Client Secret as Supabase secrets

### Database Changes
Add columns to `google_sheets_settings`:
- `google_access_token` (text) — OAuth access token
- `google_refresh_token` (text) — OAuth refresh token
- `google_token_expires_at` (timestamptz) — token expiry

### Edge Functions

**1. `google-sheets-auth/index.ts`** (new) — OAuth flow handler
- `action: authorize` → generates Google OAuth URL with `spreadsheets` scope, redirects user
- `action: callback` → exchanges auth code for tokens, saves to DB, redirects back to settings
- `action: refresh` → refreshes expired access token using refresh token
- `action: disconnect` → clears tokens from DB

**2. `google-sheets-sync/index.ts`** (modified)
- Remove service account JWT logic (`getAccessToken` function)
- Instead, read `google_access_token` from `google_sheets_settings`
- If token expired, call refresh logic before making API calls
- Rest of sync logic (single/bulk/test) stays the same

### UI Changes

**`src/components/settings/GoogleSheetsSettings.tsx`**
- Replace description text from "Requires a service account" to "Connect with your Google account"
- Add "Connect Google Account" button (when not connected) → opens OAuth URL
- Show connected Google email when authorized
- Add "Disconnect" button
- Keep existing: Spreadsheet ID, Sheet tab name, auto-sync toggle, test connection

### Secrets Required
- `GOOGLE_SHEETS_CLIENT_ID` — OAuth Client ID
- `GOOGLE_SHEETS_CLIENT_SECRET` — OAuth Client Secret

### Files Created
1. `supabase/functions/google-sheets-auth/index.ts`

### Files Modified
1. `supabase/functions/google-sheets-sync/index.ts` — use OAuth tokens instead of service account
2. `src/components/settings/GoogleSheetsSettings.tsx` — OAuth connect/disconnect UI
3. `supabase/config.toml` — register new function
4. Database migration — add token columns to `google_sheets_settings`

### Notes
- The `GOOGLE_SERVICE_ACCOUNT_KEY` secret is no longer needed after this change
- Tokens auto-refresh before expiry — no manual re-auth needed unless revoked

