import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '@/lib/authContext'
import { useReports } from '@/hooks/useReports'
import { AnalyticsOverview } from '@/components/AnalyticsOverview'

export const Route = createFileRoute('/dashboard/analytics')({ component: AnalyticsPage })

function AnalyticsPage() {
  const { user } = useAuthContext()
  const { reports, loading } = useReports(user!.role, user!.municipality)

  return <AnalyticsOverview reports={reports} loading={loading} role={user!.role} />
}
