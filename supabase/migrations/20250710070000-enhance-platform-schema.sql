-- Enhanced schema for ticket marketplace platform

-- Add missing columns to tickets table
ALTER TABLE IF EXISTS tickets 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'standard' CHECK (listing_type IN ('standard', 'premium', 'urgent')),
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'hidden')),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 5.0;

-- Create enhanced user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'not_required')),
  kyc_document_type TEXT,
  kyc_document_url TEXT,
  profile_image_url TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  successful_sales INTEGER DEFAULT 0,
  successful_purchases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reviews and ratings table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  transaction_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_type TEXT DEFAULT 'transaction' CHECK (review_type IN ('transaction', 'communication', 'general')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, reviewed_user_id, ticket_id)
);

-- Create platform analytics table
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_tickets INTEGER DEFAULT 0,
  new_tickets INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  platform_fees DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
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

-- Create enhanced transactions table
CREATE TABLE IF NOT EXISTS enhanced_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'stripe',
  payment_intent_id TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  escrow_status TEXT DEFAULT 'none' CHECK (escrow_status IN ('none', 'held', 'released', 'disputed')),
  completion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'payment', 'dispute', 'account')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public profiles visible for rating" ON user_profiles
  FOR SELECT USING (true);

-- RLS Policies for reviews
CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (reviewer_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for enhanced_transactions
CREATE POLICY "Users can view their transactions" ON enhanced_transactions
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own support tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create support tickets" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own support tickets" ON support_tickets
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_ticket_id ON reviews(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_buyer_id ON enhanced_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_seller_id ON enhanced_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_status ON enhanced_transactions(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Create functions for automatic rating calculation
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM reviews 
    WHERE reviewed_user_id = NEW.reviewed_user_id
  ),
  updated_at = now()
  WHERE user_id = NEW.reviewed_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic rating updates
DROP TRIGGER IF EXISTS trigger_update_user_rating ON reviews;
CREATE TRIGGER trigger_update_user_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Create function for platform analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS void AS $$
BEGIN
  INSERT INTO platform_analytics (
    date,
    total_users,
    new_users,
    total_tickets,
    new_tickets,
    total_transactions,
    successful_transactions,
    total_revenue,
    platform_fees
  )
  SELECT 
    CURRENT_DATE,
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM auth.users WHERE DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM tickets),
    (SELECT COUNT(*) FROM tickets WHERE DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM enhanced_transactions),
    (SELECT COUNT(*) FROM enhanced_transactions WHERE status = 'completed'),
    (SELECT COALESCE(SUM(amount), 0) FROM enhanced_transactions WHERE status = 'completed'),
    (SELECT COALESCE(SUM(platform_fee), 0) FROM enhanced_transactions WHERE status = 'completed')
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    total_tickets = EXCLUDED.total_tickets,
    new_tickets = EXCLUDED.new_tickets,
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    total_revenue = EXCLUDED.total_revenue,
    platform_fees = EXCLUDED.platform_fees;
END;
$$ LANGUAGE plpgsql;