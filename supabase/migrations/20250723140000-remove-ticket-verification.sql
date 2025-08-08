-- Remove ticket verification functionality
-- Drop verification_status column from tickets table
ALTER TABLE public.tickets DROP COLUMN IF EXISTS verification_status;

-- Update the get_available_tickets function to remove verification filter
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
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ,
  seller_name TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT t.*, p.full_name as seller_name
  FROM public.tickets t
  JOIN public.profiles p ON t.seller_id = p.id
  WHERE t.status = 'available' 
    AND t.departure_date >= CURRENT_DATE
  ORDER BY t.created_at DESC;
$$;

-- Update the get_user_tickets function to remove verification_status
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
  ticket_image_url TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT t.*
  FROM public.tickets t
  WHERE t.seller_id = user_uuid;
$$;

-- Remove verification_status from user_documents table as well
ALTER TABLE public.user_documents DROP COLUMN IF EXISTS verification_status;
ALTER TABLE public.user_documents DROP COLUMN IF EXISTS verified_at;
ALTER TABLE public.user_documents DROP COLUMN IF EXISTS verification_notes;