CREATE TABLE IF NOT EXISTS waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous count" ON waitlist
  FOR SELECT TO anon
  USING (true);
