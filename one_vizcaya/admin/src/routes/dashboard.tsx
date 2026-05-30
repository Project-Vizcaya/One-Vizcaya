import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthContext } from '../lib/authContext'
import { Navbar } from '../components/Navbar'
import { RoleBanner } from '../components/RoleBanner'
import { ToastContainer } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { ToastContext } from '../lib/toastContext'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { user, loading, signOut } = useAuthContext()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/' })
  }, [user, loading, navigate])

  if (loading) return <LoadingOverlay />
  if (!user) return null

  return (
    <ToastContext.Provider value={addToast}>
      <div className="min-h-screen bg-slate-100 font-sans">
        <Navbar user={user} onSignOut={signOut} />
        <RoleBanner user={user} />
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-14">
          <Outlet />
        </main>
        <footer className="text-center py-5 text-xs text-gray-400">
          One Vizcaya Admin — Nueva Vizcaya Province &nbsp;|&nbsp;
          <span className="text-gray-500 font-semibold">⌨ Press ? for shortcuts</span>
        </footer>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ToastContext.Provider>
  )
}
