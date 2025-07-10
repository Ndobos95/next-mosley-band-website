"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, CreditCard, FileText, LogIn, LogOut, LayoutDashboard } from "lucide-react"
import { useSession, signOut } from "@/lib/auth-client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

// Band program navigation data
const data = {
  navMain: [
    {
      title: "Band Program",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Payments",
          url: "/payments",
          icon: CreditCard,
        },
        {
          title: "Files",
          url: "/files",
          icon: FileText,
        },
        {
          title: "Calendar",
          url: "/calendar",
          icon: Calendar,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  const handleLogout = async () => {
    try {
      await signOut()
      // No page reload needed - better-auth handles this gracefully
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <h2 className="text-lg font-semibold px-4 py-2">Band Program</h2>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((menuItem) => (
                  <SidebarMenuItem key={menuItem.title}>
                    <SidebarMenuButton asChild>
                      <Link href={menuItem.url}>
                        <menuItem.icon />
                        <span>{menuItem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {session?.user ? (
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
