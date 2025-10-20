ALTER TABLE "public"."invite_codes" ENABLE ROW LEVEL SECURITY;

-- Invite Codes RLS Policies Migration
-- This migration adds RLS policies for the invite_codes table

-- Policy: Allow admin create access
CREATE POLICY "Allow admin create access" ON public.invite_codes
  FOR INSERT TO authenticated 
  WITH CHECK (
    (auth.jwt() ->> 'user_role')::text = 'admin'
  );

-- Policy: Allow admin delete access
CREATE POLICY "Allow admin delete access" ON public.invite_codes
  FOR DELETE TO authenticated 
  USING (
    (auth.jwt() ->> 'user_role')::text = 'admin'
  );

-- Policy: Allow admin read access
CREATE POLICY "Allow admin read access" ON public.invite_codes
  FOR SELECT TO authenticated 
  USING (
    (auth.jwt() ->> 'user_role')::text = 'admin'
  );

-- Policy: Allow admin update access
CREATE POLICY "Allow admin update access" ON public.invite_codes
  FOR UPDATE TO authenticated 
  WITH CHECK (
    (auth.jwt() ->> 'user_role')::text = 'admin'
  );