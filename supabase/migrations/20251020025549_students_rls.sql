-- Students RLS Policies Migration
-- Enable RLS and add admin-only policies for students table

ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;

-- Policy: Directors can read students in their tenant
CREATE POLICY "Directors can read students in their tenant" ON public.students
  FOR SELECT TO authenticated 
  USING (
    (auth.jwt() ->> 'user_role')::text = 'director'
    AND (auth.jwt() ->> 'tenant_id')::uuid = students.tenant_id
  );

-- Policy: Directors can create students in their tenant
CREATE POLICY "Directors can create students in their tenant" ON public.students
  FOR INSERT TO authenticated 
  WITH CHECK (
    (auth.jwt() ->> 'user_role')::text = 'director'
    AND (auth.jwt() ->> 'tenant_id')::uuid = students.tenant_id
  );

-- Policy: Directors can update students in their tenant
CREATE POLICY "Directors can update students in their tenant" ON public.students
  FOR UPDATE TO authenticated 
  USING (
    (auth.jwt() ->> 'user_role')::text = 'director'
    AND (auth.jwt() ->> 'tenant_id')::uuid = students.tenant_id
  );

-- Policy: Directors can delete students in their tenant
CREATE POLICY "Directors can delete students in their tenant" ON public.students
  FOR DELETE TO authenticated 
  USING (
    (auth.jwt() ->> 'user_role')::text = 'director'
    AND (auth.jwt() ->> 'tenant_id')::uuid = students.tenant_id
  );
