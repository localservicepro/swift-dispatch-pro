-- Add stop_credit column to customers table
ALTER TABLE public.customers ADD COLUMN stop_credit BOOLEAN NOT NULL DEFAULT FALSE;