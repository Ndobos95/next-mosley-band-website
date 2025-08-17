"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Test credentials from our seed data
const testCredentials = [
  {
    email: "director@default.test", 
    password: "password123", 
    tenant: "default",
    role: "DIRECTOR",
    description: "Default school director"
  },
  {
    email: "director@riverside.edu", 
    password: "password123", 
    tenant: "riverside",
    role: "DIRECTOR", 
    description: "Riverside High director"
  },
  {
    email: "director@northview.edu", 
    password: "password123", 
    tenant: "northview",
    role: "DIRECTOR",
    description: "Northview Academy director"
  },
  {
    email: "parent1@riverside.edu", 
    password: "password123", 
    tenant: "riverside",
    role: "PARENT",
    description: "Riverside parent"
  }
]

export default function TestLoginPage() {
  const [status, setStatus] = useState<string>("")
  
  const testLogin = async (credentials: typeof testCredentials[0]) => {
    setStatus(`Testing login for ${credentials.description}...`)
    
    try {
      // Navigate to login page with pre-filled credentials (for demo)
      const loginUrl = `/login?email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`
      window.location.href = loginUrl
    } catch (error) {
      setStatus(`Error: ${error}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🧪 Test Tenant-Aware Authentication</CardTitle>
          <CardDescription>
            Test how users from different tenants are redirected to their subdomain after login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Current location: <code className="bg-muted px-2 py-1 rounded">{typeof window !== 'undefined' ? window.location.host : 'loading...'}</code>
          </div>
          
          {status && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
              {status}
            </div>
          )}
          
          <div className="grid gap-3">
            {testCredentials.map((creds, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{creds.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {creds.email} → Expected: <code>{creds.tenant}.localhost:3000</code>
                  </div>
                  <div className="mt-1">
                    <Badge variant={creds.role === 'DIRECTOR' ? 'default' : 'secondary'}>
                      {creds.role}
                    </Badge>
                  </div>
                </div>
                <Button 
                  onClick={() => testLogin(creds)}
                  size="sm"
                >
                  Test Login
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="font-medium text-yellow-800">🔍 What to expect:</div>
            <div className="text-sm text-yellow-700 mt-1">
              After clicking &quot;Test Login&quot;, you should be redirected to the tenant&apos;s subdomain dashboard.
              For example, logging in as director@riverside.edu should redirect you to riverside.localhost:3000/dashboard
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}