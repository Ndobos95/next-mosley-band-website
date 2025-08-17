import { createClient } from "./supabase/server"
import { redirect } from "next/navigation"
import { db } from "./drizzle"
import { userProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    // Get user data from our database
    const userProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))
      .limit(1)
    
    if (userProfile.length === 0) return null
    
    return {
      user: {
        id: user.id,
        email: user.email!,
        role: userProfile[0].role,
        name: userProfile[0].displayName,
        tenantId: userProfile[0].tenantId
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

export async function requireRole(requiredRole: "PARENT" | "DIRECTOR" | "BOOSTER") {
  const session = await requireAuth()
  if (session.user.role !== requiredRole) {
    throw new Error(`Access denied. Required role: ${requiredRole}`)
  }
  return session
}