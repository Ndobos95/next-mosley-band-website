-- Grant necessary permissions for JWT custom access token hook
-- The hook needs to read from tenants, memberships, and user_roles tables

GRANT SELECT ON public.tenants TO supabase_auth_admin;
GRANT SELECT ON public.memberships TO supabase_auth_admin;
GRANT SELECT ON public.user_roles TO supabase_auth_admin;
