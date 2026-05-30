import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../lib/authContext'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
})
