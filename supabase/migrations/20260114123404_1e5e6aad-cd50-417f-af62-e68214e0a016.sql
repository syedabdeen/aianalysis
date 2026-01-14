
-- Create users_extended table for tracking user validity
CREATE TABLE public.users_extended (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 days')
);

-- Enable RLS
ALTER TABLE public.users_extended ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users_extended
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own data (for profile changes)
CREATE POLICY "Users can update own data" ON public.users_extended
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own record during signup
CREATE POLICY "Users can insert own data" ON public.users_extended
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to auto-insert into users_extended on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_extended()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_extended (user_id, email, username, registered_at, valid_until)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    now(),
    now() + interval '5 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_extended
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_extended();
