import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '../../lib/authContext'
import { useToastContext } from '../../lib/toastContext'
import { UserManagement } from '../../components/UserManagement'
import { isProvincialRole } from '../../lib/utils'

export const Route = createFileRoute('/dashboard/users')({
  component: UsersPage,
})

function UsersPage() {
  const { user } = useAuthContext()
  const addToast = useToastContext()

  if (!user || !isProvincialRole(user.role)) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-gray-500 text-sm">Access restricted to Provincial Admins.</p>
      </div>
    )
  }

  return <UserManagement onToast={addToast} />
}
