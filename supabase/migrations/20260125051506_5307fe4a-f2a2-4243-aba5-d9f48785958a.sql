-- Add login_password column to babies table for parent portal access
ALTER TABLE public.babies 
ADD COLUMN login_password text;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.babies.login_password IS 'Password created by doctor during registration for parent portal access';

-- Update existing test baby or insert one for testing
UPDATE public.babies 
SET login_password = 'baby@123'
WHERE LOWER(TRIM(baby_name)) = 'poojith';

-- If no baby named Poojith exists, we'll handle the insert separately after migration