-- Disable RLS on the counters table (it's a system table, not user-specific)
ALTER TABLE public.analysis_report_counters DISABLE ROW LEVEL SECURITY;

-- Drop the unnecessary SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read counters" ON public.analysis_report_counters;