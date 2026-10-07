DO $$ BEGIN
  CREATE TYPE public.billing_interval AS ENUM ('monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('none', 'active', 'pending_payment', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.businesses
  ALTER COLUMN plan_status SET DEFAULT 'none'::public.plan_status,
  ALTER COLUMN trial_ends_at DROP DEFAULT,
  ALTER COLUMN trial_ends_at DROP NOT NULL;

CREATE TABLE public.subscriptions (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan public.plan_tier,
  billing_interval public.billing_interval,
  status public.subscription_status NOT NULL DEFAULT 'none',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (private.is_member(business_id, auth.uid()));

CREATE OR REPLACE FUNCTION private.create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.subscriptions (business_id, status)
  VALUES (NEW.id, 'none')
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.create_default_subscription() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_default_subscription() TO service_role;

CREATE TRIGGER businesses_default_subscription
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION private.create_default_subscription();

CREATE TRIGGER subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();