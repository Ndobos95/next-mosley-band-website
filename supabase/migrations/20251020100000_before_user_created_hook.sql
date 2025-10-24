-- Before User Created Hook Migration
-- This migration creates a hook to validate invite codes before user creation

-- Create the before-user-created hook function
CREATE OR REPLACE FUNCTION public.hook_validate_invite_code(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_code text;
  invite_record record;
  user_metadata jsonb;
  intended_role text;
BEGIN
  -- Extract user metadata from the event
  user_metadata := event->'user'->'user_metadata';
  
  -- Get the intended role from user metadata
  intended_role := user_metadata->>'intended_role';
  
  -- Only run invite code validation logic if intended role is director
  IF intended_role != 'director' THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Get the invite code from user metadata
  invite_code := user_metadata->>'code';
  
  -- If no invite code is provided for director role, return error
  IF invite_code IS NULL OR invite_code = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Invite code is required for director registration.',
        'http_code', 400
      )
    );
  END IF;
  
  -- Check if the invite code exists and is valid
  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = invite_code;
  
  -- If invite code doesn't exist
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Invalid invite code. Please check your code and try again.',
        'http_code', 400
      )
    );
  END IF;
  
  -- If invite code has already been used
  IF invite_record.used THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'This invite code has already been used.',
        'http_code', 400
      )
    );
  END IF;
  
  -- If invite code has expired
  IF invite_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'This invite code has expired.',
        'http_code', 400
      )
    );
  END IF;
  
  -- If all checks pass, set the user_id in the invite code
  UPDATE public.invite_codes
  SET user_id = (event->'user'->>'id')::uuid
  WHERE code = invite_code;
  
  RETURN '{}'::jsonb;
END;
$$;

-- Grant necessary permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_validate_invite_code TO supabase_auth_admin;

-- Revoke permissions from other roles for security
REVOKE EXECUTE ON FUNCTION public.hook_validate_invite_code FROM authenticated, anon, public;

-- Grant table permissions to supabase_auth_admin for invite_codes
GRANT SELECT, UPDATE ON TABLE public.invite_codes TO supabase_auth_admin;

-- Create policy for auth admin to read and update invite codes
CREATE POLICY "Allow auth admin to read invite codes" ON public.invite_codes
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

CREATE POLICY "Allow auth admin to update invite codes" ON public.invite_codes
AS PERMISSIVE FOR UPDATE
TO supabase_auth_admin
USING (true);

