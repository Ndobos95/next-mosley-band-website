-- Invite Codes Role Permissions Migration
-- This migration adds default role permissions for invite_codes

-- Insert default role permissions for invite_codes
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'invite_codes_create'),
  ('admin', 'invite_codes_read'),
  ('admin', 'invite_codes_update'),
  ('admin', 'invite_codes_delete')