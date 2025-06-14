
-- Enable real-time for the orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add the orders table to the real-time publication
ALTER publication supabase_realtime ADD TABLE public.orders;
