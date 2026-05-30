import { useMemo } from 'react'
import { FileText, AlertTriangle, Wrench, CheckCircle, UserX, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Report } from '@/hooks/useReports'
import { getSLAStatus } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  sub: string
  icon: React.ReactNode
  className?: string
}

function StatCard({ label, value, sub, icon, className = '' }: StatCardProps) {
  return (
    <Card className={`overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md cursor-default ${className}`}>
      <div className="h-1 w-full" style={{ background: 'inherit' }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-sm font-medium text-foreground mt-1">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsGrid({ reports, loading }: { reports: Report[]; loading: boolean }) {
  const s = useMemo(() => {
    const total      = reports.length
    const critical   = reports.filter(r => r.priority === 'critical' && r.status !== 'solved').length
    const ongoing    = reports.filter(r => r.status === 'ongoing').length
    const solved     = reports.filter(r => r.status === 'solved').length
    const unassigned = reports.filter(r => !r.assignedTo && r.status !== 'solved').length
    const overdue    = reports.filter(r => getSLAStatus(r) === 'overdue').length

    const times = reports
      .filter(r => r.status === 'solved' && r.reportedAt && r.updatedAt)
      .map(r => ((r.updatedAt as { toDate(): Date }).toDate().getTime() - (r.reportedAt as { toDate(): Date }).toDate().getTime()) / 3_600_000)
    const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null

    return { total, critical, ongoing, solved, unassigned, overdue, avgTime }
  }, [reports])

  const v = (n: number) => loading ? '—' : n

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Reports" value={v(s.total)} sub="All reports"
          icon={<FileText className="h-5 w-5 text-primary" />}
          className="border-l-4 border-l-primary"
        />
        <StatCard
          label="Critical Open" value={v(s.critical)} sub="Needs immediate action"
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          className="border-l-4 border-l-destructive"
        />
        <StatCard
          label="Ongoing" value={v(s.ongoing)} sub="In progress"
          icon={<Wrench className="h-5 w-5 text-orange-600" />}
          className="border-l-4 border-l-orange-500"
        />
        <StatCard
          label="Resolved" value={v(s.solved)} sub={s.avgTime ? `Avg ${s.avgTime}h resolution` : 'Computing…'}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          className="border-l-4 border-l-green-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <StatCard
          label="Unassigned" value={v(s.unassigned)} sub="No responder yet"
          icon={<UserX className="h-5 w-5 text-muted-foreground" />}
          className="border-l-4 border-l-muted"
        />
        <StatCard
          label="Overdue" value={v(s.overdue)} sub="Past SLA deadline"
          icon={<Clock className="h-5 w-5 text-destructive" />}
          className="border-l-4 border-l-destructive"
        />
      </div>
    </div>
  )
}
