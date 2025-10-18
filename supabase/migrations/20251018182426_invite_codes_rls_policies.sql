-- Invite Codes RLS Policies Migration
-- This migration adds RLS policies for the invite_codes table

-- Policy: Allow authorized create access
CREATE POLICY "Allow authorized create access" ON public.invite_codes
  FOR INSERT TO authenticated 
  WITH CHECK ((SELECT authorize('invite_codes_create')));

-- Policy: Allow authorized update access
CREATE POLICY "Allow authorized update access" ON public.invite_codes
  FOR UPDATE TO authenticated 
  USING ((SELECT authorize('invite_codes_update')));

-- Policy: Allow authorized delete access
CREATE POLICY "Allow authorized delete access" ON public.invite_codes
  FOR DELETE TO authenticated 
  USING ((SELECT authorize('invite_codes_delete')));

-- Policy: Allow authorized read access
CREATE POLICY "Allow authorized read access" ON public.invite_codes
  FOR SELECT TO authenticated 
  USING ((SELECT authorize('invite_codes_read')));
