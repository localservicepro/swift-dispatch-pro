

## Fix: Special Time Values (Urgent, ASAP, Anytime) Failing on Order Save

### Root Cause
The `delivery_time` column in the `orders` table is type `time without time zone`. When a user selects "Urgent", "ASAP", or "Anytime", the value `"urgent"` / `"asap"` / `"anytime"` is sent to the database, which rejects it because it cannot cast a text string to a `time` type. This causes the "Failed to update order" error.

The same issue exists for `pickup_time` which is also `time without time zone`.

### Solution
Alter both `delivery_time` and `pickup_time` columns from `time without time zone` to `text`. This allows storing both regular time values (e.g., `"07:00:00"`) and special priority values (e.g., `"urgent"`).

Then update the `formatTimeForDB` function in `useOrderFormData.ts` and the order creation service to pass special values through as-is instead of trying to convert them to HH:MM:SS format.

### Changes

#### 1. Database migration
- `ALTER TABLE orders ALTER COLUMN delivery_time TYPE text;`
- `ALTER TABLE orders ALTER COLUMN pickup_time TYPE text;`

#### 2. `src/components/order/hooks/useOrderFormData.ts`
Update `formatTimeForDB` to recognize and pass through special values (`urgent`, `asap`, `anytime`) without modification.

#### 3. `src/utils/timeFormatUtils.ts`
Update `convertTimeToFormFormat` and `convertTimeToDbFormat` to handle special string values by passing them through unchanged.

#### 4. `src/components/order/services/orderCreationService.ts`
No change needed — it already passes `delivery_time` as a string. The database column type change fixes the issue.

### Technical Detail
- Existing data (e.g., `"14:30:00"`) remains valid as text
- Database triggers using `TO_CHAR(delivery_time, 'HH12:MI AM')` will need a guard clause for non-time text values — these will be updated in the migration to handle text gracefully

