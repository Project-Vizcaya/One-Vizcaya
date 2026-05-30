import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '../../lib/authContext'
import { AuditLog } from '../../components/AuditLog'
import { isProvincialRole } from '../../lib/utils'

export const Route = createFileRoute('/dashboard/audit')({
  component: AuditPage,
})

function AuditPage() {
  const { user } = useAuthContext()

  if (!user || !isProvincialRole(user.role)) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-gray-500 text-sm">Access restricted to Provincial Admins.</p>
      </div>
    )
  }

  return <AuditLog />
}
