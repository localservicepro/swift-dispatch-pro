

## Fix: Customer Table Not Scrolling

### Problem
The `ScrollArea` wrapping the table cannot scroll because the `Table` component itself renders inside a `<div className="relative w-full overflow-auto">` wrapper (see `src/components/ui/table.tsx` line 9). This inner div handles its own overflow, preventing the outer `ScrollArea` from controlling the scroll.

### Solution

In `src/components/customer/BulkPinManagementDialog.tsx`, replace the `ScrollArea` + `Table` combination with a simple `div` that has `overflow-auto` and `max-h-[400px]`, and pass a className to the `Table` to remove its internal overflow wrapper. Alternatively, just use a plain scrollable div wrapping the table directly since `Table` already has overflow handling -- the fix is to put the height constraint on the Table's parent div.

Specifically:
- Replace `<ScrollArea className="max-h-[400px] border rounded-lg">` with `<div className="max-h-[400px] overflow-auto border rounded-lg">`
- Close with `</div>` instead of `</ScrollArea>`
- This lets the browser's native scroll work with the table, avoiding the conflict between RadixUI ScrollArea and the Table's own overflow div

### File Changed
- `src/components/customer/BulkPinManagementDialog.tsx` -- swap ScrollArea for a plain scrollable div

