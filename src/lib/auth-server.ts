import { createClient } from "./supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "./prisma"

export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    // Get user data from our database
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: user.id }
    })
    
    if (!userProfile) return null
    
    return {
      user: {
        id: user.id,
        email: user.email!,
        role: userProfile.role,
        name: userProfile.display_name,
        tenantId: userProfile.tenant_id
      }
    }
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  return session
}

export async function requireRole(requiredRole: "PARENT" | "DIRECTOR" | "BOOSTER" | "PLATFORM_ADMIN") {
  const session = await requireAuth()

  // Platform admins can access everything
  if (session.user.role === "PLATFORM_ADMIN") {
    return session
  }

  if (session.user.role !== requiredRole) {
    throw new Error(`Access denied. Required role: ${requiredRole}`)
  }
  return session
}

export async function isPlatformAdmin() {
  const session = await getSession()
  return session?.user.role === "PLATFORM_ADMIN"
}