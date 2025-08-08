
-- Drop existing policies that are causing infinite recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view available tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;

-- Create new simplified policies without recursion
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Tickets policies
CREATE POLICY "Users can view available tickets" ON public.tickets
  FOR SELECT USING (status = 'available' OR seller_id = auth.uid());

CREATE POLICY "Users can insert their own tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all tickets" ON public.tickets
  FOR SELECT USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all tickets" ON public.tickets
  FOR UPDATE USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete all tickets" ON public.tickets
  FOR DELETE USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Add phone number to profiles table if it doesn't exist with proper constraints
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_unique TEXT UNIQUE;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS profiles_phone_unique_idx ON public.profiles(phone_unique);

-- Update the handle_new_user function to also set phone_unique
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, phone_unique, user_type)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'phone',
    COALESCE(new.raw_user_meta_data ->> 'user_type', 'user')
  );
  RETURN new;
END;
$$;
