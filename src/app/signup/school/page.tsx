import { validateInviteCode } from '@/lib/invite-codes'
import { SchoolSignupForm } from '../school-signup-form'
import { redirect } from 'next/navigation'

interface SchoolSignupPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function SchoolSignupPage({ searchParams }: SchoolSignupPageProps) {
  const params = await searchParams
  const inviteCode = params.code

  // If no invite code provided, redirect to closed beta
  if (!inviteCode) {
    redirect('/closed-beta')
  }

  // Validate the invite code
  const validation = await validateInviteCode(inviteCode)

  if (!validation.valid || !validation.invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Invalid Invite Code
            </h1>
            <p className="text-gray-600 mb-6">
              {validation.error || 'The invite code you provided is not valid.'}
            </p>
            <a 
              href="/closed-beta" 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Return to Closed Beta
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Show school signup form with valid invite
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your School Account
          </h1>
          <p className="text-gray-600">
            Setting up account for <strong>{validation.invite.schoolName}</strong>
          </p>
        </div>
        <SchoolSignupForm invite={validation.invite} />
      </div>
    </div>
  )
}
