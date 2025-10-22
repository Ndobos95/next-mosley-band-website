'use client'

import { useRouter } from 'next/navigation'
import { buildTenantUrl } from '@/lib/tenant-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight } from 'lucide-react'

interface TenantMembership {
  tenant_id: string
  slug: string
  role: string
}

interface TenantPickerProps {
  memberships: TenantMembership[]
}

export function TenantPicker({ memberships }: TenantPickerProps) {
  const router = useRouter()

  const handleSelectTenant = (slug: string) => {
    // Store last selected tenant in localStorage for future auto-routing
    if (typeof window !== 'undefined') {
      localStorage.setItem('last-tenant-slug', slug)
    }

    // Navigate to tenant dashboard
    const url = buildTenantUrl(slug, '/dashboard')
    router.push(url)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Select School
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You have access to {memberships.length} schools. Choose one to continue.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {memberships.map((membership) => (
            <Card
              key={membership.tenant_id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-blue-500"
              onClick={() => handleSelectTenant(membership.slug)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg capitalize">
                      {membership.slug.replace(/-/g, ' ')}
                    </CardTitle>
                  </div>
                  <Badge variant={
                    membership.role === 'DIRECTOR' ? 'default' :
                    membership.role === 'BOOSTER' ? 'secondary' :
                    'outline'
                  }>
                    {membership.role}
                  </Badge>
                </div>
                <CardDescription className="text-sm text-gray-500">
                  {membership.role === 'DIRECTOR' && 'Full administrative access'}
                  {membership.role === 'BOOSTER' && 'Payment oversight and support'}
                  {membership.role === 'PARENT' && 'View students and make payments'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectTenant(membership.slug)
                  }}
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
