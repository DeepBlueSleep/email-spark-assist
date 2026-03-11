CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename text NOT NULL DEFAULT 'unnamed',
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  content_base64 text NOT NULL DEFAULT '',
  size_bytes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on email_attachments" ON email_attachments FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on email_attachments" ON email_attachments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow delete on email_attachments" ON email_attachments FOR DELETE TO public USING (true);