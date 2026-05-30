import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Timestamp } from 'firebase/firestore'
import { SLA_HOURS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: Timestamp | Date | string | null | undefined): string {
  if (!date) return '—'
  const d = (date as Timestamp)?.toDate?.() ?? new Date(date as string)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatDate(date: Timestamp | Date | string | null | undefined): string {
  if (!date) return '—'
  const d = (date as Timestamp)?.toDate?.() ?? new Date(date as string)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getSLAStatus(r: {
  status?: string
  category?: string
  reportedAt?: Timestamp | null
}): 'overdue' | 'warning' | 'ok' | null {
  if (r.status === 'solved' || !r.category || !r.reportedAt) return null
  const sla = SLA_HOURS[r.category]
  if (!sla) return null
  const reported = (r.reportedAt as Timestamp)?.toDate?.() ?? new Date()
  const hrs = (Date.now() - reported.getTime()) / 3_600_000
  if (hrs / sla >= 1) return 'overdue'
  if (hrs / sla >= 0.75) return 'warning'
  return 'ok'
}

export function isProvincialRole(role: string): boolean {
  return ['provincial_admin', 'admin', 'super_admin'].includes(role)
}

export function exportToCSV(rows: Record<string, unknown>[], filename = 'export.csv') {
  if (!rows.length) return
  const keys = Object.keys(rows[0]!)
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(String(r[k] ?? ''))).join(','))].join('\n')
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  })
  a.click()
}
