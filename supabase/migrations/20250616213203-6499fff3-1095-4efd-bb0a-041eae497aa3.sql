
-- Add 'requested' status to the order_status enum
ALTER TYPE order_status ADD VALUE 'requested' BEFORE 'preparing';
