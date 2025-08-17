'use client'

import { useEffect, useState } from 'react'
import { parseHostname } from '@/lib/environment'

interface TenantValidationResult {
  authenticated: boolean
  requiresRedirect: boolean
  redirectUrl?: string
  reason?: string
  userTenant?: string
  userRole?: string
  error?: string
}

export function TenantContextEnforcer() {
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function validateTenantContext() {
      try {
        if (typeof window === 'undefined') return

        const hostname = window.location.hostname + ':' + window.location.port
        const parsed = parseHostname(hostname)
        
        // Define routes that DON'T need tenant enforcement (public/global routes)
        const publicRoutes = [
          '/',
          '/login', 
          '/register',
          '/signup',
          '/about',
          '/contact', 
          '/pricing',
          '/test-login'
        ]
        
        const isPublicRoute = publicRoutes.some(route => 
          window.location.pathname === route || 
          window.location.pathname.startsWith('/api/')
        )

        if (isPublicRoute) {
          setIsChecking(false)
          return
        }
        
        // ALL other routes need tenant enforcement for authenticated users

        const params = new URLSearchParams({
          tenantSlug: parsed.tenantSlug || '',
          hostname: hostname,
          originalPath: window.location.pathname + window.location.search
        })

        const response = await fetch(`/api/auth/validate-tenant-context?${params}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          console.error('Tenant validation failed:', response.statusText)
          setIsChecking(false)
          return
        }

        const result: TenantValidationResult = await response.json()
        
        console.log('🔒 TENANT VALIDATION:', result)

        if (result.requiresRedirect && result.redirectUrl) {
          console.log('🔄 ENFORCING TENANT REDIRECT:', result.redirectUrl, 'Reason:', result.reason)
          
          // Add a small delay to prevent redirect loops
          setTimeout(() => {
            if (isMounted) {
              window.location.href = result.redirectUrl!
            }
          }, 100)
          return
        }

        if (result.authenticated && result.userTenant) {
          console.log('✅ TENANT CONTEXT VALID:', result.userTenant, result.userRole)
        }

      } catch (error) {
        console.error('Tenant context validation error:', error)
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    // Run validation on mount
    validateTenantContext()

    // Also run when the URL changes (for SPA navigation)
    const handleLocationChange = () => {
      setIsChecking(true)
      validateTenantContext()
    }

    // Listen for popstate (back/forward button)
    window.addEventListener('popstate', handleLocationChange)

    return () => {
      isMounted = false
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  // Show a subtle loading indicator only during validation
  if (isChecking) {
    return (
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse z-50" 
           style={{ animationDuration: '1s' }} />
    )
  }

  return null
}