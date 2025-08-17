'use client'

import { useState, useEffect } from 'react'

interface Invite {
  id: string
  code: string
  schoolName: string
  directorEmail: string
  expiresAt: Date
}

interface SchoolSignupFormProps {
  invite: Invite
}

export function SchoolSignupForm({ invite }: SchoolSignupFormProps) {
  const [formData, setFormData] = useState({
    schoolName: invite.schoolName,
    subdomain: '',
    directorName: '',
    directorEmail: invite.directorEmail,
    schoolAddress: '',
    schoolPhone: '',
  })
  
  const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean
    available: boolean
    error: string | null
  }>({
    checking: false,
    available: false,
    error: null
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate suggested subdomain from school name
  useEffect(() => {
    if (invite.schoolName && !formData.subdomain) {
      const suggested = invite.schoolName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      
      setFormData(prev => ({ ...prev, subdomain: suggested }))
    }
  }, [invite.schoolName, formData.subdomain])

  // Check subdomain availability
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!formData.subdomain) {
        setSubdomainStatus({ checking: false, available: false, error: null })
        return
      }

      setSubdomainStatus({ checking: true, available: false, error: null })

      try {
        const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(formData.subdomain)}`)
        const result = await response.json()
        
        setSubdomainStatus({ 
          checking: false, 
          available: result.available, 
          error: result.error 
        })
      } catch (err) {
        setSubdomainStatus({ 
          checking: false, 
          available: false, 
          error: 'Failed to check availability' 
        })
      }
    }

    const timeoutId = setTimeout(checkSubdomain, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.subdomain])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/schools/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: invite.code,
          schoolData: {
            name: formData.schoolName,
            subdomain: formData.subdomain,
            address: formData.schoolAddress,
            phone: formData.schoolPhone,
          },
          directorData: {
            name: formData.directorName,
            email: formData.directorEmail,
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create school account')
      }

      const data = await response.json()
      
      // Redirect to Stripe onboarding
      if (data.onboardingLink) {
        window.location.href = data.onboardingLink
      } else {
        // Redirect to tenant site based on environment
        const environment = data.environment || 'production'
        const tenantUrl = environment === 'staging' 
          ? `https://${formData.subdomain}.boostedband.dev`
          : `https://${formData.subdomain}.boosted.band`
        window.location.href = tenantUrl
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
      setLoading(false)
    }
  }

  const canSubmit = formData.schoolName && 
                   formData.subdomain && 
                   formData.directorName && 
                   formData.directorEmail && 
                   formData.schoolAddress &&
                   subdomainStatus.available &&
                   !loading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
            School Name
          </label>
          <input
            type="text"
            id="schoolName"
            value={formData.schoolName}
            onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-2">
            Website Address
          </label>
          <div className="flex">
            <input
              type="text"
              id="subdomain"
              value={formData.subdomain}
              onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your-school"
              required
              disabled={loading}
            />
            <div className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
              .boosted.band
            </div>
          </div>
          {subdomainStatus.checking && (
            <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
          )}
          {subdomainStatus.error && (
            <p className="text-sm text-red-600 mt-1">{subdomainStatus.error}</p>
          )}
          {subdomainStatus.available && !subdomainStatus.error && (
            <p className="text-sm text-green-600 mt-1">✓ Available</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="directorName" className="block text-sm font-medium text-gray-700 mb-2">
            Director Name
          </label>
          <input
            type="text"
            id="directorName"
            value={formData.directorName}
            onChange={(e) => setFormData(prev => ({ ...prev, directorName: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="directorEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Director Email
          </label>
          <input
            type="email"
            id="directorEmail"
            value={formData.directorEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, directorEmail: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700 mb-2">
          School Address
        </label>
        <textarea
          id="schoolAddress"
          value={formData.schoolAddress}
          onChange={(e) => setFormData(prev => ({ ...prev, schoolAddress: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="123 Main St, City, State 12345"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="schoolPhone" className="block text-sm font-medium text-gray-700 mb-2">
          School Phone
        </label>
        <input
          type="tel"
          id="schoolPhone"
          value={formData.schoolPhone}
          onChange={(e) => setFormData(prev => ({ ...prev, schoolPhone: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="(555) 123-4567"
          required
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Account...' : 'Create School Account'}
      </button>

      <div className="text-sm text-gray-500 text-center">
        <p>By creating an account, you agree to our terms of service and privacy policy.</p>
      </div>
    </form>
  )
}