-- Secure products table by removing public read and restricting to authenticated users only

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- Tighten the remaining read policy to authenticated users and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Customers can view active products'
  ) THEN
    ALTER POLICY "Customers can view active products" ON public.products
      USING ((auth.role() = 'authenticated') AND (is_active = true));
    ALTER POLICY "Customers can view active products" ON public.products
      RENAME TO "Authenticated users can view active products";
  ELSE
    CREATE POLICY "Authenticated users can view active products"
      ON public.products
      FOR SELECT
      USING ((auth.role() = 'authenticated') AND (is_active = true));
  END IF;
END $$;