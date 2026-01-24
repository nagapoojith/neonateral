-- Add respiration_rate column to vitals table for neonatal monitoring
ALTER TABLE public.vitals 
ADD COLUMN IF NOT EXISTS respiration_rate integer DEFAULT 40;

-- Add comment for documentation
COMMENT ON COLUMN public.vitals.respiration_rate IS 'Respiration rate in breaths per minute. Normal neonatal range: 30-60 bpm';