
-- Add email column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create unique constraints to prevent duplicate accounts
ALTER TABLE public.profiles ADD CONSTRAINT IF NOT EXISTS profiles_email_unique UNIQUE (email);
ALTER TABLE public.profiles ADD CONSTRAINT IF NOT EXISTS profiles_phone_unique_constraint UNIQUE (phone);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, phone_unique, user_type)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'phone',
    COALESCE(new.raw_user_meta_data ->> 'user_type', 'user')
  );
  RETURN new;
END;
$$;
