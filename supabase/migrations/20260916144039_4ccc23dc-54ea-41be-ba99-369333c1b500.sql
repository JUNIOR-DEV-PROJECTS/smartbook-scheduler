ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 2;

UPDATE public.profiles SET credits = 2 WHERE credits IS NULL;

CREATE OR REPLACE FUNCTION public.guard_profile_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits
     AND coalesce(current_setting('app.credit_op', true), '') <> '1' THEN
    RAISE EXCEPTION 'Credits cannot be modified directly';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_credits() FROM PUBLIC;

DROP TRIGGER IF EXISTS guard_profile_credits ON public.profiles;
CREATE TRIGGER guard_profile_credits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_credits();

CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  PERFORM set_config('app.credit_op', '1', true);
  UPDATE public.profiles
     SET credits = credits - 1
   WHERE id = auth.uid() AND credits > 0
  RETURNING credits INTO remaining;
  PERFORM set_config('app.credit_op', '0', true);
  IF remaining IS NULL THEN
    RAISE EXCEPTION 'NO_CREDITS';
  END IF;
  RETURN remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO service_role;