-- Create video_calls table for KYC video verification
CREATE TABLE video_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'waiting_admin' CHECK (status IN ('waiting_admin', 'admin_connected', 'completed')),
    call_type TEXT DEFAULT 'kyc_verification',
    verification_result TEXT CHECK (verification_result IN ('approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_video_calls_user_id ON video_calls(user_id);
CREATE INDEX idx_video_calls_admin_id ON video_calls(admin_id);
CREATE INDEX idx_video_calls_status ON video_calls(status);

-- Enable RLS
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own video calls" ON video_calls
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video calls" ON video_calls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all video calls" ON video_calls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "Admins can update video calls" ON video_calls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

-- Add additional fields to profiles table for KYC
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_document_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_notes TEXT;

-- Insert admin user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'omstemper1@gmail.com',
    crypt('redlily@3B', gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
) ON CONFLICT (email) DO NOTHING;

-- Create admin profile
INSERT INTO profiles (id, full_name, user_type, kyc_status)
SELECT 
    id,
    'Admin User',
    'admin',
    'verified'
FROM auth.users 
WHERE email = 'omstemper1@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    user_type = 'admin',
    kyc_status = 'verified';