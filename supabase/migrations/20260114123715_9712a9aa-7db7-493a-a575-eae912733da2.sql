
-- Add policies for admin to manage all users
-- Note: Admin authentication is handled via static credentials, 
-- so we need service role for full access. For now, allow all authenticated users
-- to read all users (admin dashboard uses direct queries with admin check in UI)

-- Allow all authenticated users to read all user data (for admin dashboard)
CREATE POLICY "Allow read all users for dashboard" ON public.users_extended
  FOR SELECT TO authenticated
  USING (true);

-- Drop the restrictive select policy and keep the permissive one
DROP POLICY IF EXISTS "Users can read own data" ON public.users_extended;
