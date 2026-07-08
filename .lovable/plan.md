## Plan

1. **Fix the remaining raw delivery-rate calculation**
   - Update `SplitConfigurationManager` so its “apply same address to all splits” flow uses the suburb delivery rate **with the configured delivery markup**.
   - This is the path still producing `$40` instead of `$45` when split orders are created using common/same delivery details.

2. **Keep suburb rates as the source of truth**
   - Continue fetching the selected suburb’s `delivery_rate`.
   - Apply the global delivery markup via the existing `computeFeeFromRate` helper, matching the split review edit popovers and compact split config.

3. **Prevent stale fee retention when common addresses change**
   - Ensure automatically calculated split fees are marked as non-manual (`deliveryFeeManual: false`) when the suburb-driven fee is applied.
   - Manual overrides remain protected by the existing manual flag behavior.

4. **Verify the fix**
   - Search the split-order code for any remaining `parseDeliveryRate` use in split fee creation paths.
   - Confirm split review should show Doncaster’s `$45.00` displayed rate, not the `$40.00` base rate, for each split.