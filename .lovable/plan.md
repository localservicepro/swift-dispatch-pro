

## Update Invoice Footer Disclaimer Wording

### Problem
The current footer disclaimer text on printed invoices/receipts needs to be updated with new wording and a signature line added.

### Current Text
```
Delivery Times are indicative

Delivery times are not guaranteed. We take no responsibility for damage, loss or injury caused to the person or property of the customer arising out of order, delivery of goods or installation of goods, beyond the purchase price of goods delivered.
```

### New Text (per user request)
```
Delivery times are indicative only. The driver's responsibility ceases at the kerbside. Should the driver be directed to enter the property, the purchaser assumes all risk for any damage to property or personal injury.

Name ____________ Signature ____________
```

---

### Files to Modify

#### 1. `supabase/functions/generate-receipt/index.ts`

**Lines 861-867** - Update the footer HTML:

```html
<!-- Footer Disclaimer -->
<div class="footer">
  <div class="disclaimer-text">
    Delivery times are indicative only. The driver's responsibility ceases at the kerbside. Should the driver be directed to enter the property, the purchaser assumes all risk for any damage to property or personal injury.
  </div>
  <div class="signature-line">
    <span class="signature-field">Name ____________</span>
    <span class="signature-field">Signature ____________</span>
  </div>
</div>
```

**Add CSS for signature line** (around line 700):

```css
.signature-line {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 15px;
  font-size: 11px;
}
.signature-field {
  min-width: 150px;
}
```

#### 2. `supabase/functions/generate-pdf-receipt/index.ts`

**Lines 717-722** - Update the footer HTML with the same content:

```html
<div class="footer">
  <div class="disclaimer-text">
    Delivery times are indicative only. The driver's responsibility ceases at the kerbside. Should the driver be directed to enter the property, the purchaser assumes all risk for any damage to property or personal injury.
  </div>
  <div class="signature-line">
    <span class="signature-field">Name ____________</span>
    <span class="signature-field">Signature ____________</span>
  </div>
</div>
```

**Add CSS for signature line** (around line 580):

```css
.signature-line {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 15px;
  font-size: 11px;
}
.signature-field {
  min-width: 150px;
}
```

---

### Summary of Changes

| Element | Before | After |
|---------|--------|-------|
| Title | "Delivery Times are indicative" | Removed (text integrated) |
| Disclaimer text | Long liability disclaimer | New kerbside responsibility text |
| Signature | Not present | Name and Signature lines added |

### Deployment
After updating both files, the Edge Functions will need to be redeployed:
- `generate-receipt`
- `generate-pdf-receipt`

