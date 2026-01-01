ALTER TABLE public.alert_recipients ADD COLUMN IF NOT EXISTS mobile_number text;

COMMENT ON COLUMN public.alert_recipients.mobile_number IS 'Mobile number for SMS alerts (10-digit Indian mobile number)';