-- Enable full operational management for inventory and dispatches for authenticated users (Boss, Operators, Stores, Warehouses, Factories)

DROP POLICY IF EXISTS "inventory_balances_all" ON public.inventory_balances;
CREATE POLICY "inventory_balances_all" ON public.inventory_balances
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_movements_all" ON public.inventory_movements;
CREATE POLICY "inventory_movements_all" ON public.inventory_movements
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "dispatches_all" ON public.dispatches;
CREATE POLICY "dispatches_all" ON public.dispatches
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "dispatch_items_all" ON public.dispatch_items;
CREATE POLICY "dispatch_items_all" ON public.dispatch_items
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
