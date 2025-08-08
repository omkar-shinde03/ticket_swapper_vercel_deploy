-- Add Razorpay escrow payment system columns to enhanced_transactions table

-- Add Razorpay-specific columns
ALTER TABLE enhanced_transactions 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'held' CHECK (escrow_status IN ('held', 'released', 'refunded'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_razorpay_order ON enhanced_transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_razorpay_payment ON enhanced_transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_transactions_escrow_status ON enhanced_transactions(escrow_status);

-- Add comments
COMMENT ON COLUMN enhanced_transactions.razorpay_order_id IS 'Razorpay order ID for tracking';
COMMENT ON COLUMN enhanced_transactions.razorpay_payment_id IS 'Razorpay payment ID after successful payment';
COMMENT ON COLUMN enhanced_transactions.escrow_status IS 'Status of funds in escrow: held, released, refunded';