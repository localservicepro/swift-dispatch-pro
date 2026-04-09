
-- Allow anon users to read active products (for storefront browsing)
CREATE POLICY "Anon can view active products"
ON public.products
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anon users to read active product categories
CREATE POLICY "Anon can view active categories"
ON public.product_categories
FOR SELECT
TO anon
USING (is_active = true);
