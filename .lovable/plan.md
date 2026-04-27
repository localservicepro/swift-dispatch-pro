## Improve order creation: jump between steps + save-for-later on exit

### What the team wants

1. **Edit anything from any step.** While creating an order, an operator should be able to jump back (or forward, if already visited) to any step — Customer, Products, Method, Address, Payment, etc. — to change items without clicking Back/Next repeatedly.
2. **Don't lose work on accidental close.** If the operator closes the Create Order dialog (X button, click-outside, Escape) with a draft in progress, prompt:
   - **Save for later** — keep the draft so the next "Create Order" click resumes exactly where they left off.
   - **Discard** — wipe the draft and start fresh next time.
3. **Resume on next open.** Clicking "Create Order" again with a saved draft re-opens at the same step with all fields restored. If no draft exists, it's a fresh form.

The good news: we already persist the entire form to `sessionStorage` on every change (see `useOrderFormState.ts` — `loadDraft()` / auto-save effect). The infrastructure is there; we just need to expose it in the UI.

### Changes

**1. Make `ProgressIndicator` step-clickable** (`src/components/order/ProgressIndicator.tsx`)
- Add an optional `onStepClick(step: number)` prop and a `maxReachedStep` prop.
- Render each step circle as a `<button>`. A step is clickable when it's `≤ maxReachedStep` (already visited) OR is the current step. Future un-visited steps stay disabled (so we don't skip required fields like Customer or Products).
- Add hover/focus styles + `title` ("Go to {label}").

**2. Track furthest-reached step** (`src/components/order/hooks/useOrderFormState.ts`)
- Add `maxReachedStep` state (initialised from draft, defaults to `currentStep`).
- Bump it inside `nextStep()` to `Math.max(maxReachedStep, currentStep + 1)`.
- Add a `goToStep(step)` helper that only allows `step ≤ maxReachedStep`.
- Persist `maxReachedStep` in the sessionStorage snapshot.

**3. Wire the jump into `MultiStepOrderForm`** (`src/components/order/MultiStepOrderForm.tsx`)
- Pass `onStepClick={goToStep}` and `maxReachedStep` into `<ProgressIndicator />`.
- After successful order creation, reset `maxReachedStep` to 1 along with the rest.
- Validation guard: if user clicks a later step without the prerequisites (e.g. no customer), show a toast and stay put — but in practice `maxReachedStep` already prevents this because they could only have advanced past it by satisfying the gate.

**4. Save-for-later prompt on dialog close** (`src/components/order/OrderManagementDialogs.tsx` + `MultiStepOrderForm.tsx`)
- Replace the dialog's default `onOpenChange={setIsCreating}` with an interceptor that, when closing AND a draft has meaningful content (customer selected OR cart not empty), opens a small confirm dialog instead of closing immediately.
- Confirm dialog (new lightweight `<AlertDialog>`):
  - Title: "Save this order for later?"
  - Body: "You have unsaved changes. Save your progress and resume later, or discard and start fresh next time."
  - Buttons: **Discard** (calls `clearOrderDraft()` then closes) · **Cancel** (stay in form) · **Save for later** (default; just closes — sessionStorage already holds the draft).
- Pressing Escape and clicking outside both go through the same interceptor.
- The "X" close button in `DialogContent` is part of the same `onOpenChange` flow, so it's covered automatically.

**5. Resume indicator when reopening** (`MultiStepOrderForm.tsx`)
- On mount, if a draft was rehydrated (detect via the same `hydratedFromDraft` ref already used in the hook — expose it as `hasResumedDraft`), show a small dismissible banner at the top: *"Resumed your saved order draft. [Start fresh]"* where Start fresh calls `clearOrderDraft()` and resets all state to defaults.

### Behaviour matrix

| Action | Result |
|---|---|
| On step 5, click step 2 in progress bar | Jumps straight to Products; cart preserved |
| On step 5, click step 7 (not yet reached) | Disabled, no-op |
| Close dialog with empty form | Closes immediately, no prompt |
| Close dialog with customer + cart | Prompt: Save / Discard / Cancel |
| Choose "Save for later" → reopen Create Order | Form re-mounts on the same step with all fields |
| Choose "Discard" → reopen | Fresh form at step 1 |
| Click "Start fresh" banner button | Same as Discard, without closing the dialog |
| Successful order creation | Draft cleared automatically (already does this) |

### Files

- `src/components/order/ProgressIndicator.tsx` — clickable steps, `onStepClick` + `maxReachedStep` props.
- `src/components/order/hooks/useOrderFormState.ts` — `maxReachedStep` state, `goToStep`, persisted in snapshot, expose `hasResumedDraft`.
- `src/components/order/MultiStepOrderForm.tsx` — wire up jump, resume banner, confirm-on-close handler.
- `src/components/order/OrderManagementDialogs.tsx` — intercept dialog close to show the Save-for-later AlertDialog.

### Out of scope

- Multiple named drafts — this gives one active draft per browser session (matches current sessionStorage model). If you later want multiple parallel drafts, that would need a Supabase table; happy to plan that as a follow-up.
- Drafts surviving across different browsers/devices — still session-local, same as today.
