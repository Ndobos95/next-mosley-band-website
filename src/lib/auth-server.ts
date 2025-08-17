import { createClient, getUser } from "./supabase/server"
import { redirect } from "next/navigation"
import { db } from "./drizzle"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) return null
    
    // Get user data from our database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    
    if (user.length === 0) return null
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
        role: user[0].role,
        name: user[0].displayName,
        tenantId: user[0].tenantId
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