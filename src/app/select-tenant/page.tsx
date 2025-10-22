import { redirect } from 'next/navigation'
import { getUserTenantMemberships, buildTenantUrl } from '@/lib/tenant-context'
import { TenantPicker } from '@/components/tenant-picker'

export const dynamic = 'force-dynamic'

export default async function SelectTenantPage() {
  const memberships = await getUserTenantMemberships()

  // If no memberships, show error
  if (memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              No Access
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You don&apos;t have access to any schools. Please contact your school administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If only one membership, auto-redirect
  if (memberships.length === 1) {
    const redirectPath = buildTenantUrl(memberships[0].slug, '/dashboard')
    redirect(redirectPath)
  }

  // Multiple memberships - show picker
  return <TenantPicker memberships={memberships} />
}
