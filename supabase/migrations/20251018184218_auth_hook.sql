-- Auth Hook Migration
-- This migration creates the custom access token hook for JWT claims

-- Create the auth hook function (without SECURITY DEFINER for better security)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
  DECLARE
    claims jsonb;
    user_role public.app_role;
    user_tenant_id uuid;
  BEGIN
    -- Fetch the user role from user_roles table
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = (event->>'user_id')::uuid;
    
    -- Fetch the tenant_id from memberships table (user_id is UUID)
    SELECT tenant_id INTO user_tenant_id FROM public.memberships WHERE user_id = (event->>'user_id')::uuid;
    
    claims := event->'claims';
    
    -- Set the user_role claim
    IF user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{user_role}', 'null');
    END IF;
    
    -- Set the tenant_id claim
    IF user_tenant_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
    ELSE
      claims := jsonb_set(claims, '{tenant_id}', 'null');
    END IF;
    
    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);
    -- Return the modified or original event
    RETURN event;
  END;
$$;

-- Grant necessary permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke permissions from authenticated and anon roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon;

-- Grant table permissions to supabase_auth_admin
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;
GRANT ALL ON TABLE public.memberships TO supabase_auth_admin;
REVOKE ALL ON TABLE public.user_roles FROM authenticated, anon;
REVOKE ALL ON TABLE public.memberships FROM authenticated, anon;

-- Create policy for auth admin to read user roles
CREATE POLICY "Allow auth admin to read user roles" ON public.user_roles
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

-- Create policy for auth admin to read memberships
CREATE POLICY "Allow auth admin to read memberships" ON public.memberships
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);
