'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Copy, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface InviteCode {
  id: string
  code: string
  schoolName: string
  directorEmail: string
  used: boolean
  usedAt: Date | null
  expiresAt: Date
  createdAt: Date
  tenantSlug?: string
  tenantName?: string
}

export default function AdminInvitesPage() {
  const [schoolName, setSchoolName] = useState('')
  const [directorEmail, setDirectorEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<InviteCode | null>(null)
  const [error, setError] = useState('')
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [copied, setCopied] = useState(false)

  const generateInvite = async () => {
    setIsLoading(true)
    setError('')
    setGeneratedCode(null)

    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolName,
          directorEmail,
          adminPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate invite code')
        return
      }

      setGeneratedCode(data.invite)
      setSchoolName('')
      setDirectorEmail('')
      await loadInviteCodes()
    } catch (err) {
      setError('Failed to generate invite code')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInviteCodes = async () => {
    try {
      const response = await fetch('/api/admin/invites')
      if (response.ok) {
        const data = await response.json()
        setInviteCodes(data.invites || [])
      }
    } catch (err) {
      console.error('Failed to load invite codes')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Invite Code</CardTitle>
            <CardDescription>
              Create an invitation code for a new school to join the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  placeholder="Riverside High School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="directorEmail">Director Email</Label>
                <Input
                  id="directorEmail"
                  type="email"
                  placeholder="director@school.edu"
                  value={directorEmail}
                  onChange={(e) => setDirectorEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="adminPassword">Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>

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
                      Share this with {generatedCode.directorEmail} to create their account.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={generateInvite}
              disabled={!schoolName || !directorEmail || !adminPassword || isLoading}
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
                        {invite.schoolName} • {invite.directorEmail}
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