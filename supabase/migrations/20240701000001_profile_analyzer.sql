-- Add credits column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'credits') THEN
    ALTER TABLE public.users ADD COLUMN credits TEXT DEFAULT '5';
  END IF;
END $$;

-- Create function to decrement credits
CREATE OR REPLACE FUNCTION public.decrement_credits(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET credits = GREATEST(0, (NULLIF(credits, '')::integer - 1))::text
  WHERE id = user_id;
END;
$$;

-- Enable realtime for users table
alter publication supabase_realtime add table users;
