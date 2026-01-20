-- Add is_whitelisted column to users_extended table
ALTER TABLE public.users_extended 
ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.users_extended.is_whitelisted IS 
  'When true, user can login from any device without device binding restriction';