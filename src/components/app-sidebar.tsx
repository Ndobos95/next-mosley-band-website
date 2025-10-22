"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUserSession } from "@/contexts/user-session-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { adminSidebar, defaultSidebar } from "@/config/sidebar"
import { LogIn, LogOut, Music, UserPlus } from "lucide-react"
import { extractTenantSlugFromPath } from "@/lib/tenant-utils"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, role, signOut, isLoading } = useUserSession()
  const pathname = usePathname()

  // Extract tenant slug from current URL
  const tenantSlug = extractTenantSlugFromPath(pathname)

  console.log("role", role)
  const handleLogout = async () => {
    try {
      await signOut()
      // Refresh page after logout to ensure clean state
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Get base navigation items based on role
  const baseNavMain = role === 'admin' ? adminSidebar : defaultSidebar

  // Prepend tenant slug to all tenant-scoped URLs
  const navMain = baseNavMain.map(item => {
    // Admin routes stay as-is (they're global)
    if (item.url.startsWith('/admin')) {
      return item
    }

    // Tenant-scoped routes need tenant slug prepended
    if (tenantSlug) {
      return {
        ...item,
        url: `/${tenantSlug}${item.url}`
      }
    }

    return item
  })
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Music className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Band Program</span>
                  <span className="truncate text-xs">Management System</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            ) : (
              <>
                <SidebarMenuButton asChild>
                  <Link href="/login">
                    <LogIn />
                    <span>Login</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild>
                  <Link href="/register">
                    <UserPlus />
                    <span>Sign Up</span>
                  </Link>
                </SidebarMenuButton>
              </>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
