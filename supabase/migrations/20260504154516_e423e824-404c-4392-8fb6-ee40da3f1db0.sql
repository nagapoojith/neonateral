
-- 1. Restrict vitals SELECT to medical staff
DROP POLICY IF EXISTS "Authenticated users can view vitals" ON public.vitals;
CREATE POLICY "Medical staff can view vitals"
ON public.vitals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 2. Restrict vitals INSERT to medical staff (no more arbitrary inserts)
DROP POLICY IF EXISTS "Authenticated users can insert vitals" ON public.vitals;
CREATE POLICY "Medical staff can insert vitals"
ON public.vitals FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 3. Restrict alerts insert/update to medical staff
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
CREATE POLICY "Medical staff can insert alerts"
ON public.alerts FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
CREATE POLICY "Medical staff can update alerts"
ON public.alerts FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 4. Restrict behavior_baselines insert/update to medical staff
DROP POLICY IF EXISTS "Authenticated users can insert baselines" ON public.behavior_baselines;
CREATE POLICY "Medical staff can insert baselines"
ON public.behavior_baselines FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users can update baselines" ON public.behavior_baselines;
CREATE POLICY "Medical staff can update baselines"
ON public.behavior_baselines FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 5. Tighten alert_recipients SELECT to authenticated only
DROP POLICY IF EXISTS "Authenticated users can view recipients" ON public.alert_recipients;
CREATE POLICY "Authenticated medical staff can view recipients"
ON public.alert_recipients FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 6. Prevent privilege escalation: users may only self-assign 'nurse' role
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can self-assign nurse role only"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'nurse'::app_role);

-- 7. Update signup trigger to auto-assign default nurse role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'), new.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'nurse'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Explicit deny-delete policies for medical records (audit/compliance)
CREATE POLICY "No deletion of vitals" ON public.vitals
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No deletion of alerts" ON public.alerts
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No deletion of baselines" ON public.behavior_baselines
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No deletion of acknowledgements" ON public.alert_acknowledgements
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No deletion of profiles" ON public.profiles
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No deletion of user_roles" ON public.user_roles
FOR DELETE TO authenticated USING (false);
