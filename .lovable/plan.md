# Disable Stray Text Caret on Non-Editable Text Across the Entire App

## Problem
Clicking on any plain text in the system (headings, labels, greetings like "Good evening, Jay", step labels, table cells, card titles, descriptive copy, etc.) shows a blinking text caret (`|`) as if the user can type into it. The caret should appear ONLY in real input fields (text inputs, textareas, search boxes, contenteditable areas).

## Fix — Global, One-Line Solution
Apply a global CSS rule that disables text selection (and therefore the stray caret) on the entire app by default, then re-enable selection only on actual form controls and content areas where users legitimately need to copy text.

### File to update

**`src/index.css`** — add a global rule near the existing `@layer base` block:

```css
@layer base {
  /* Disable text selection / caret on UI chrome by default */
  html, body {
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
  }

  /* Re-enable selection + native caret on real input surfaces */
  input,
  textarea,
  select,
  [contenteditable="true"],
  [contenteditable=""] {
    -webkit-user-select: text;
    user-select: text;
    cursor: text;
  }

  /* Buttons keep pointer cursor */
  button,
  [role="button"],
  a {
    cursor: pointer;
  }

  /* Allow users to select important data (order numbers, addresses,
     phone numbers, emails, invoice text, receipts) when needed */
  .selectable,
  .user-select-text {
    -webkit-user-select: text;
    user-select: text;
    cursor: text;
  }
}
```

### Why this approach
- **One change, system-wide** — covers Dashboard ("Good evening, Jay"), Order creation, Customer pages, Driver portal, Settings, every page automatically.
- **Native form behavior preserved** — inputs/textareas/selects/contenteditable still get a blinking caret and full text selection.
- **Buttons & links** keep `cursor: pointer`.
- **Escape hatch** — any element that should remain selectable (e.g., an order number a user needs to copy) can opt-in with `className="selectable"`.

### Verification
After the change, verify:
1. Dashboard "Good evening, Jay" — clicking shows no caret.
2. Order creation "Delivery Address & Schedule" heading — no caret.
3. Address input field — caret blinks normally, typing works.
4. Suburb dropdown, date picker, time selector — all still interactive.
5. Buttons across the app — pointer cursor, click works.
6. Customer/order details pages — labels are not selectable, but inputs are.
7. Driver portal cards — text is not selectable, action buttons still work.

### Optional follow-up (not required)
If the team later wants specific text (order numbers, customer phone, address strings) to be copyable, add `className="selectable"` to those specific spans. We can do this on request — no need upfront.

### Files touched
- `src/index.css` (single addition inside `@layer base`)

No component files need changes.
