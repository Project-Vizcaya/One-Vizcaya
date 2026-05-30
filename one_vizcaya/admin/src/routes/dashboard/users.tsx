import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthContext } from '@/lib/authContext'
import { UserManagement } from '@/components/UserManagement'
import { isProvincialRole } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/users')({ component: UsersPage })

function UsersPage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !isProvincialRole(user.role)) navigate({ to: '/dashboard' })
  }, [user, navigate])

  if (!user || !isProvincialRole(user.role)) return null

  return <UserManagement />
}
