
## Fix Character Encoding for Product Names in Receipt Printing

### Problem
The product name "Richie's Mix" is displaying as "Richieâ□□s Mix" on printed receipts. This is the same encoding issue we just fixed in the account statement - Unicode characters like curly apostrophes (') are not being properly escaped for HTML rendering.

### Root Cause
Both receipt generation Edge Functions (`generate-receipt` and `generate-pdf-receipt`) have an `escapeHtmlEntities` helper function that only handles a limited set of Unicode characters (², ³, °, etc.) but **does not handle apostrophes and quote characters**.

### Solution
Update the `escapeHtmlEntities` function in both Edge Functions to:
1. Replace curly/smart apostrophes (', ') with straight apostrophe (&apos; or ')
2. Replace curly/smart quotes (", ") with straight quotes
3. Replace other commonly problematic characters

---

### Files to Modify

#### 1. `supabase/functions/generate-receipt/index.ts`

**Lines 22-32** - Update the `escapeHtmlEntities` function:

```typescript
// Before (current - only handles superscripts and math symbols)
const escapeHtmlEntities = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/²/g, '&sup2;')
    .replace(/³/g, '&sup3;')
    .replace(/°/g, '&deg;')
    .replace(/±/g, '&plusmn;')
    .replace(/×/g, '&times;')
    .replace(/÷/g, '&divide;');
};

// After (extended to handle quotes and apostrophes)
const escapeHtmlEntities = (str: string): string => {
  if (!str) return str;
  return str
    // Handle curly/smart apostrophes
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    // Handle curly/smart quotes  
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    // Handle en/em dashes
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    // Handle ellipsis
    .replace(/…/g, '...')
    // Handle superscripts and math symbols
    .replace(/²/g, '&sup2;')
    .replace(/³/g, '&sup3;')
    .replace(/°/g, '&deg;')
    .replace(/±/g, '&plusmn;')
    .replace(/×/g, '&times;')
    .replace(/÷/g, '&divide;');
};
```

#### 2. `supabase/functions/generate-pdf-receipt/index.ts`

**Lines 21-31** - Same update to the `escapeHtmlEntities` function

---

### Technical Details

The characters causing issues:
| Character | Unicode | Problem | Solution |
|-----------|---------|---------|----------|
| ' | U+2019 | Right single quote (curly apostrophe) | Replace with ' |
| ' | U+2018 | Left single quote | Replace with ' |
| " | U+201C | Left double quote | Replace with " |
| " | U+201D | Right double quote | Replace with " |
| – | U+2013 | En dash | Replace with - |
| — | U+2014 | Em dash | Replace with - |
| … | U+2026 | Ellipsis | Replace with ... |

### Deployment
After updating both files, the Edge Functions will need to be redeployed:
- `generate-receipt`
- `generate-pdf-receipt`

### Expected Result
After the fix, "Richie's Mix" will display correctly as "Richie's Mix" on all receipts.
