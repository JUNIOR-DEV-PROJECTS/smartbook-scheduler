
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('owner','manager','staff');
CREATE TYPE public.plan_tier AS ENUM ('starter','pro','business');
CREATE TYPE public.plan_status AS ENUM ('trialing','active','past_due','canceled');
CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','completed','cancelled','no_show');
CREATE TYPE public.notification_type AS ENUM ('confirmation','reminder','reschedule','cancellation');
CREATE TYPE public.notification_status AS ENUM ('queued','sent','failed','skipped');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- businesses
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  business_type TEXT NOT NULL DEFAULT 'salon',
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  cover_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  plan public.plan_tier NOT NULL DEFAULT 'starter',
  plan_status public.plan_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days',
  reminder_hours INTEGER NOT NULL DEFAULT 24,
  notify_confirmation BOOLEAN NOT NULL DEFAULT true,
  notify_reminder BOOLEAN NOT NULL DEFAULT true,
  notify_cancellation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- members
CREATE TABLE public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_business_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = _business_id AND m.user_id = _user_id);
$$;
CREATE OR REPLACE FUNCTION public.has_business_role(_business_id UUID, _user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = _business_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;

CREATE POLICY "members read own memberships" ON public.business_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_member(business_id, auth.uid()));
CREATE POLICY "owner creates membership" ON public.business_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "managers update membership" ON public.business_members FOR UPDATE TO authenticated
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "managers delete membership" ON public.business_members FOR DELETE TO authenticated
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

CREATE POLICY "public can view published businesses" ON public.businesses FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "members view business" ON public.businesses FOR SELECT TO authenticated
  USING (is_published = true OR public.is_member(id, auth.uid()));
CREATE POLICY "users create business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "managers update business" ON public.businesses FOR UPDATE TO authenticated
  USING (public.has_business_role(id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "owner deletes business" ON public.businesses FOR DELETE TO authenticated
  USING (public.has_business_role(id, auth.uid(), ARRAY['owner']::public.app_role[]));

-- business hours
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '17:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (business_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT SELECT ON public.business_hours TO anon;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hours" ON public.business_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "managers write hours" ON public.business_hours FOR ALL TO authenticated
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

-- services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  color TEXT NOT NULL DEFAULT '#0f766e',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "public read active services" ON public.services FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "read services" ON public.services FOR SELECT TO authenticated USING (is_active = true OR public.is_member(business_id, auth.uid()));
CREATE POLICY "managers write services" ON public.services FOR ALL TO authenticated
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

-- staff
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  color TEXT NOT NULL DEFAULT '#0d9488',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT ON public.staff TO anon;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "public read active staff" ON public.staff FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "read staff" ON public.staff FOR SELECT TO authenticated USING (is_active = true OR public.is_member(business_id, auth.uid()));
CREATE POLICY "managers write staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

CREATE TABLE public.staff_services (
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_services TO authenticated;
GRANT SELECT ON public.staff_services TO anon;
GRANT ALL ON public.staff_services TO service_role;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read staff services" ON public.staff_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "managers write staff services" ON public.staff_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.id = staff_id AND public.has_business_role(s.business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff s WHERE s.id = staff_id AND public.has_business_role(s.business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[])));

CREATE TABLE public.staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_availability TO authenticated;
GRANT SELECT ON public.staff_availability TO anon;
GRANT ALL ON public.staff_availability TO service_role;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read availability" ON public.staff_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "managers write availability" ON public.staff_availability FOR ALL TO authenticated
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

CREATE TABLE public.staff_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_time_off TO authenticated;
GRANT SELECT ON public.staff_time_off TO anon;
GRANT ALL ON public.staff_time_off TO service_role;
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read time off" ON public.staff_time_off FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "members write time off" ON public.staff_time_off FOR ALL TO authenticated
  USING (public.is_member(business_id, auth.uid())) WITH CHECK (public.is_member(business_id, auth.uid()));

-- customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  no_show_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_business_email_idx ON public.customers (business_id, lower(email)) WHERE email IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "members manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_member(business_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (public.is_member(business_id, auth.uid()));

-- appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'confirmed',
  price_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'staff',
  access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CONSTRAINT no_double_booking EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status IN ('pending','confirmed'))
);
CREATE INDEX appointments_business_start_idx ON public.appointments (business_id, starts_at);
CREATE UNIQUE INDEX appointments_token_idx ON public.appointments (access_token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "members manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_member(business_id, auth.uid()))
  WITH CHECK (public.is_member(business_id, auth.uid()));
CREATE POLICY "customers read own appointments" ON public.appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()));

-- staff time off cannot overlap appointments is handled in app logic

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status public.notification_status NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_member(business_id, auth.uid()));
CREATE POLICY "members write notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.is_member(business_id, auth.uid())) WITH CHECK (public.is_member(business_id, auth.uid()));
