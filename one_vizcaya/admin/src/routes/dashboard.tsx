import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthContext } from '@/lib/authContext'
import { Navbar } from '@/components/Navbar'
import { RoleBanner } from '@/components/RoleBanner'
import { LoadingScreen } from '@/components/LoadingScreen'

export const Route = createFileRoute('/dashboard')({ component: DashboardLayout })

function DashboardLayout() {
  const { user, loading, signOut } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => { if (!loading && !user) navigate({ to: '/' }) }, [user, loading, navigate])

  if (loading) return <LoadingScreen />
  if (!user)   return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onSignOut={signOut} />
      <RoleBanner user={user} />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-16">
        <Outlet />
      </main>
      <footer className="border-t bg-background py-4 text-center text-xs text-muted-foreground">
        One Vizcaya Admin Portal · Nueva Vizcaya Province
      </footer>
    </div>
  )
}
