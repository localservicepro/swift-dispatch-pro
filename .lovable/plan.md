

## Plan: Replace "Generate Invoice" Button with "Send to MYOB"

### Overview
Replace the per-order "Generate Invoice" button with a "Send to MYOB" button that opens the same `MyobBatchInvoiceDialog` pre-loaded with just that single order — reusing the existing MYOB push logic.

### Changes

**File: `src/components/PaymentManagement.tsx`**

1. **Replace the "Generate Invoice" button** (line 520-523) with a "Send to MYOB" button that:
   - Sets a temporary state for the single order to send
   - Opens `MyobBatchInvoiceDialog` with just that one order

2. **Add state** for single-order MYOB send: `singleMyobOrder` state to hold the order when clicking per-row button

3. **Add second `MyobBatchInvoiceDialog`** instance (or reuse existing one by dynamically switching between batch-selected and single-order modes)

4. **Remove `generateAndSendInvoice` function** and related `generatingInvoices` state — no longer needed since all invoicing goes through MYOB dialog

### Result
- Single order: click "Send to MYOB" → opens preview dialog with 1 order → push to MYOB
- Multiple orders: select checkboxes → "Batch Invoice to MYOB" → opens preview dialog → push to MYOB
- Same MYOB flow for both, consistent experience

