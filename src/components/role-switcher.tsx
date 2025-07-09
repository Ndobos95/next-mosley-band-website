"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RoleSwitcherProps {
  currentRole: string
  onRoleChange: (role: "PARENT" | "DIRECTOR" | "BOOSTER") => void
}

export function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRoleChange = async (newRole: "PARENT" | "DIRECTOR" | "BOOSTER") => {
    if (newRole === currentRole) return
    
    setIsLoading(true)
    try {
      // Call the API to update the user's role in the database
      const response = await fetch('/api/user/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        onRoleChange(newRole)
        // Force a page reload to update the session
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('Error updating role:', error)
      }
    } catch (error) {
      console.error("Error switching role:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">🧪 Testing Role Switcher</CardTitle>
        <CardDescription className="text-xs">
          Switch between roles to test different dashboard views
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Current:</span>
          <Badge variant={currentRole === "DIRECTOR" ? "default" : currentRole === "BOOSTER" ? "destructive" : "secondary"}>
            {currentRole}
          </Badge>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={currentRole === "PARENT" ? "default" : "outline"}
            onClick={() => handleRoleChange("PARENT")}
            disabled={isLoading || currentRole === "PARENT"}
          >
            Parent
          </Button>
          <Button
            size="sm"
            variant={currentRole === "BOOSTER" ? "default" : "outline"}
            onClick={() => handleRoleChange("BOOSTER")}
            disabled={isLoading || currentRole === "BOOSTER"}
          >
            Booster
          </Button>
          <Button
            size="sm"
            variant={currentRole === "DIRECTOR" ? "default" : "outline"}
            onClick={() => handleRoleChange("DIRECTOR")}
            disabled={isLoading || currentRole === "DIRECTOR"}
          >
            Director
          </Button>
        </div>
        
        {isLoading && (
          <p className="text-xs text-muted-foreground">Switching roles...</p>
        )}
      </CardContent>
    </Card>
  )
}