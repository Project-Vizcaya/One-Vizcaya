import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/authContext'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  ),
})
