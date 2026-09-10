-- ==============================================================================
-- VERIFICATION SCRIPT: FASE 5.3 MULTI-SCOPE
-- Este script ejecuta aserciones para verificar la matriz de comunicaciones.
-- ==============================================================================

DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'RUNNING VERIFICATION FOR: can_message_roles';
    RAISE NOTICE '==================================================';

    -- 1. boss -> store = TRUE
    ASSERT public.can_message_roles(ARRAY['boss'], ARRAY['store']) = TRUE, 
        'Test failed: boss -> store should be TRUE';
        
    -- 2. boss_admin -> factory = TRUE
    ASSERT public.can_message_roles(ARRAY['boss_admin'], ARRAY['factory']) = TRUE, 
        'Test failed: boss_admin -> factory should be TRUE';
        
    -- 3. operations_admin -> warehouse = TRUE
    ASSERT public.can_message_roles(ARRAY['operations_admin'], ARRAY['warehouse']) = TRUE, 
        'Test failed: operations_admin -> warehouse should be TRUE';
        
    -- 4. factory -> store = TRUE
    ASSERT public.can_message_roles(ARRAY['factory'], ARRAY['store']) = TRUE, 
        'Test failed: factory -> store should be TRUE';
        
    -- 5. warehouse -> store = TRUE
    ASSERT public.can_message_roles(ARRAY['warehouse'], ARRAY['store']) = TRUE, 
        'Test failed: warehouse -> store should be TRUE';
        
    -- 6. store -> store = FALSE
    ASSERT public.can_message_roles(ARRAY['store'], ARRAY['store']) = FALSE, 
        'Test failed: store -> store should be FALSE';
        
    -- 7. warehouse -> warehouse = FALSE
    ASSERT public.can_message_roles(ARRAY['warehouse'], ARRAY['warehouse']) = FALSE, 
        'Test failed: warehouse -> warehouse should be FALSE';
        
    -- 8. factory -> factory = FALSE
    ASSERT public.can_message_roles(ARRAY['factory'], ARRAY['factory']) = FALSE, 
        'Test failed: factory -> factory should be FALSE';
        
    -- 9. Multi-scope: ['store','warehouse'] -> ['store'] = TRUE
    ASSERT public.can_message_roles(ARRAY['store', 'warehouse'], ARRAY['store']) = TRUE, 
        'Test failed: [store, warehouse] -> store should be TRUE';
        
    -- 10. Multi-scope: ['factory','store'] -> ['factory','store'] = TRUE
    ASSERT public.can_message_roles(ARRAY['factory', 'store'], ARRAY['factory', 'store']) = TRUE, 
        'Test failed: [factory, store] -> [factory, store] should be TRUE';

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'ALL TESTS PASSED SUCCESSFULLY!';
    RAISE NOTICE '==================================================';
END $$;
