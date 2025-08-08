
-- Create ticket_documents table for file attachments
CREATE TABLE IF NOT EXISTS ticket_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for ticket_documents
ALTER TABLE ticket_documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents for tickets they own or are buying
CREATE POLICY "Users can view ticket documents" ON ticket_documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_documents.ticket_id 
      AND tickets.seller_id = auth.uid()
    )
  );

-- Users can upload documents for their own tickets
CREATE POLICY "Users can upload ticket documents" ON ticket_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_documents.ticket_id 
      AND tickets.seller_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX idx_ticket_documents_ticket_id ON ticket_documents(ticket_id);
CREATE INDEX idx_ticket_documents_uploaded_by ON ticket_documents(uploaded_by);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ticket_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_documents_updated_at
  BEFORE UPDATE ON ticket_documents
  FOR EACH ROW EXECUTE FUNCTION update_ticket_documents_updated_at();
