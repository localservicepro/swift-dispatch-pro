

## Modern Storefront Redesign with Enhanced Checkout

### Overview
Redesign the storefront with a modern e-commerce look, add contact details collection at checkout, integrate Google address autocomplete for delivery, and auto-match suburbs for delivery fee calculation.

### Visual Redesign

**Product Browser (`StorefrontProductBrowser.tsx`)**
- Hero banner with gradient background and store branding
- Product cards with image placeholders, hover effects, and shadow transitions
- Category pills/chips instead of dropdown for filtering
- Floating cart drawer/sidebar instead of bottom bar
- Quantity stepper with modern rounded pill design
- Empty state with illustration

**Checkout Flow (`StorefrontOrderFlow.tsx`) - Complete rewrite**
- Modern single-page checkout layout with two columns on desktop: left = form sections, right = sticky order summary
- Collapsible accordion sections for each step instead of multi-page wizard
- Steps consolidated into:
  1. Contact Details (name, phone, email)
  2. Delivery Method (delivery/pickup toggle cards)
  3. Delivery Address (Google autocomplete + auto suburb matching) -- only if delivery
  4. Schedule (date/time)
  5. Order Notes (optional)
- Right sidebar: live-updating order summary with product list, subtotal, delivery fee, total
- Modern "Place Order" button at bottom of summary

**Account Number Step (`AccountNumberStep.tsx`)**
- Sleeker design with subtle animation
- Inline within checkout flow rather than full-page takeover

**Page Layout (`Storefront.tsx`)**
- Modern header with subtle gradient or clean white with shadow
- Better max-width and spacing

### Functional Changes

**Contact Details Collection**
- Add fields: contact name, phone, email
- Pass these to `storefront-create-order` edge function
- Edge function stores them as `contact_name`, `contact_phone`, `contact_email` on the order

**Google Address Autocomplete for Delivery**
- Reuse existing `EnhancedAddressInput` component for delivery address
- On address selection, extract postcode and auto-match to a suburb from the `suburbs` table
- Auto-calculate delivery fee based on matched suburb's `delivery_rate`
- Show delivery fee in order summary

**Suburb Auto-Matching**
- When address is selected via Google autocomplete, extract postcode
- Query `suburbs` table (needs anon RLS policy) to find matching suburb
- Auto-populate suburb and delivery fee
- Allow manual suburb override via `SuburbSelector`

### Database Changes
- Add RLS SELECT policy on `suburbs` for `anon` role (active suburbs only) -- needed for storefront to query suburbs without auth

### Edge Function Update (`storefront-create-order`)
- Accept new fields: `contact_name`, `contact_phone`, `contact_email`, `delivery_fee`
- Store contact info and delivery fee on the created order

### Files Modified
- `src/pages/Storefront.tsx` -- modern layout, gradient header
- `src/components/storefront/StorefrontProductBrowser.tsx` -- modern product grid, category chips, floating cart
- `src/components/storefront/StorefrontOrderFlow.tsx` -- complete rewrite with two-column checkout, contact fields, Google address, suburb matching
- `src/components/storefront/AccountNumberStep.tsx` -- sleeker inline design
- `supabase/functions/storefront-create-order/index.ts` -- accept contact info + delivery fee
- New migration: anon SELECT policy on `suburbs`

