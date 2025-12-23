-- Create alert_recipients table to store multiple email recipients per baby
CREATE TABLE public.alert_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  recipient_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(baby_id, email)
);

-- Enable RLS
ALTER TABLE public.alert_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view recipients"
ON public.alert_recipients FOR SELECT
USING (true);

CREATE POLICY "Doctors can insert recipients"
ON public.alert_recipients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'senior_doctor'::app_role));

CREATE POLICY "Doctors can update recipients"
ON public.alert_recipients FOR UPDATE
USING (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'senior_doctor'::app_role));

CREATE POLICY "Doctors can delete recipients"
ON public.alert_recipients FOR DELETE
USING (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'senior_doctor'::app_role));

-- Add last_alert_sent_at column to babies table for tracking
ALTER TABLE public.babies ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE;