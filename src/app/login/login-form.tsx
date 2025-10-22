"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getLoginRedirectUrl } from "@/lib/tenant-redirect"

interface LoginFormProps {
  tenant?: {
    id: string
    slug: string
    name: string
    directorName?: string | null
  } | null
}

function LoginFormContent({ tenant }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const searchParams = useSearchParams()
  
  // Pre-fill credentials from URL params (for testing)
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const passwordParam = searchParams.get('password')
    if (emailParam) setEmail(emailParam)
    if (passwordParam) setPassword(passwordParam)
  }, [searchParams])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await authClient.signIn(email, password)

      if (result.error) {
        setError(result.error.message || "An error occurred")
      } else if (result.data?.user) {
        // Login successful - JWT already contains tenant_memberships from custom hook
        // Get the tenant-specific redirect URL (handles slug-based routing)
        const redirectUrl = await getLoginRedirectUrl()

        // Navigate to the redirect URL (could be /tenant-slug/dashboard or /select-tenant)
        window.location.href = redirectUrl
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {tenant ? `Sign in to ${tenant.name}` : 'Sign in'}
          </CardTitle>
          <CardDescription className="text-center">
            {tenant 
              ? `Access your ${tenant.name} Band Program account`
              : 'Enter your email and password to access your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/register" className="text-primary hover:text-primary/80">
              Sign up
            </Link>
          </div>
          
          {tenant && (
            <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
              {tenant.name} Band Program
              {tenant.directorName && (
                <span className="block">Directed by {tenant.directorName}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginForm({ tenant }: LoginFormProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginFormContent tenant={tenant} />
    </Suspense>
  )
}