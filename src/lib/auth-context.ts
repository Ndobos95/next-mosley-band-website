import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/drizzle'
import { userProfiles, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type AuthUser = {
  id: string
  email: string
  tenantId: string | null
  role: string
  displayName: string | null
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get user profile with tenant information
  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1)

  const userProfile = profile[0]
  
  return {
    id: user.id,
    email: user.email!,
    tenantId: userProfile?.tenantId || null,
    role: userProfile?.role || 'PARENT',
    displayName: userProfile?.displayName || user.user_metadata?.full_name || null
  }
}

export async function getTenantContext() {
  const user = await getAuthenticatedUser()
  if (!user?.tenantId) return null

  const tenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1)

  return tenant[0] || null
}

export async function requireAuth() {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error('Unauthorized - no user session')
  }
  return user
}

export async function requireTenant() {
  const user = await requireAuth()
  const tenant = await getTenantContext()
  
  if (!tenant) {
    throw new Error('Unauthorized - no tenant context')
  }
  
  return { user, tenant }
}