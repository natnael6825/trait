-- Create profile_analyses table if it doesn't exist
CREATE TABLE IF NOT EXISTS profile_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  headline TEXT,
  profile_picture TEXT,
  url TEXT,
  summary TEXT,
  strengths TEXT[],
  suggestions TEXT[],
  keywords TEXT[],
  profile_data JSONB,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime
alter publication supabase_realtime add table profile_analyses;

-- Create RPC function to decrement credits
CREATE OR REPLACE FUNCTION decrement_credits(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET credits = GREATEST(0, (credits::integer - 1)::text)
  WHERE id = user_id;
END;
$$;
