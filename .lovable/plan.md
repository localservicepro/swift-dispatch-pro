
## Plan: Fix Order Phone Search to Support Progressive Prefix Matching

### Problem
The current shared phone search logic is too restrictive for order lookup:

- Typing `04` still works because it falls through to the generic text search
- Once the input looks like a phone number (`043`, `0438`, etc.), the app switches to `phoneSearchMatch()`
- `phoneSearchMatch()` currently only allows:
  - exact match, or
  - partial match from the end via `endsWith(...)`

That means searching from the start of a phone number like `0438...` stops working until the full number is entered.

### What to Change

**1. Update `src/utils/phoneUtils.ts`**
Refine `phoneSearchMatch()` so partial phone searches support:

- exact match
- prefix match from the start of the number (`startsWith`)
- suffix match from the end (`endsWith`) for last-digits lookup
- no loose middle-string matching (`includes`) to avoid false positives

Keep a minimum digit threshold for partial matching so short inputs don’t return too many unrelated results.

### Why This Fix
This keeps the earlier false-positive fix intact while restoring the expected workflow:

- `043` → matches numbers starting with `043`
- `0438` → matches numbers starting with `0438`
- full number → exact match
- last 4+ digits → still supported if staff search from the end

### Scope
Because `phoneSearchMatch()` is shared, this improvement will make phone searching behave more naturally in:
- Order Management
- Customer search flows
- Payment search flows

### Files to Modify
1. `src/utils/phoneUtils.ts` — update `phoneSearchMatch()` partial-match behavior from end-only to start-or-end matching

### Expected Result
Searching phone numbers in Orders will progressively narrow results as users type from the beginning of the phone number, instead of only matching at 2 digits or the full number.
