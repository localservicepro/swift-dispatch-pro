
-- Change delivery_time and pickup_time from time to text
ALTER TABLE orders ALTER COLUMN delivery_time TYPE text USING delivery_time::text;
ALTER TABLE orders ALTER COLUMN pickup_time TYPE text USING pickup_time::text;
