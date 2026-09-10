-- 20260910000000_opk_consumption_trigger.sql
-- Enforces consumption invariants for One-Time Pre-Keys

CREATE OR REPLACE FUNCTION public.trg_enforce_opk_consumption()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If it was already consumed
  IF OLD.consumed = true THEN
    -- Prevent reverting consumed status
    IF NEW.consumed = false THEN
      RAISE EXCEPTION 'Cannot revert a consumed One-Time Pre-Key (OPK).';
    END IF;
    
    -- Prevent modifying consumed_at once it's set
    IF NEW.consumed_at IS DISTINCT FROM OLD.consumed_at THEN
      RAISE EXCEPTION 'Cannot modify consumed_at timestamp of an already consumed One-Time Pre-Key (OPK).';
    END IF;
  END IF;

  -- If it's being consumed right now
  IF OLD.consumed = false AND NEW.consumed = true THEN
    -- Ensure consumed_at is set
    IF NEW.consumed_at IS NULL THEN
      NEW.consumed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set correct permissions for the function
REVOKE ALL ON FUNCTION public.trg_enforce_opk_consumption() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_enforce_opk_consumption() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_enforce_opk_consumption() TO service_role;

DROP TRIGGER IF EXISTS enforce_opk_consumption ON public.one_time_pre_keys;

CREATE TRIGGER enforce_opk_consumption
  BEFORE UPDATE ON public.one_time_pre_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_opk_consumption();
