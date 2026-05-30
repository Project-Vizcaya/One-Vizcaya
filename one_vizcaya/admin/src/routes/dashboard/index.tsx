import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '@/lib/authContext'
import { useReports } from '@/hooks/useReports'
import { StatsGrid } from '@/components/StatsGrid'
import { InteractiveMap } from '@/components/InteractiveMap'
import { ReportsTable } from '@/components/ReportsTable'
import { ResponderDirectory } from '@/components/ResponderDirectory'

export const Route = createFileRoute('/dashboard/')({ component: DashboardHome })

function DashboardHome() {
  const { user } = useAuthContext()
  const { reports, loading, updateStatus, updateNote, assign, remove } = useReports(user!.role, user!.municipality)

  return (
    <div className="space-y-6">
      <StatsGrid reports={reports} loading={loading} />
      <InteractiveMap reports={reports} role={user!.role} municipality={user!.municipality} />
      <ReportsTable
        reports={reports}
        loading={loading}
        currentUser={user!}
        onUpdateStatus={updateStatus}
        onUpdateNote={updateNote}
        onAssign={assign}
        onDelete={remove}
      />
      <ResponderDirectory />
    </div>
  )
}
