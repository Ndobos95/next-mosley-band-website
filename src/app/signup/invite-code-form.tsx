'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InviteCodeForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    
    // Simply redirect with the code as a query parameter
    // The server will validate it on the next page load
    router.push(`/signup?code=${encodeURIComponent(code.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Invitation Code
        </label>
        <input
          type="text"
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BAND-2024-XXXX"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Validating...' : 'Continue'}
      </button>

      <div className="text-center text-sm text-gray-500">
        <p>Don&apos;t have an invitation code?</p>
        <a href="mailto:hello@boosted.band" className="text-blue-600 hover:text-blue-700">
          Contact us to get started
        </a>
      </div>
    </form>
  )
}