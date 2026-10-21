-- Migration: Support for subcategories and products link
-- Add parent_id to product_categories
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE;

-- Add subcategory_id to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON public.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);

-- Ensure authenticated users have full access to product_categories and products
GRANT ALL ON TABLE public.product_categories TO authenticated;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.inventory_balances TO authenticated;
GRANT ALL ON TABLE public.inventory_movements TO authenticated;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.account_entries TO authenticated;
GRANT ALL ON TABLE public.dispatches TO authenticated;
GRANT ALL ON TABLE public.dispatch_items TO authenticated;

-- Ensure RLS allows authenticated users to insert, update and delete
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "authenticated_manage_product_categories" ON public.product_categories;
  CREATE POLICY "authenticated_manage_product_categories" ON public.product_categories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
  DROP POLICY IF EXISTS "authenticated_manage_products" ON public.products;
  CREATE POLICY "authenticated_manage_products" ON public.products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

