-- Add API verification columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS api_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS api_provider TEXT,
ADD COLUMN IF NOT EXISTS verification_confidence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_data JSONB;

-- Create index for verification queries
CREATE INDEX IF NOT EXISTS idx_tickets_verification_status ON public.tickets(verification_status);
CREATE INDEX IF NOT EXISTS idx_tickets_api_verified ON public.tickets(api_verified);

-- Update the get_available_tickets function to include verification info
DROP FUNCTION IF EXISTS public.get_available_tickets();

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
  api_verified BOOLEAN,
  api_provider TEXT,
  verification_confidence INTEGER,
  verified_at TIMESTAMPTZ,
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ,
  seller_name TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
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
    t.api_verified,
    t.api_provider,
    t.verification_confidence,
    t.verified_at,
    t.ticket_image_url,
    t.created_at,
    p.full_name as seller_name
  FROM public.tickets t
  JOIN public.profiles p ON t.seller_id = p.id
  WHERE t.status = 'available' 
    AND t.departure_date >= CURRENT_DATE
  ORDER BY t.verification_status DESC, t.created_at DESC;
$$;

-- Update get_user_tickets function
DROP FUNCTION IF EXISTS public.get_user_tickets(UUID);

CREATE OR REPLACE FUNCTION public.get_user_tickets(user_uuid UUID)
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
  api_verified BOOLEAN,
  api_provider TEXT,
  verification_confidence INTEGER,
  verified_at TIMESTAMPTZ,
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
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
    t.api_verified,
    t.api_provider,
    t.verification_confidence,
    t.verified_at,
    t.ticket_image_url,
    t.created_at
  FROM public.tickets t
  WHERE t.seller_id = user_uuid
  ORDER BY t.created_at DESC;
$$;