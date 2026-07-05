
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_baby_password(uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_baby_login_password() FROM PUBLIC, anon, authenticated;

REVOKE SELECT ON public.alert_acknowledgements FROM anon;
REVOKE SELECT ON public.alert_recipients FROM anon;
REVOKE SELECT ON public.alerts FROM anon;
REVOKE SELECT ON public.babies FROM anon;
REVOKE SELECT ON public.behavior_baselines FROM anon;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;
REVOKE SELECT ON public.vitals FROM anon;

REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
