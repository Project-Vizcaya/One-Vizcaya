import { useMemo, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Report } from '@/hooks/useReports'
import { MUNICIPALITIES } from '@/lib/constants'
import { isProvincialRole } from '@/lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const CHART_OPTS = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

export function AnalyticsOverview({ reports, loading, role }: { reports: Report[]; loading: boolean; role: string }) {
  const [weeks, setWeeks] = useState(8)

  const d = useMemo(() => {
    const byCat: Record<string, number>    = {}
    const byStatus: Record<string, number> = {}
    const byMuni: Record<string, { total: number; pending: number; ongoing: number; solved: number }> = {}

    for (const r of reports) {
      byCat[r.category]    = (byCat[r.category]    ?? 0) + 1
      byStatus[r.status]   = (byStatus[r.status]   ?? 0) + 1
      if (!byMuni[r.municipality]) byMuni[r.municipality] = { total: 0, pending: 0, ongoing: 0, solved: 0 }
      byMuni[r.municipality]!.total++
      if (r.status === 'solved') byMuni[r.municipality]!.solved++
      else if (r.status === 'ongoing') byMuni[r.municipality]!.ongoing++
      else byMuni[r.municipality]!.pending++
    }

    const now = Date.now()
    const trendData = Array.from({ length: weeks }, (_, i) => {
      const end = now - i * 7 * 86_400_000, start = end - 7 * 86_400_000
      return reports.filter(r => { if (!r.reportedAt) return false; const t = (r.reportedAt as { toDate(): Date }).toDate().getTime(); return t >= start && t < end }).length
    }).reverse()
    const trendLabels = Array.from({ length: weeks }, (_, i) => {
      const d = new Date(now - (weeks - 1 - i) * 7 * 86_400_000)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })

    const resolved = reports.filter(r => r.status === 'solved').length
    const resRate  = reports.length ? Math.round(resolved / reports.length * 100) : 0
    const times    = reports.filter(r => r.status === 'solved' && r.reportedAt && r.updatedAt).map(r => ((r.updatedAt as { toDate(): Date }).toDate().getTime() - (r.reportedAt as { toDate(): Date }).toDate().getTime()) / 3_600_000)
    const avgTime  = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0

    return { byCat, byStatus, byMuni, trendData, trendLabels, resRate, avgTime, open: reports.filter(r => r.status !== 'solved').length }
  }, [reports, weeks])

  const catEntries = Object.entries(d.byCat).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const statusColors = ['#81C784','#4DB6AC','#CE93D8','#FFB74D','#66BB6A']

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports',    value: reports.length },
          { label: 'Resolution Rate',  value: `${d.resRate}%` },
          { label: 'Avg Resolution',   value: `${d.avgTime}h` },
          { label: 'Open Reports',     value: d.open },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-3xl font-bold text-primary">{loading ? '—' : k.value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="charts">
            <TabsList className="mb-4">
              <TabsTrigger value="charts">Charts</TabsTrigger>
              {isProvincialRole(role) && <TabsTrigger value="breakdown">Municipality Breakdown</TabsTrigger>}
            </TabsList>

            <TabsContent value="charts">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Category</p>
                  <div className="h-48">
                    <Bar data={{ labels: catEntries.map(([k]) => k.slice(0, 20)), datasets: [{ data: catEntries.map(([,v]) => v), backgroundColor: '#86EFAC', borderRadius: 6 }] }}
                      options={{ ...CHART_OPTS, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status Breakdown</p>
                  <div className="h-48">
                    <Doughnut data={{ labels: Object.keys(d.byStatus), datasets: [{ data: Object.values(d.byStatus), backgroundColor: statusColors, borderWidth: 2 }] }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trends</p>
                    <div className="flex gap-1">
                      {[4, 8, 12].map(w => (
                        <Button key={w} variant={weeks === w ? 'default' : 'outline'} size="sm" onClick={() => setWeeks(w)} className="h-6 px-2 text-xs">{w}w</Button>
                      ))}
                    </div>
                  </div>
                  <div className="h-48">
                    <Line data={{ labels: d.trendLabels, datasets: [{ label: 'Reports', data: d.trendData, borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,.1)', fill: true, tension: 0.3, pointRadius: 3 }] }}
                      options={{ ...CHART_OPTS, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {isProvincialRole(role) && (
              <TabsContent value="breakdown">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        {['Municipality','Total','Pending','Ongoing','Solved','Rate'].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MUNICIPALITIES.map(m => {
                        const row = d.byMuni[m]; if (!row?.total) return null
                        return (
                          <tr key={m} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium">{m}</td>
                            <td className="py-2.5 px-3">{row.total}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{row.pending}</td>
                            <td className="py-2.5 px-3 text-orange-600">{row.ongoing}</td>
                            <td className="py-2.5 px-3 text-green-700">{row.solved}</td>
                            <td className="py-2.5 px-3 font-medium">{Math.round(row.solved / row.total * 100)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
