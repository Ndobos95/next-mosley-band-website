"use client"

import { createClient } from '@/lib/supabase/client'

export const supabase = createClient()

// Supabase auth methods
export const signIn = (email: string, password: string) => 
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email: string, password: string) => 
  supabase.auth.signUp({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// Hook for getting current user (use in React components)
export const useUser = () => {
  // This is a simplified version - you might want to use a proper hook library
  // like @supabase/auth-helpers-react for production
  return supabase.auth.getUser()
}

// Backward compatibility export
export const authClient = {
  signIn,
  signUp, 
  signOut,
  getSession,
  useUser
}