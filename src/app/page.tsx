import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

async function getTenantFromHeaders() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const tenantSlug = headersList.get('x-tenant-slug')

  if (tenantId && tenantSlug) {
    // We're on a tenant subdomain, fetch tenant details
    const tenant = await prisma.tenants.findFirst({
      where: { id: tenantId }
    })

    return tenant || null
  }

  return null
}

export default async function Home() {
  const tenant = await getTenantFromHeaders()
  
  // If we're on a tenant subdomain, redirect to login
  if (tenant) {
    redirect('/login')
  }
  
  // Otherwise show the main SaaS landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Boosted Band
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The complete payment and management platform for school band programs.
            Streamline fees, manage students, and grow your program.
          </p>
          <div className="space-x-4">
            <a 
              href="/signup" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </a>
            <a 
              href="/demo" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              View Demo
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Payment Management</h3>
            <p className="text-gray-600">
              Collect band fees, trip payments, and equipment costs with automatic tracking and parent notifications.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Student Roster</h3>
            <p className="text-gray-600">
              Manage student information, parent contacts, and track participation across your entire program.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Admin Dashboard</h3>
            <p className="text-gray-600">
              Complete oversight tools for directors and boosters to monitor payments and manage operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
