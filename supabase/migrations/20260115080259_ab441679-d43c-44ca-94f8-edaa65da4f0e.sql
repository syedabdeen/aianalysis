-- Create analysis_reports table for storing offer and market analysis reports
CREATE TABLE public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sequence_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('market', 'offer')),
  title TEXT NOT NULL,
  input_summary TEXT,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.analysis_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own reports
CREATE POLICY "Users can create their own reports"
  ON public.analysis_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
  ON public.analysis_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.analysis_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_analysis_reports_user_id ON public.analysis_reports(user_id);
CREATE INDEX idx_analysis_reports_type ON public.analysis_reports(type);
CREATE INDEX idx_analysis_reports_created_at ON public.analysis_reports(created_at DESC);

-- Create sequence counter table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.analysis_report_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL UNIQUE,
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on counters
ALTER TABLE public.analysis_report_counters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read counters
CREATE POLICY "Authenticated users can read counters"
  ON public.analysis_report_counters FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Function to generate sequence numbers
CREATE OR REPLACE FUNCTION public.get_analysis_report_sequence(_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current INTEGER;
  _prefix TEXT;
  _year TEXT;
  _counter_key TEXT;
  _result TEXT;
BEGIN
  _prefix := CASE WHEN _type = 'market' THEN 'MA' ELSE 'OA' END;
  _year := EXTRACT(YEAR FROM now())::TEXT;
  _counter_key := _prefix || '-' || _year;
  
  -- Get and increment the counter for this type and year
  UPDATE public.analysis_report_counters
  SET current_value = current_value + 1,
      updated_at = now()
  WHERE prefix = _counter_key
  RETURNING current_value INTO _current;
  
  -- If no counter exists for this year, create one
  IF _current IS NULL THEN
    INSERT INTO public.analysis_report_counters (prefix, current_value)
    VALUES (_counter_key, 1)
    ON CONFLICT (prefix) DO UPDATE SET 
      current_value = analysis_report_counters.current_value + 1,
      updated_at = now()
    RETURNING current_value INTO _current;
  END IF;
  
  -- Format: OA-2026-0001 or MA-2026-0001
  _result := _prefix || '-' || _year || '-' || lpad(_current::TEXT, 4, '0');
  
  RETURN _result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_analysis_report_sequence(text) TO authenticated;