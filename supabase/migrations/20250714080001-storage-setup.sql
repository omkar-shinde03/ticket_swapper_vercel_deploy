-- Storage setup for file uploads
-- Create storage buckets for different types of files

-- Create bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for ticket images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-images', 'ticket-images', false)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for KYC documents
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload own KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own KYC documents
CREATE POLICY "Users can view own KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Storage policies for ticket images
-- Users can upload images for their own tickets
CREATE POLICY "Users can upload ticket images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ticket-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view ticket images (for public listings)
CREATE POLICY "Anyone can view ticket images" ON storage.objects
  FOR SELECT USING (bucket_id = 'ticket-images');

-- Storage policies for avatars
-- Users can upload their own avatars
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Storage policies for message attachments
-- Users can upload attachments for their messages
CREATE POLICY "Users can upload message attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view attachments for messages they're part of
CREATE POLICY "Users can view message attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.tickets t ON m.ticket_id = t.id
        WHERE (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        AND storage.filename(name) LIKE '%' || m.id::text || '%'
      )
    )
  );