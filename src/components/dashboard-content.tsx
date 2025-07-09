"use client"

import { useState } from "react"
import { ParentDashboard } from "@/components/parent-dashboard"
import { DirectorDashboard } from "@/components/director-dashboard"
import { RoleSwitcher } from "@/components/role-switcher"

interface DashboardContentProps {
  initialUser: {
    name: string
    email: string
    role: string
  }
}

export function DashboardContent({ initialUser }: DashboardContentProps) {
  const [currentRole, setCurrentRole] = useState<"PARENT" | "DIRECTOR">(
    initialUser.role as "PARENT" | "DIRECTOR"
  )

  const userWithCurrentRole = {
    ...initialUser,
    role: currentRole
  }

  return (
    <div className="space-y-6">
      {/* Role Switcher for Testing */}
      <div className="flex justify-end">
        <RoleSwitcher 
          currentRole={currentRole} 
          onRoleChange={setCurrentRole} 
        />
      </div>

      {/* Dashboard Content Based on Role */}
      {currentRole === "DIRECTOR" ? (
        <DirectorDashboard user={userWithCurrentRole} />
      ) : (
        <ParentDashboard user={userWithCurrentRole} />
      )}
    </div>
  )
}