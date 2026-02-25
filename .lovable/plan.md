

## Move Contact Info on Invoice

Move the Contact Info from the bottom boxed section to the invoice details area, placing it between the "Tax Invoice No" row and the "Business Name" row, without any box border.

### Changes

#### `supabase/functions/generate-pdf-receipt/index.ts`

1. **Remove** the bottom Contact Info section (lines 710-719) — the `notes-section` containing the Contact Info box and the hidden placeholder box.

2. **Insert** contact info as plain `invoice-row` entries between the Tax Invoice No row (line 613-618) and the Business Name row (line 619-621):
   ```html
   <div class="invoice-row">
     <span class="invoice-label">Contact Name:</span>
     <span class="invoice-value">${contactName || "N/A"}</span>
   </div>
   <div class="invoice-row">
     <span class="invoice-label">Contact Phone:</span>
     <span class="invoice-value">${contactPhone || "N/A"}</span>
   </div>
   ```

This removes the bordered box and places the contact details inline with the other invoice metadata, matching the style of the existing rows.

### Files Changed
- `supabase/functions/generate-pdf-receipt/index.ts` (edge function — will need redeployment)

