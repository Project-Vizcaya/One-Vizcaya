import { useMemo } from 'react'
import type { Report } from '../hooks/useReports'
import { getSLAStatus } from '../lib/utils'

interface Props {
  reports: Report[]
  loading: boolean
}

interface StatCardProps {
  value: number | string
  label: string
  sub: string
  icon: string
  color: 'green' | 'red' | 'orange' | 'gray'
  onClick?: () => void
}

const COLOR = {
  green:  { strip: 'from-green-900 to-green-400', icon: 'bg-green-50', value: 'text-green-700' },
  red:    { strip: 'from-red-900 to-red-400',     icon: 'bg-red-50',   value: 'text-red-700'   },
  orange: { strip: 'from-orange-700 to-orange-400', icon: 'bg-orange-50', value: 'text-orange-700' },
  gray:   { strip: 'from-gray-500 to-gray-300',   icon: 'bg-gray-50',  value: 'text-gray-500'  },
}

function StatCard({ value, label, sub, icon, color, onClick }: StatCardProps) {
  const c = COLOR[color]
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all">
      <div className={`h-1.5 bg-gradient-to-r ${c.strip}`} />
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className={`text-4xl font-extrabold leading-none tracking-tight ${c.value}`}>
            {value}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${c.icon}`}>{icon}</div>
        </div>
        <div className="text-sm font-semibold text-gray-600">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}

export function StatsGrid({ reports, loading }: Props) {
  const stats = useMemo(() => {
    const total    = reports.length
    const critical = reports.filter(r => r.priority === 'critical' && r.status !== 'solved').length
    const ongoing  = reports.filter(r => r.status === 'ongoing').length
    const solved   = reports.filter(r => r.status === 'solved').length
    const unassigned = reports.filter(r => !r.assignedTo && r.status !== 'solved').length
    const overdue  = reports.filter(r => getSLAStatus(r) === 'overdue').length

    const resolvedTimes = reports
      .filter(r => r.status === 'solved' && r.reportedAt && r.updatedAt)
      .map(r => {
        const s = (r.reportedAt as { toDate(): Date }).toDate().getTime()
        const e = (r.updatedAt as { toDate(): Date }).toDate().getTime()
        return (e - s) / 3_600_000
      })
    const avgTime = resolvedTimes.length
      ? Math.round(resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length)
      : null

    return { total, critical, ongoing, solved, unassigned, overdue, avgTime }
  }, [reports])

  const dash = loading ? '—' : ''

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={loading ? dash : stats.total}    label="Total Reports"  sub="Province-wide"            icon="📋" color="green" />
        <StatCard value={loading ? dash : stats.critical} label="Critical Open"  sub="Needs immediate action"   icon="🚨" color="red" />
        <StatCard value={loading ? dash : stats.ongoing}  label="Ongoing"        sub="In progress"              icon="🔧" color="orange" />
        <StatCard value={loading ? dash : stats.solved}   label="Resolved"       sub={stats.avgTime ? `Avg ${stats.avgTime}h` : 'Computing…'} icon="✅" color="green" />
      </div>
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard value={loading ? dash : stats.unassigned} label="Unassigned" sub="No responder assigned yet" icon="👤" color="gray" />
        <StatCard value={loading ? dash : stats.overdue}    label="Overdue"    sub="Past SLA deadline"         icon="⏰" color="red" />
      </div>
    </div>
  )
}
