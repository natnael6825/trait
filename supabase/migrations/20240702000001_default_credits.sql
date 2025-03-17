-- Add default credits to users table
ALTER TABLE public.users ALTER COLUMN credits SET DEFAULT '2';

-- Update existing users with null credits to have 2 credits
UPDATE public.users SET credits = '2' WHERE credits IS NULL;

-- Create a trigger to automatically add credits to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, user_id, token_identifier, credits)
  VALUES (NEW.id, NEW.email, NEW.id, NEW.id, '2');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for subscriptions table
alter publication supabase_realtime add table subscriptions;
