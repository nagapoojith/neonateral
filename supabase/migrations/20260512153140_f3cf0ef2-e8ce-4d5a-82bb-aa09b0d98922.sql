
CREATE OR REPLACE FUNCTION public.verify_baby_password(_baby_ids uuid[], _password text)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT b.id
  FROM public.babies b
  WHERE b.id = ANY(_baby_ids)
    AND b.login_password IS NOT NULL
    AND b.login_password = crypt(_password, b.login_password)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.verify_baby_password(uuid[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_baby_password(uuid[], text) TO service_role;

-- Ensure new/updated login_password values are hashed automatically
CREATE OR REPLACE FUNCTION public.hash_baby_login_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.login_password IS NOT NULL AND NEW.login_password !~ '^\$2[aby]\$' THEN
    NEW.login_password := crypt(NEW.login_password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS babies_hash_login_password ON public.babies;
CREATE TRIGGER babies_hash_login_password
BEFORE INSERT OR UPDATE OF login_password ON public.babies
FOR EACH ROW
EXECUTE FUNCTION public.hash_baby_login_password();
