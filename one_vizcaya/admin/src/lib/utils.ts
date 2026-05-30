import type { Timestamp } from 'firebase/firestore'
import { SLA_HOURS } from './constants'

export function timeAgo(date: Timestamp | Date | string | null | undefined): string {
  if (!date) return '—'
  const d = (date as Timestamp)?.toDate?.() ?? new Date(date as string)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function getSLAStatus(report: { status?: string; category?: string; reportedAt?: Timestamp | null }): 'overdue' | 'warning' | 'ok' | null {
  if (report.status === 'solved' || !report.category || !report.reportedAt) return null
  const sla = SLA_HOURS[report.category]
  if (!sla) return null
  const reported = (report.reportedAt as Timestamp)?.toDate?.() ?? new Date()
  const hoursElapsed = (Date.now() - reported.getTime()) / 3_600_000
  const pct = hoursElapsed / sla
  if (pct >= 1) return 'overdue'
  if (pct >= 0.75) return 'warning'
  return 'ok'
}

export function authorColor(name: string): string {
  let hash = 0
  for (const c of name || 'A') hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360},50%,45%)`
}

export function isProvincialRole(role: string): boolean {
  return ['provincial_admin', 'admin', 'super_admin'].includes(role)
}

export function formatDate(date: Timestamp | Date | string | null | undefined): string {
  if (!date) return '—'
  const d = (date as Timestamp)?.toDate?.() ?? new Date(date as string)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function exportToCSV(reports: Record<string, unknown>[], filename = 'reports.csv') {
  if (!reports.length) return
  const keys = Object.keys(reports[0]!)
  const csv = [
    keys.join(','),
    ...reports.map(r =>
      keys.map(k => JSON.stringify(String((r as Record<string, unknown>)[k] ?? ''))).join(',')
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
