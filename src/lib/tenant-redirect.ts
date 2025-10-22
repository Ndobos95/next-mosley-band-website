/**
 * Get the appropriate redirect URL after login based on user's tenant
 * This is a client-side function that calls the server API
 */
export async function getLoginRedirectUrl(): Promise<string> {
  try {
    const response = await fetch('/api/auth/redirect-url', {
      credentials: 'include'
    })

    if (!response.ok) {
      console.error('Failed to get redirect URL:', response.statusText)
      // Check if user has no tenant access
      if (response.status === 403) {
        return '/no-access' // Show error page
      }
      return '/select-tenant' // Fallback to tenant picker
    }

    const data = await response.json()
    return data.redirectUrl || '/select-tenant'

  } catch (error) {
    console.error('Error getting login redirect URL:', error)
    return '/select-tenant' // Fallback to tenant picker
  }
}