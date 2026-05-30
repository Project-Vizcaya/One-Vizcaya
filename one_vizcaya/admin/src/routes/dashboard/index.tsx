import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '../../lib/authContext'
import { useToastContext } from '../../lib/toastContext'
import { StatsGrid } from '../../components/StatsGrid'
import { InteractiveMap } from '../../components/InteractiveMap'
import { ReportsTable } from '../../components/ReportsTable'
import { ResponderDirectory } from '../../components/ResponderDirectory'
import { useReports } from '../../hooks/useReports'



export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

function DashboardHome() {
  const { user } = useAuthContext()
  const addToast = useToastContext()
  const { reports, loading, updateReportStatus, updateReportNote, assignReport, deleteReport } = useReports(
    user!.role,
    user!.municipality,
  )

  return (
    <div className="space-y-6">
      <StatsGrid reports={reports} loading={loading} />
      <InteractiveMap reports={reports} role={user!.role} municipality={user!.municipality} />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <ReportsTable
          reports={reports}
          loading={loading}
          role={user!.role}
          currentUser={user!}
          onUpdateStatus={updateReportStatus}
          onUpdateNote={updateReportNote}
          onAssign={assignReport}
          onDelete={deleteReport}
          onToast={addToast}
        />
        <ResponderDirectory role={user!.role} municipality={user!.municipality} onToast={addToast} />
      </div>
    </div>
  )
}
