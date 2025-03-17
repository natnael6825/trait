-- Fix the decrement_credits function to properly handle errors
CREATE OR REPLACE FUNCTION public.decrement_credits(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits TEXT;
  credits_as_int INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits FROM public.users WHERE id = user_id;
  
  -- Convert to integer, defaulting to 0 if null
  credits_as_int := COALESCE(current_credits::INTEGER, 0);
  
  -- Check if user has enough credits
  IF credits_as_int < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Decrement credits
  UPDATE public.users
  SET credits = (credits_as_int - 1)::TEXT
  WHERE id = user_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE;
END;
$$;