-- Updated Auth Hook for Multi-Tenant Support
-- This migration updates the custom access token hook to support users with multiple tenant memberships

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
  DECLARE
    claims jsonb;
    user_role public.app_role;
    user_memberships jsonb;
  BEGIN
    -- Fetch the user role from user_roles table (legacy single-role support)
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = (event->>'user_id')::uuid;

    -- Fetch ALL tenant memberships for the user (supports multi-tenant)
    -- Returns array of objects: [{"tenant_id": "...", "slug": "mosley-band", "role": "PARENT"}, ...]
    SELECT jsonb_agg(
      jsonb_build_object(
        'tenant_id', m.tenant_id::text,
        'slug', t.slug,
        'role', m.role
      )
    ) INTO user_memberships
    FROM public.memberships m
    JOIN public.tenants t ON m.tenant_id = t.id
    WHERE m.user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    -- Set the user_role claim (legacy single-role support)
    IF user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{user_role}', 'null');
    END IF;

    -- Set the tenant_memberships claim (new multi-tenant support)
    IF user_memberships IS NOT NULL THEN
      claims := jsonb_set(claims, '{tenant_memberships}', user_memberships);
    ELSE
      claims := jsonb_set(claims, '{tenant_memberships}', '[]'::jsonb);
    END IF;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified event
    RETURN event;
  END;
$$;

-- Permissions remain the same
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon;
