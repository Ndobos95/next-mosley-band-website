'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Copy, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/auth-client'
import { useUserSession } from '@/contexts/user-session-context'

interface InviteCode {
  id: string
  code: string
  used: boolean
  usedAt: Date | null
  expiresAt: Date
  createdAt: Date
  tenantSlug?: string
  tenantName?: string
}

export default function AdminInvitesPage() {
  const { user, role, isLoading: authLoading } = useUserSession()
  const [isLoading, setIsLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<InviteCode | null>(null)
  const [error, setError] = useState('')
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [copied, setCopied] = useState(false)

  // Load invite codes on component mount
  useEffect(() => {
    if (user && role === 'admin') {
      loadInviteCodes()
    }
  }, [user, role])

  const generateInvite = async () => {
    if (!user || role !== 'admin') {
      setError('Unauthorized: Admin access required')
      return
    }

    setIsLoading(true)
    setError('')
    setGeneratedCode(null)

    try {
      // Generate a random 8-character code
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
      }

      const code = generateCode()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // Expires in 30 days

      // Insert the invite code using Supabase
      const { data, error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code,
          expires_at: expiresAt.toISOString(),
          tenant_id: null // You might want to set this based on your tenant logic
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        setError(insertError.message || 'Failed to generate invite code')
        return
      }

      setGeneratedCode({
        id: data.id,
        code: data.code,
        used: data.used,
        usedAt: data.used_at,
        expiresAt: new Date(data.expires_at),
        createdAt: new Date(data.created_at)
      })
      await loadInviteCodes()
    } catch (err) {
      console.error('Generate invite error:', err)
      setError('Failed to generate invite code')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select(`
          id,
          code,
          used,
          used_at,
          expires_at,
          created_at,
          tenant_id,
          tenants (
            slug,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading invite codes:', error)
        return
      }

      const formattedInvites = data?.map(invite => ({
        id: invite.id,
        code: invite.code,
        used: invite.used,
        usedAt: invite.used_at ? new Date(invite.used_at) : null,
        expiresAt: new Date(invite.expires_at),
        createdAt: new Date(invite.created_at),
        tenantSlug: invite.tenant_id?.name,
        tenantName: invite.tenant_id?.name
      })) || []

      setInviteCodes(formattedInvites)
    } catch (err) {
      console.error('Failed to load invite codes:', err)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    )
  }

  // Check authorization
  if (!user || role !== 'admin') {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="max-w-4xl mx-auto w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Admin privileges required to manage invite codes.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="max-w-4xl mx-auto w-full">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Invite Code</CardTitle>
            <CardDescription>
              Create an invitation code for a new school to join the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">


            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {generatedCode && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <div className="font-semibold">Invite code generated successfully!</div>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-1 rounded border text-lg font-mono">
                        {generatedCode.code}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedCode.code)}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-sm">
                      Share this code with the school to create their account.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={generateInvite}
              disabled={isLoading || !user || role !== 'admin'}
              className="w-full"
            >
              {isLoading ? 'Generating...' : 'Generate Invite Code'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invite Codes</CardTitle>
            <CardDescription>
              View and manage generated invitation codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inviteCodes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No invite codes generated yet
                </div>
              ) : (
                inviteCodes.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm">{invite.code}</code>
                        <Badge variant={invite.used ? 'secondary' : 'default'}>
                          {invite.used ? 'Used' : 'Available'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Created: {invite.createdAt.toLocaleDateString()}
                      </div>
                      {invite.tenantSlug && (
                        <div className="text-xs text-gray-500">
                          Tenant: {invite.tenantSlug}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(invite.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}