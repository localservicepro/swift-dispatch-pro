

## Restructure Storefront: Browse First, Account at Checkout

### What changes
The storefront currently requires account number validation upfront before showing any products. Instead, it should work like a typical e-commerce store: products are browsable immediately, and the account number is only requested when the customer proceeds to checkout.

### How

**1. Modify `Storefront.tsx`**
- Remove the conditional gate that blocks product browsing behind `AccountNumberStep`
- Show `StorefrontProductBrowser` directly on load (no account needed)
- Manage cart state at the page level
- When user clicks "Proceed to Checkout" from the product browser, show the `AccountNumberStep` inline
- After account validation, continue to the delivery/review steps in `StorefrontOrderFlow`

**2. Modify `StorefrontProductBrowser.tsx`**
- Change the "Next" button label to "Proceed to Checkout"
- The `onBack` prop becomes unnecessary at this step (it's the landing view)

**3. Modify `StorefrontOrderFlow.tsx`**
- Remove step 1 (product browsing) since products are already selected before account validation
- Start directly at delivery method selection (current step 2)
- Cart is passed in as a prop (already selected)
- Still requires `customer` and `accountNumber` props (validated before this component renders)

**4. Modify `AccountNumberStep.tsx`**
- No structural changes needed — it already works as a standalone validation step
- Minor: update subtitle text from "Enter your account number to start ordering" → "Enter your account number to complete your order"

### Flow after changes

```text
/storefront
  ├── Browse Products & Build Cart (no account needed)
  ├── "Proceed to Checkout" → Account Number Validation
  ├── Delivery/Pickup Method Selection
  ├── Notes & Review
  └── Submit Order
```

### Files modified
- `src/pages/Storefront.tsx` — lift cart state up, restructure flow
- `src/components/storefront/StorefrontOrderFlow.tsx` — remove product step, start at delivery
- `src/components/storefront/StorefrontProductBrowser.tsx` — update button label
- `src/components/storefront/AccountNumberStep.tsx` — update subtitle text

