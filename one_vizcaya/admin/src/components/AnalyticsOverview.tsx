import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { Report } from '../hooks/useReports'
import { MUNICIPALITIES } from '../lib/constants'
import { isProvincialRole } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

interface Props { reports: Report[]; loading: boolean; role: string }

const WEEKS = [4, 8, 12] as const
type WeekRange = typeof WEEKS[number]

export function AnalyticsOverview({ reports, loading, role }: Props) {
  const [trendWeeks, setTrendWeeks] = useState<WeekRange>(8)

  const stats = useMemo(() => {
    const byCat: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const byMuni: Record<string, { total: number; ongoing: number; solved: number; pending: number }> = {}

    for (const r of reports) {
      byCat[r.category] = (byCat[r.category] ?? 0) + 1
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
      if (!byMuni[r.municipality]) byMuni[r.municipality] = { total: 0, ongoing: 0, solved: 0, pending: 0 }
      byMuni[r.municipality]!.total++
      if (r.status === 'ongoing') byMuni[r.municipality]!.ongoing++
      else if (r.status === 'solved') byMuni[r.municipality]!.solved++
      else byMuni[r.municipality]!.pending++
    }

    // Weekly trend
    const now = Date.now()
    const weekBuckets = Array.from({ length: trendWeeks }, (_, i) => {
      const end   = now - i * 7 * 86_400_000
      const start = end - 7 * 86_400_000
      return reports.filter(r => {
        if (!r.reportedAt) return false
        const t = (r.reportedAt as { toDate(): Date }).toDate().getTime()
        return t >= start && t < end
      }).length
    }).reverse()

    const weekLabels = Array.from({ length: trendWeeks }, (_, i) => {
      const d = new Date(now - (trendWeeks - 1 - i) * 7 * 86_400_000)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })

    const resolutionRate = reports.length
      ? Math.round((byStatus['solved'] ?? 0) / reports.length * 100)
      : 0

    const avgResolutionHrs = (() => {
      const times = reports
        .filter(r => r.status === 'solved' && r.reportedAt && r.updatedAt)
        .map(r => ((r.updatedAt as { toDate(): Date }).toDate().getTime() - (r.reportedAt as { toDate(): Date }).toDate().getTime()) / 3_600_000)
      return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
    })()

    return { byCat, byStatus, byMuni, weekBuckets, weekLabels, resolutionRate, avgResolutionHrs }
  }, [reports, trendWeeks])

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-300 text-sm">Loading analytics…</div>

  const catEntries   = Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const statusColors = { reported: '#81C784', acknowledged: '#4DB6AC', under_review: '#CE93D8', ongoing: '#FFB74D', solved: '#66BB6A' }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports',    value: reports.length,               sub: 'All time' },
          { label: 'Resolution Rate',  value: `${stats.resolutionRate}%`,   sub: 'Reports solved' },
          { label: 'Avg Resolution',   value: `${stats.avgResolutionHrs}h`, sub: 'Time to solve' },
          { label: 'Open Reports',     value: reports.filter(r => r.status !== 'solved').length, sub: 'Active cases' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="text-3xl font-extrabold text-green-700 leading-none mb-1">{k.value}</div>
            <div className="text-sm font-semibold text-gray-600">{k.label}</div>
            <div className="text-xs text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">By Category</div>
            <div className="h-44">
              <Bar data={{ labels: catEntries.map(([k]) => k.slice(0, 20)), datasets: [{ data: catEntries.map(([,v]) => v), backgroundColor: '#81C784', borderRadius: 6 }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Status Breakdown</div>
            <div className="h-44">
              <Doughnut data={{
                labels: Object.keys(stats.byStatus),
                datasets: [{ data: Object.values(stats.byStatus), backgroundColor: Object.keys(stats.byStatus).map(k => (statusColors as Record<string,string>)[k] ?? '#CBD5E0'), borderWidth: 2 }]
              }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Report Trends</div>
              <div className="flex gap-1">
                {WEEKS.map(w => (
                  <button key={w} onClick={() => setTrendWeeks(w)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${trendWeeks === w ? 'bg-green-700 border-green-700 text-white' : 'border-gray-200 text-gray-500'}`}>
                    {w}w
                  </button>
                ))}
              </div>
            </div>
            <div className="h-44">
              <Line data={{
                labels: stats.weekLabels,
                datasets: [{ label: 'Reports', data: stats.weekBuckets, borderColor: '#2E7D32', backgroundColor: 'rgba(46,125,50,.1)', fill: true, tension: 0.3, pointRadius: 3 }]
              }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
            </div>
          </div>
        </div>

        {/* Municipality breakdown — provincial only */}
        {isProvincialRole(role) && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Municipality Breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Municipality','Total','Pending','Ongoing','Solved','Res. Rate'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide border-b-2 border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MUNICIPALITIES.map(m => {
                    const d = stats.byMuni[m]
                    if (!d?.total) return null
                    return (
                      <tr key={m} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-800">{m}</td>
                        <td className="px-3 py-2 text-gray-600">{d.total}</td>
                        <td className="px-3 py-2 text-gray-500">{d.pending}</td>
                        <td className="px-3 py-2 text-orange-600">{d.ongoing}</td>
                        <td className="px-3 py-2 text-green-700">{d.solved}</td>
                        <td className="px-3 py-2 text-gray-600">{d.total ? Math.round(d.solved / d.total * 100) : 0}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
