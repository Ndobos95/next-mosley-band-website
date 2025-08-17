import { auth } from "./auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function getSession() {
  try {
    // TODO: Replace with Supabase Auth
    const session = null // Temporary during migration
    return session
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