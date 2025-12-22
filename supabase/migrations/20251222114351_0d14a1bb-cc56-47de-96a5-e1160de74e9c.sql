-- Add alerts_enabled column to babies table
ALTER TABLE public.babies ADD COLUMN IF NOT EXISTS alerts_enabled boolean DEFAULT true;

-- Add sleeping_position column to vitals table for tracking
ALTER TABLE public.vitals ADD COLUMN IF NOT EXISTS sleeping_position text DEFAULT 'back';

-- Add DELETE policy for babies table (only doctors can delete)
CREATE POLICY "Doctors can delete babies" 
ON public.babies 
FOR DELETE 
USING (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'senior_doctor'::app_role));

-- Add trigger reason column to alerts for tracking what caused the alert
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS trigger_reason text;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS vitals_snapshot jsonb;