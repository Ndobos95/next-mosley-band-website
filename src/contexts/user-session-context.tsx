"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'
import { supabase } from '@/lib/auth-client'

// Types
interface UserRole {
  role: string | null
  permissions: string[]
}

interface UserSession {
  user: User | null
  session: Session | null
  role: string | null
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
}

interface UserSessionContextType extends UserSession {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// Create context
const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined)

// Provider component
export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Extract role and permissions from JWT
  const extractUserRole = (session: Session | null): UserRole => {
    if (!session?.access_token) {
      return { role: null, permissions: [] }
    }

    try {
      const jwt = jwtDecode(session.access_token) as { user_role?: string }
      const userRole = jwt.user_role || null
      
      // Map roles to permissions (you can expand this based on your RBAC system)
      const rolePermissions: Record<string, string[]> = {
        admin: ['invite_codes_create', 'invite_codes_read', 'invite_codes_update', 'invite_codes_delete'],
        director: ['invite_codes_create', 'invite_codes_read', 'invite_codes_update'],
        booster: [],
        parent: []
      }

      return {
        role: userRole,
        permissions: userRole ? rolePermissions[userRole] || [] : []
      }
    } catch (error) {
      console.error('Error decoding JWT:', error)
      return { role: null, permissions: [] }
    }
  }

  // Initialize session
  useEffect(() => {
    let mounted = true

    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          return
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user || null)
          
          const { role, permissions } = extractUserRole(session)
          setRole(role)
          setPermissions(permissions)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error initializing session:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user || null)
        
        const { role, permissions } = extractUserRole(session)
        setRole(role)
        setPermissions(permissions)
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setRole(null)
      setPermissions([])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Refresh session function
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        return
      }

      setSession(session)
      setUser(session?.user || null)
      
      const { role, permissions } = extractUserRole(session)
      setRole(role)
      setPermissions(permissions)
    } catch (error) {
      console.error('Error refreshing session:', error)
    }
  }

  const value: UserSessionContextType = {
    user,
    session,
    role,
    permissions,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshSession
  }

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  )
}

// Hook to use the user session context
export function useUserSession(): UserSessionContextType {
  const context = useContext(UserSessionContext)
  
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserSessionProvider')
  }
  
  return context
}

// Utility hooks for specific use cases
export function useUser() {
  const { user, isLoading } = useUserSession()
  return { user, isLoading }
}

export function useRole() {
  const { role, permissions, isLoading } = useUserSession()
  return { role, permissions, isLoading }
}

export function useAuth() {
  const { isAuthenticated, signOut, refreshSession, isLoading } = useUserSession()
  return { isAuthenticated, signOut, refreshSession, isLoading }
}

// Permission checking utility
export function usePermission(permission: string) {
  const { permissions, isLoading } = useUserSession()
  return { hasPermission: permissions.includes(permission), isLoading }
}
