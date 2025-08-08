
-- Create storage bucket for ticket documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-documents', 'ticket-documents', false);

-- Create policy to allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own ticket documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'ticket-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to view their own files
CREATE POLICY "Users can view their own ticket documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'ticket-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own files
CREATE POLICY "Users can delete their own ticket documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'ticket-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
