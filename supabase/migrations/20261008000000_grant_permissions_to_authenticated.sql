-- Grant full table permissions to authenticated role for all inventory, dispatch and sales tables

GRANT ALL ON TABLE public.inventory_balances TO authenticated;
GRANT ALL ON TABLE public.inventory_movements TO authenticated;
GRANT ALL ON TABLE public.dispatches TO authenticated;
GRANT ALL ON TABLE public.dispatch_items TO authenticated;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.product_categories TO authenticated;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.account_entries TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
