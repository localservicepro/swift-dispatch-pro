-- Phase 1A: Add 'account_customer' enum value (must be separate transaction)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'user_role' AND e.enumlabel = 'account_customer'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'account_customer';
  END IF;
END $$;