import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, limit, getDocs, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { timeAgo } from '../lib/utils'

interface AuditEntry {
  id: string
  action: string
  details: string
  adminPhone: string
  adminRole: string
  timestamp: Timestamp | null
}

export function AuditLog() {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)))
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditEntry))
    },
    staleTime: 30_000,
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="font-bold text-gray-800">📋 Audit Log</div>
        <button onClick={() => refetch()}
          className="border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50">
          🔄 Refresh
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-300 text-sm">Loading…</div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm">No audit entries</div>
        ) : data.map(e => (
          <div key={e.id} className="px-5 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-gray-800">{e.action}</span>
                {e.details && <p className="text-xs text-gray-500 mt-0.5">{e.details}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(e.timestamp)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">{e.adminPhone} · {e.adminRole}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
