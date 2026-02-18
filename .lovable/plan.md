

## Fix Toast Notifications Blocking UI Buttons

### The Problem
Toast notifications (like "Order Deleted") appear at the bottom of the screen and never auto-dismiss because the removal delay is set to ~16 minutes (1,000,000 milliseconds). This blocks buttons like "Continue" that are positioned at the bottom of dialogs.

### The Solution
Two changes:

1. **Reduce auto-dismiss delay** from 1,000,000ms to 5,000ms (5 seconds) -- a standard toast duration
2. **Move toast position to top-right** so it never overlaps bottom-positioned buttons

### Files to Modify

#### 1. `src/hooks/use-toast.ts` (Line 9)
- Change `TOAST_REMOVE_DELAY` from `1000000` to `5000`

#### 2. `src/components/ui/toast.tsx` (Line 17)
- Update `ToastViewport` positioning to always show at top-right instead of bottom on desktop:
  - Change from: `fixed top-0 z-[100] ... sm:bottom-0 sm:right-0 sm:top-auto ...`
  - Change to: `fixed top-0 right-0 z-[100] ... md:max-w-[420px]`

### Result
- Toasts will automatically disappear after 5 seconds
- Toasts will always appear at the top-right, never blocking bottom buttons
- Users can still swipe or click the X to dismiss early

