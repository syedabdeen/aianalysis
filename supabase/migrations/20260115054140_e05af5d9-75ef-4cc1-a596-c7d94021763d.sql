-- Add device binding columns to users_extended table
ALTER TABLE public.users_extended 
ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS device_bound_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users_extended.device_id IS 'FingerprintJS visitorId for device binding';
COMMENT ON COLUMN public.users_extended.device_bound_at IS 'Timestamp when device was first bound to this account';
COMMENT ON COLUMN public.users_extended.device_info IS 'Additional device metadata (browser, OS, etc.)';