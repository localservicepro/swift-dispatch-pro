

## Fix Account Statement: Remove "STATEMENT" from Title & Fix Address

### Changes

**File: `supabase/functions/generate-account-statement/index.ts`**

1. Change the title from `MONTHLY ACCOUNT STATEMENT` to `MONTHLY ACCOUNT` (remove "STATEMENT")
2. Change the default business address from `"680 Canterbury Rd, Surrey Hills, 3127"` to `"680 Canterbury Road, Surrey Hills Vic. 3127"`

