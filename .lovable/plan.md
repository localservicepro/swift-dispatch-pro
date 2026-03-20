

## Plan: Tighten Phone Number Search Matching

### Problem
The `phoneSearchMatch` function in `src/utils/phoneUtils.ts` uses overly loose partial matching. It checks if the search term digits are contained anywhere in the stored number OR if the stored number digits are contained in the search term (lines 71-74). This causes unrelated customers to appear — for example, a customer whose phone shares even a few digits with the search query will match.

### Changes

**File: `src/utils/phoneUtils.ts`**

Tighten the `phoneSearchMatch` function:

1. **Remove reverse partial match** (line 74: `normalizedSearch.includes(normalizedStored)`) — a stored phone being a substring of the search term is not meaningful and causes false positives
2. **Only allow partial match from the end** — change `normalizedStored.includes(normalizedSearch)` to check that the stored number **ends with** the search digits. This supports the common use case of typing the last few digits of a phone number
3. **Require minimum 4 digits** for partial matching to avoid overly broad matches on short inputs
4. Apply the same logic to the country-code-stripped variants

### Result
Searching `04010101010` will only match customers whose phone number ends with those digits (or matches exactly), eliminating false positives from unrelated businesses.

### Files Modified
1. `src/utils/phoneUtils.ts` — tighten `phoneSearchMatch` partial matching logic

