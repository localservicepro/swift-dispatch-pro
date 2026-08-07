# Move truck & driver assignment to the Loading stage

Today the "Assign Truck & Driver" popup opens when an order is dragged into **Confirmed & Preparing** (only if no truck is set). It should instead open when the order moves into **Loading**.

## Behaviour after the change

- Dragging a card into **Confirmed & Preparing** just moves it — no popup, even with no truck assigned.
- Dragging a card into **Loading** without a truck/truck type opens the assignment popup. Completing it assigns truck + driver and sets the order status to **loading**.
- Cancelling the popup leaves the card where it was (unchanged behaviour).
- If the order already has a truck and truck type, moving to Loading proceeds silently.
- The card's own "Start Loading" button follows the same rule: if no truck is assigned it opens the popup instead of advancing straight through.
- Toast wording updates from "moved to preparing stage" to "moved to loading stage".

## Technical notes

- `src/components/OpportunityPipeline.tsx`
  - Drag handler: change the trigger condition from `newStage === 'preparing'` to `newStage === 'loading'`.
  - `handleAssignmentComplete`: write `status: 'loading'`, log the activity transition as `preparing -> loading`, and update the success toast text. Payment-status logic (account/COD stay pending) is left untouched.
- `src/components/opportunity/OpportunityCardActionButton.tsx`
  - When the next stage is `loading` and the order has no `truck_id`/`truck_type`, surface the assignment popup rather than calling `updateOrderStatus` directly. This needs a callback from the pipeline (passed down through `PipelineColumn` / `OpportunityCard`) so the existing dialog instance is reused.
- No database, pricing, or split-order logic changes.
