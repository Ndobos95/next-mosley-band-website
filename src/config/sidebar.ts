import { Calendar, CreditCard, FileText, LayoutDashboard, Heart, UserPlus } from "lucide-react"

export const defaultSidebar = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Payments", 
      url: "/pay",
      icon: CreditCard,
    },
    {
      title: "Donate",
      url: "/donate",
      icon: Heart,
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
  ]

  export const adminSidebar = [
    {
      title: "Invites",
      url: "/admin/invites",
      icon: UserPlus,
    },
  ]