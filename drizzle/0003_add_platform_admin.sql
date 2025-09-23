-- Add PLATFORM_ADMIN role support
-- Note: The role column already exists and accepts any text value,
-- so we don't need to modify the column constraint.
-- This migration is for documentation purposes.

-- Platform admins will have NULL tenant_id to indicate they are not tied to any specific tenant
-- The application logic will check for PLATFORM_ADMIN role to bypass tenant restrictions