// Legacy auth file - replaced with Supabase Auth
// This file is kept temporarily to avoid breaking imports during migration
// TODO: Remove this file once all imports are updated

console.log('⚠️ Legacy auth.ts - Use Supabase Auth instead')

// Export empty object to prevent build errors
export const auth = {
  api: {
    getSession: () => {
      throw new Error('Legacy Better Auth - Use Supabase Auth instead')
    }
  }
}