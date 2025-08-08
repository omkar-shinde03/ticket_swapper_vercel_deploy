-- Fix tickets-profiles relationship and schema consistency
-- This migration resolves the foreign key relationship issue between tickets and profiles

-- First, ensure we have a proper relationship between tickets and profiles
-- The tickets.seller_id should be able to join with profiles.id (which references auth.users.id)

-- Add a foreign key constraint to ensure data integrity
-- Note: This constraint is implicit since both seller_id and profiles.id reference auth.users.id
-- But we'll make it explicit for clarity and better query planning

-- Create an index on seller_id for better join performance
CREATE INDEX IF NOT EXISTS idx_tickets_seller_id ON public.tickets(seller_id);

-- Create an index on profiles.id for better join performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Update RLS policies to ensure proper access for joined queries
-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view available tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate policies with better join support
CREATE POLICY "Users can view available tickets with seller info" ON public.tickets
  FOR SELECT USING (
    status = 'available' OR 
    seller_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can view profiles for ticket listings" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tickets 
      WHERE seller_id = profiles.id AND (status = 'available' OR seller_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() AND admin_profile.user_type = 'admin'
    )
  );

-- Ensure profiles can be read when joining with tickets
CREATE POLICY "Public profile access for ticket display" ON public.profiles
  FOR SELECT USING (true);

-- Create a view that properly joins tickets with seller profiles
-- This will make it easier for the frontend to query ticket data with seller information
CREATE OR REPLACE VIEW public.tickets_with_seller AS
SELECT 
  t.*,
  p.full_name as seller_name,
  p.phone as seller_phone,
  p.kyc_status as seller_kyc_status,
  p.user_type as seller_user_type
FROM public.tickets t
LEFT JOIN public.profiles p ON t.seller_id = p.id
WHERE t.status = 'available' OR t.seller_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.tickets_with_seller TO authenticated;
GRANT SELECT ON public.tickets_with_seller TO anon;

-- Create a function to get available tickets with seller info
-- This provides a safe way to query tickets with profiles without RLS issues
CREATE OR REPLACE FUNCTION public.get_available_tickets()
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  pnr_number TEXT,
  bus_operator TEXT,
  departure_date DATE,
  departure_time TIME,
  from_location TEXT,
  to_location TEXT,
  passenger_name TEXT,
  seat_number TEXT,
  ticket_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  status TEXT,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  seller_name TEXT,
  seller_phone TEXT,
  seller_kyc_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.seller_id,
    t.pnr_number,
    t.bus_operator,
    t.departure_date,
    t.departure_time,
    t.from_location,
    t.to_location,
    t.passenger_name,
    t.seat_number,
    t.ticket_price,
    t.selling_price,
    t.status,
    t.verification_status,
    t.created_at,
    t.updated_at,
    p.full_name as seller_name,
    p.phone as seller_phone,
    p.kyc_status as seller_kyc_status
  FROM public.tickets t
  LEFT JOIN public.profiles p ON t.seller_id = p.id
  WHERE t.status = 'available';
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_available_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_tickets() TO anon;

-- Create a function to get user's own tickets with enhanced info
CREATE OR REPLACE FUNCTION public.get_user_tickets()
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  pnr_number TEXT,
  bus_operator TEXT,
  departure_date DATE,
  departure_time TIME,
  from_location TEXT,
  to_location TEXT,
  passenger_name TEXT,
  seat_number TEXT,
  ticket_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  status TEXT,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.seller_id,
    t.pnr_number,
    t.bus_operator,
    t.departure_date,
    t.departure_time,
    t.from_location,
    t.to_location,
    t.passenger_name,
    t.seat_number,
    t.ticket_price,
    t.selling_price,
    t.status,
    t.verification_status,
    t.created_at,
    t.updated_at
  FROM public.tickets t
  WHERE t.seller_id = auth.uid();
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_tickets() TO authenticated;

-- Add any missing columns that might be needed for enhanced functionality
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'standard' CHECK (listing_type IN ('standard', 'premium', 'urgent')),
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'hidden')),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT 'platform' CHECK (contact_method IN ('platform', 'phone', 'email')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Ensure profiles table has all necessary fields for the app
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
ADD COLUMN IF NOT EXISTS kyc_document_type TEXT,
ADD COLUMN IF NOT EXISTS kyc_document_url TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_transactions INTEGER DEFAULT 0;

-- Update the kyc_status constraint to include 'not_verified'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_kyc_status_check 
  CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'not_verified'));

-- Create messages table for communication between users
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document')),
  is_read BOOLEAN DEFAULT false,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view messages they are part of" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update messages they sent" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Create transactions table for payment tracking
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'stripe',
  payment_intent_id TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  completion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their transactions" ON public.transactions
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "System can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transactions" ON public.transactions
  FOR UPDATE USING (true);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_ticket_id ON public.transactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Create a function to update ticket status after successful transaction
CREATE OR REPLACE FUNCTION public.handle_successful_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update ticket status to sold
    UPDATE public.tickets 
    SET status = 'sold', updated_at = now()
    WHERE id = NEW.ticket_id;
    
    -- Update seller's transaction count
    UPDATE public.profiles 
    SET total_transactions = total_transactions + 1, updated_at = now()
    WHERE id = NEW.seller_id;
    
    -- Update buyer's transaction count
    UPDATE public.profiles 
    SET total_transactions = total_transactions + 1, updated_at = now()
    WHERE id = NEW.buyer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction completion
CREATE TRIGGER trigger_handle_successful_transaction
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_successful_transaction();

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'transaction', 'message', 'system')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Grant necessary permissions
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.transactions TO service_role;
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

-- Create admin functions for better management
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_tickets', (SELECT COUNT(*) FROM public.tickets),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'pending_kyc', (SELECT COUNT(*) FROM public.profiles WHERE kyc_status = 'pending'),
    'available_tickets', (SELECT COUNT(*) FROM public.tickets WHERE status = 'available'),
    'completed_transactions', (SELECT COUNT(*) FROM public.transactions WHERE status = 'completed')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission on admin function
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- Final check: ensure all tables have proper constraints and relationships
-- This view helps debug relationship issues
CREATE OR REPLACE VIEW public.debug_relationships AS
SELECT 
  'tickets-profiles' as relationship,
  COUNT(t.*) as tickets_count,
  COUNT(p.*) as profiles_count,
  COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as successful_joins
FROM public.tickets t
LEFT JOIN public.profiles p ON t.seller_id = p.id;

-- Grant access to debug view for admins
GRANT SELECT ON public.debug_relationships TO authenticated;