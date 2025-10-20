-- Multi-Tenant Band Program SaaS - Supabase Seed Script
--
-- This file runs automatically when you execute: npx supabase reset
-- It creates:
-- - Multiple tenants (band programs)
-- - Test auth users (Director, Booster, Parents) for each tenant
-- - Payment categories for each tenant
-- - Test students with instruments for each tenant
--
-- Password for all test users: password123

-- Clean up existing data (in reverse dependency order)
TRUNCATE TABLE memberships CASCADE;
TRUNCATE TABLE user_profiles CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE payment_categories CASCADE;
TRUNCATE TABLE tenants CASCADE;

-- Clean up auth tables (must specify schema)
TRUNCATE TABLE auth.identities CASCADE;
TRUNCATE TABLE auth.users CASCADE;

-- =============================================================================
-- TENANT 1: Default Band Program
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := gen_random_uuid();
  v_user_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO tenants (id, slug, name, status, director_email, director_name, created_at, updated_at)
  VALUES (v_tenant_id, 'default', 'Default Band Program', 'active', 'director@default.edu', 'Sarah Thompson', NOW(), NOW());

  -- Payment categories
  INSERT INTO payment_categories (id, tenant_id, name, description, full_amount, allow_increments, increment_amount, created_at, updated_at)
  VALUES
    ('BAND_FEES_default', v_tenant_id, 'Band Fees', 'Annual band participation fees', 25000, false, NULL, NOW(), NOW()),
    ('SPRING_TRIP_default', v_tenant_id, 'Spring Trip', 'Spring band trip expenses', 90000, true, 5000, NOW(), NOW()),
    ('EQUIPMENT_default', v_tenant_id, 'Equipment', 'Band equipment and supplies', 15000, true, 2500, NOW(), NOW());

  -- Students
  INSERT INTO students (id, tenant_id, name, instrument, grade, source, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'Emily Johnson', 'Flute', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'James Williams', 'Clarinet', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Sarah Brown', 'Alto Saxophone', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Michael Jones', 'Tenor Saxophone', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Jessica Garcia', 'Oboe', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Daniel Miller', 'Bassoon', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ashley Davis', 'Trumpet', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ryan Rodriguez', 'French Horn', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Sophia Martinez', 'Trombone', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Matthew Hernandez', 'Tuba', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Olivia Lopez', 'Baritone', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ethan Wilson', 'Euphonium', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Emma Anderson', 'Percussion', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Noah Thomas', 'Percussion', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Isabella Taylor', 'Percussion', '11', 'ROSTER', NOW(), NOW());

  -- Auth users (password: password123)
  -- Director
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'director@default.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Sarah Thompson', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'director@default.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'director@default.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'director@default.edu', 'DIRECTOR', 'Sarah Thompson', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'DIRECTOR', NOW());

  -- Booster
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'booster@default.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Default Booster', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'booster@default.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'booster@default.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'booster@default.edu', 'BOOSTER', 'Default Booster', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'BOOSTER', NOW());

  -- Parent 1
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent1@default.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 1 (Default)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent1@default.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent1@default.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent1@default.edu', 'PARENT', 'Parent 1 (Default)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());

  -- Parent 2
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent2@default.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 2 (Default)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent2@default.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent2@default.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent2@default.edu', 'PARENT', 'Parent 2 (Default)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());

  -- Parent 3
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent3@default.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 3 (Default)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent3@default.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent3@default.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent3@default.edu', 'PARENT', 'Parent 3 (Default)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());
END $$;

-- =============================================================================
-- TENANT 2: Riverside High School
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := gen_random_uuid();
  v_user_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO tenants (id, slug, name, status, director_email, director_name, created_at, updated_at)
  VALUES (v_tenant_id, 'riverside', 'Riverside High School', 'active', 'director@riverside.edu', 'Michael Rodriguez', NOW(), NOW());

  -- Payment categories
  INSERT INTO payment_categories (id, tenant_id, name, description, full_amount, allow_increments, increment_amount, created_at, updated_at)
  VALUES
    ('BAND_FEES_riverside', v_tenant_id, 'Band Fees', 'Annual band participation fees', 25000, false, NULL, NOW(), NOW()),
    ('SPRING_TRIP_riverside', v_tenant_id, 'Spring Trip', 'Spring band trip expenses', 90000, true, 5000, NOW(), NOW()),
    ('EQUIPMENT_riverside', v_tenant_id, 'Equipment', 'Band equipment and supplies', 15000, true, 2500, NOW(), NOW());

  -- Students
  INSERT INTO students (id, tenant_id, name, instrument, grade, source, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'Emily Brown', 'Flute', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'James Jones', 'Clarinet', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Sarah Garcia', 'Alto Saxophone', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Michael Miller', 'Tenor Saxophone', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Jessica Davis', 'Oboe', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Daniel Rodriguez', 'Bassoon', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ashley Martinez', 'Trumpet', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ryan Hernandez', 'French Horn', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Sophia Lopez', 'Trombone', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Matthew Wilson', 'Tuba', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Olivia Anderson', 'Baritone', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ethan Thomas', 'Euphonium', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Emma Taylor', 'Percussion', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Noah Moore', 'Percussion', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Isabella Jackson', 'Percussion', '11', 'ROSTER', NOW(), NOW());

  -- Auth users (password: password123)
  -- Director
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'director@riverside.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Michael Rodriguez', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'director@riverside.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'director@riverside.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'director@riverside.edu', 'DIRECTOR', 'Michael Rodriguez', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'DIRECTOR', NOW());

  -- Booster
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'booster@riverside.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Riverside Booster', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'booster@riverside.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'booster@riverside.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'booster@riverside.edu', 'BOOSTER', 'Riverside Booster', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'BOOSTER', NOW());

  -- Parent 1
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent1@riverside.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 1 (Riverside)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent1@riverside.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent1@riverside.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent1@riverside.edu', 'PARENT', 'Parent 1 (Riverside)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());

  -- Parent 2
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent2@riverside.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 2 (Riverside)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent2@riverside.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent2@riverside.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent2@riverside.edu', 'PARENT', 'Parent 2 (Riverside)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());

  -- Parent 3
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent3@riverside.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 3 (Riverside)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent3@riverside.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent3@riverside.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent3@riverside.edu', 'PARENT', 'Parent 3 (Riverside)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());
END $$;

-- =============================================================================
-- TENANT 3: Northview Academy
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := gen_random_uuid();
  v_user_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO tenants (id, slug, name, status, director_email, director_name, created_at, updated_at)
  VALUES (v_tenant_id, 'northview', 'Northview Academy', 'active', 'director@northview.edu', 'Jennifer Chen', NOW(), NOW());

  -- Payment categories
  INSERT INTO payment_categories (id, tenant_id, name, description, full_amount, allow_increments, increment_amount, created_at, updated_at)
  VALUES
    ('BAND_FEES_northview', v_tenant_id, 'Band Fees', 'Annual band participation fees', 25000, false, NULL, NOW(), NOW()),
    ('SPRING_TRIP_northview', v_tenant_id, 'Spring Trip', 'Spring band trip expenses', 90000, true, 5000, NOW(), NOW()),
    ('EQUIPMENT_northview', v_tenant_id, 'Equipment', 'Band equipment and supplies', 15000, true, 2500, NOW(), NOW());

  -- Students
  INSERT INTO students (id, tenant_id, name, instrument, grade, source, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'Emily Garcia', 'Flute', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'James Miller', 'Clarinet', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Sarah Davis', 'Alto Saxophone', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Michael Rodriguez', 'Tenor Saxophone', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Jessica Martinez', 'Oboe', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Daniel Hernandez', 'Bassoon', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ashley Lopez', 'Trumpet', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ryan Wilson', 'French Horn', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Sophia Anderson', 'Trombone', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Matthew Thomas', 'Tuba', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Olivia Taylor', 'Baritone', '11', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Ethan Moore', 'Euphonium', '12', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Emma Jackson', 'Percussion', '9', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Noah Martin', 'Percussion', '10', 'ROSTER', NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, 'Isabella Lee', 'Percussion', '11', 'ROSTER', NOW(), NOW());

  -- Auth users (password: password123)
  -- Director
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'director@northview.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Jennifer Chen', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'director@northview.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'director@northview.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'director@northview.edu', 'DIRECTOR', 'Jennifer Chen', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'DIRECTOR', NOW());

  -- Booster
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'booster@northview.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Northview Booster', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'booster@northview.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'booster@northview.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'booster@northview.edu', 'BOOSTER', 'Northview Booster', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'BOOSTER', NOW());

  -- Parent 1
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent1@northview.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 1 (Northview)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent1@northview.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent1@northview.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent1@northview.edu', 'PARENT', 'Parent 1 (Northview)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());

  -- Parent 2
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent2@northview.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 2 (Northview)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent2@northview.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent2@northview.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent2@northview.edu', 'PARENT', 'Parent 2 (Northview)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());

  -- Parent 3
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'parent3@northview.edu', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', jsonb_build_object('name', 'Parent 3 (Northview)', 'tenantId', v_tenant_id),
    '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, 'email', 'parent3@northview.edu', jsonb_build_object('sub', v_user_id::text, 'email', 'parent3@northview.edu'), NOW(), NOW());
  INSERT INTO user_profiles (id, email, role, display_name, tenant_id, created_at, updated_at)
  VALUES (v_user_id, 'parent3@northview.edu', 'PARENT', 'Parent 3 (Northview)', v_tenant_id, NOW(), NOW());
  INSERT INTO memberships (id, user_id, tenant_id, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_tenant_id, 'PARENT', NOW());
END $$;

-- =============================================================================
-- Summary
-- =============================================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE '🌱 Multi-Tenant Database Seeding Complete!';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  ✅ 3 Tenants (Default, Riverside, Northview) with proper random UUIDs';
  RAISE NOTICE '  ✅ 15 Auth Users (5 per tenant: Director, Booster, 3 Parents)';
  RAISE NOTICE '  ✅ 15 User Profiles (linked to auth users)';
  RAISE NOTICE '  ✅ 15 Memberships (user-tenant associations)';
  RAISE NOTICE '  ✅ 9 Payment Categories (3 per tenant)';
  RAISE NOTICE '  ✅ 45 Students (15 per tenant)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Test Credentials (Password: password123):';
  RAISE NOTICE '  Default Band Program:';
  RAISE NOTICE '    director@default.edu, booster@default.edu';
  RAISE NOTICE '    parent1@default.edu, parent2@default.edu, parent3@default.edu';
  RAISE NOTICE '';
  RAISE NOTICE '  Riverside High School:';
  RAISE NOTICE '    director@riverside.edu, booster@riverside.edu';
  RAISE NOTICE '    parent1@riverside.edu, parent2@riverside.edu, parent3@riverside.edu';
  RAISE NOTICE '';
  RAISE NOTICE '  Northview Academy:';
  RAISE NOTICE '    director@northview.edu, booster@northview.edu';
  RAISE NOTICE '    parent1@northview.edu, parent2@northview.edu, parent3@northview.edu';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '  npm run dev              - Start development server';
  RAISE NOTICE '  npx supabase db studio   - View database in browser';
  RAISE NOTICE '=============================================================';
END $$;
