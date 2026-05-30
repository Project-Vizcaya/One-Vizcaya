import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, limit, getDocs, type Timestamp } from 'firebase/firestore'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { timeAgo } from '@/lib/utils'

interface Entry { id: string; action: string; details: string; adminPhone: string; adminRole: string; timestamp: Timestamp | null }

export function AuditLog() {
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)))
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))
    },
    staleTime: 30_000,
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">📋 Audit Log</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto divide-y">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No audit entries yet</p>
          ) : data.map(e => (
            <div key={e.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold">{e.action}</span>
                  {e.details && <p className="text-xs text-muted-foreground mt-0.5">{e.details}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(e.timestamp)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{e.adminPhone} · {e.adminRole}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
