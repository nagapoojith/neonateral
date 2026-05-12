
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. babies: restrict SELECT to medical staff
DROP POLICY IF EXISTS "Authenticated users can view babies" ON public.babies;
CREATE POLICY "Medical staff can view babies"
ON public.babies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 2. babies.login_password: hash any plaintext values still present
UPDATE public.babies
SET login_password = crypt(login_password, gen_salt('bf'))
WHERE login_password IS NOT NULL
  AND login_password NOT LIKE '$2%';

-- 3. profiles: restrict SELECT to own row
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. alerts: restrict SELECT to medical staff
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Medical staff can view alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 5. alert_acknowledgements: restrict SELECT to medical staff
DROP POLICY IF EXISTS "Authenticated users can view acknowledgements" ON public.alert_acknowledgements;
CREATE POLICY "Medical staff can view acknowledgements"
ON public.alert_acknowledgements
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 6. user_roles: drop self-assignment (signup trigger handles initial nurse role)
DROP POLICY IF EXISTS "Users can self-assign nurse role only" ON public.user_roles;

-- 7. behavior_baselines: also restrict SELECT to medical staff (was USING true)
DROP POLICY IF EXISTS "Authenticated users can view baselines" ON public.behavior_baselines;
CREATE POLICY "Medical staff can view baselines"
ON public.behavior_baselines
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  OR public.has_role(auth.uid(), 'nurse'::app_role)
  OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
);

-- 8. Storage: restrict health-records bucket to medical staff only
DROP POLICY IF EXISTS "Authenticated users can upload health records" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view health records" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can download health records" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can delete health records" ON storage.objects;

CREATE POLICY "Medical staff can upload health records"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'health-records'
  AND (
    public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'nurse'::app_role)
    OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
  )
);

CREATE POLICY "Medical staff can view health records"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'health-records'
  AND (
    public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'nurse'::app_role)
    OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
  )
);

CREATE POLICY "Medical staff can delete health records"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'health-records'
  AND (
    public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'senior_doctor'::app_role)
  )
);
