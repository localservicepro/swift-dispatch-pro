-- Add ready_for_pickup to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';