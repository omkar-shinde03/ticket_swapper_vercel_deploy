-- Comprehensive schema setup for ticket marketplace
-- This migration creates all necessary tables, relationships, and functions

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'admin')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'approved', 'rejected')),
  email_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pnr_number TEXT NOT NULL,
  bus_operator TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'cancelled', 'expired')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create messages table for buyer-seller communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'stripe',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'ticket', 'payment', 'kyc', 'message')),
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create kyc_documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhar', 'pan', 'passport', 'driving_license')),
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket_documents table
CREATE TABLE IF NOT EXISTS public.ticket_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_type TEXT DEFAULT 'ticket' CHECK (document_type IN ('ticket', 'receipt', 'id_proof')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create video_calls table for video KYC
CREATE TABLE IF NOT EXISTS public.video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  call_status TEXT DEFAULT 'scheduled' CHECK (call_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  call_notes TEXT,
  verification_result TEXT CHECK (verification_result IN ('approved', 'rejected', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for tickets
CREATE POLICY "Anyone can view available tickets" ON public.tickets
  FOR SELECT USING (status = 'available' OR seller_id = auth.uid());

CREATE POLICY "Users can insert own tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = seller_id);

-- RLS Policies for messages
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for KYC documents
CREATE POLICY "Users can view own KYC documents" ON public.kyc_documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own KYC documents" ON public.kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ticket documents
CREATE POLICY "Users can view related ticket documents" ON public.ticket_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets 
      WHERE tickets.id = ticket_documents.ticket_id 
      AND (tickets.seller_id = auth.uid() OR tickets.status = 'available')
    )
  );

-- RLS Policies for video calls
CREATE POLICY "Users can view own video calls" ON public.video_calls
  FOR SELECT USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_seller_id ON public.tickets(seller_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_departure_date ON public.tickets(departure_date);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_available_tickets()
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
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ,
  seller_name TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    t.*,
    p.full_name as seller_name
  FROM public.tickets t
  JOIN public.profiles p ON t.seller_id = p.id
  WHERE t.status = 'available' 
    AND t.verification_status = 'verified'
    AND t.departure_date >= CURRENT_DATE
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_user_tickets(user_uuid UUID)
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
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT t.*
  FROM public.tickets t
  WHERE t.seller_id = user_uuid
  ORDER BY t.created_at DESC;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'general',
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (p_user_id, p_title, p_message, p_type, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications 
  SET read = true 
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();