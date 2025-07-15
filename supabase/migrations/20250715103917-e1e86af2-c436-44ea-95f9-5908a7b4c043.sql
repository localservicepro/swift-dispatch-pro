-- Add 'back_order' status to the order_status enum
-- First, add the new status to the enum
ALTER TYPE public.order_status ADD VALUE 'back_order';

-- The enum now supports: back_order, requested, preparing, loading, en_route, delivered, cancelled