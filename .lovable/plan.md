

## Fix: `to_char(text, unknown)` Error on Pickup "Now" Orders

### Root Cause

The database trigger `populate_order_sms_webhook` (line in the function body) calls:
```sql
TO_CHAR(NEW.delivery_time, 'HH12:MI AM')
```

But `delivery_time` is a `text` column, not a `timestamp`. `TO_CHAR()` requires a timestamp/numeric argument. This works silently when `delivery_time` is `NULL` (returns NULL), but fails when a non-null text value is passed.

When "Pick up now" is selected, the order status is set directly to `'delivered'`, which triggers the webhook function. If `delivery_time` contains any text value (even empty string `''`), `TO_CHAR` fails.

### Fix

**Database migration** — Update the `populate_order_sms_webhook` function to handle `delivery_time` as text properly. Instead of calling `TO_CHAR()` on it, just pass the text value directly (since it's already stored as text like `"07:00"`):

```sql
-- Replace:
CASE 
  WHEN NEW.delivery_time IS NOT NULL THEN TO_CHAR(NEW.delivery_time, 'HH12:MI AM')
  ELSE NULL
END

-- With:
NEW.delivery_time
```

The `delivery_time` column already stores human-readable text values (e.g., `"07:00"`, `"14:30"`), so calling `TO_CHAR` on it is both unnecessary and incorrect.

### Files Changed
- Database migration to update `populate_order_sms_webhook` function — remove the `TO_CHAR()` call and use the text value directly

