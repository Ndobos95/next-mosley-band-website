import { requireAuth } from "@/lib/auth-server"
import { DashboardContent } from "@/components/dashboard-content"

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await requireAuth()
  const user = session.user

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardContent initialUser={user} />
    </div>
  )
}
