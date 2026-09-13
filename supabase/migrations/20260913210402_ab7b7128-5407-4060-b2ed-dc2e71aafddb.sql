
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_member(_business_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = _business_id AND m.user_id = _user_id);
$$;
CREATE OR REPLACE FUNCTION private.has_business_role(_business_id UUID, _user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = _business_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_member(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_business_role(UUID, UUID, public.app_role[]) TO anon, authenticated, service_role;

DROP POLICY "members read own memberships" ON public.business_members;
DROP POLICY "owner creates membership" ON public.business_members;
DROP POLICY "managers update membership" ON public.business_members;
DROP POLICY "managers delete membership" ON public.business_members;
CREATE POLICY "members read own memberships" ON public.business_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_member(business_id, auth.uid()));
CREATE POLICY "owner creates membership" ON public.business_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "managers update membership" ON public.business_members FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "managers delete membership" ON public.business_members FOR DELETE TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

DROP POLICY "members view business" ON public.businesses;
DROP POLICY "managers update business" ON public.businesses;
DROP POLICY "owner deletes business" ON public.businesses;
CREATE POLICY "members view business" ON public.businesses FOR SELECT TO authenticated
  USING (is_published = true OR private.is_member(id, auth.uid()));
CREATE POLICY "managers update business" ON public.businesses FOR UPDATE TO authenticated
  USING (private.has_business_role(id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "owner deletes business" ON public.businesses FOR DELETE TO authenticated
  USING (private.has_business_role(id, auth.uid(), ARRAY['owner']::public.app_role[]));

DROP POLICY "managers write hours" ON public.business_hours;
CREATE POLICY "managers write hours" ON public.business_hours FOR ALL TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

DROP POLICY "read services" ON public.services;
DROP POLICY "managers write services" ON public.services;
CREATE POLICY "read services" ON public.services FOR SELECT TO authenticated USING (is_active = true OR private.is_member(business_id, auth.uid()));
CREATE POLICY "managers write services" ON public.services FOR ALL TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

DROP POLICY "read staff" ON public.staff;
DROP POLICY "managers write staff" ON public.staff;
CREATE POLICY "read staff" ON public.staff FOR SELECT TO authenticated USING (is_active = true OR private.is_member(business_id, auth.uid()));
CREATE POLICY "managers write staff" ON public.staff FOR ALL TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

DROP POLICY "managers write staff services" ON public.staff_services;
CREATE POLICY "managers write staff services" ON public.staff_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.id = staff_id AND private.has_business_role(s.business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff s WHERE s.id = staff_id AND private.has_business_role(s.business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[])));

DROP POLICY "managers write availability" ON public.staff_availability;
CREATE POLICY "managers write availability" ON public.staff_availability FOR ALL TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

DROP POLICY "members write time off" ON public.staff_time_off;
CREATE POLICY "members write time off" ON public.staff_time_off FOR ALL TO authenticated
  USING (private.is_member(business_id, auth.uid())) WITH CHECK (private.is_member(business_id, auth.uid()));

DROP POLICY "members manage customers" ON public.customers;
CREATE POLICY "members manage customers" ON public.customers FOR ALL TO authenticated
  USING (private.is_member(business_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (private.is_member(business_id, auth.uid()));

DROP POLICY "members manage appointments" ON public.appointments;
CREATE POLICY "members manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (private.is_member(business_id, auth.uid())) WITH CHECK (private.is_member(business_id, auth.uid()));

DROP POLICY "members read notifications" ON public.notifications;
DROP POLICY "members write notifications" ON public.notifications;
CREATE POLICY "members read notifications" ON public.notifications FOR SELECT TO authenticated
  USING (private.is_member(business_id, auth.uid()));
CREATE POLICY "members write notifications" ON public.notifications FOR ALL TO authenticated
  USING (private.is_member(business_id, auth.uid())) WITH CHECK (private.is_member(business_id, auth.uid()));

DROP FUNCTION IF EXISTS public.is_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.has_business_role(UUID, UUID, public.app_role[]);
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

ALTER EXTENSION btree_gist SET SCHEMA private;
