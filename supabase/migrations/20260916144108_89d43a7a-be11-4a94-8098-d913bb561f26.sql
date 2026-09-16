DROP TRIGGER IF EXISTS guard_profile_credits ON public.profiles;
DROP FUNCTION IF EXISTS public.consume_credit();
DROP FUNCTION IF EXISTS public.guard_profile_credits();

CREATE OR REPLACE FUNCTION private.guard_profile_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits > OLD.credits THEN
    RAISE EXCEPTION 'Credit balance cannot be increased';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_profile_credits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.guard_profile_credits();