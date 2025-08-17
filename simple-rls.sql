-- SIMPLE RLS FOR MULTI-TENANT SAAS
-- Copy/paste this into Supabase SQL Editor and run it

-- 1. Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_payment_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_cache ENABLE ROW LEVEL SECURITY;

-- 2. One policy per table: users only access their tenant's data
CREATE POLICY "tenant_isolation" ON students FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON student_parents FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON student_payment_enrollments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON payments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON guest_payments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Users see their own profile
CREATE POLICY "own_profile" ON user_profiles FOR ALL
  USING (id = auth.uid());

-- Users see their own stripe cache
CREATE POLICY "own_cache" ON stripe_cache FOR ALL
  USING (user_id = auth.uid()::text);

-- Users see their own tenant
CREATE POLICY "own_tenant" ON tenants FOR ALL
  USING (id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Done! Users can only see data from their own tenant.