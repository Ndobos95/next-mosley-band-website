import * as React from "react"
import { Calendar, CreditCard, FileText, LogIn } from "lucide-react"

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
                      <a href={menuItem.url}>
                        <menuItem.icon />
                        <span>{menuItem.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Button variant="outline" className="w-full justify-start" asChild>
          <a href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </a>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
