import { Link } from '@tanstack/react-router'
import { LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminUser } from '@/lib/authContext'
import { ROLE_LABELS } from '@/lib/constants'
import { isProvincialRole } from '@/lib/utils'

const NAV_LINKS: { to: string; label: string; adminOnly?: boolean }[] = [
  { to: '/dashboard',               label: 'Overview' },
  { to: '/dashboard/analytics',     label: 'Analytics' },
  { to: '/dashboard/announcements', label: 'Announcements' },
  { to: '/dashboard/users',         label: 'Users',  adminOnly: true },
  { to: '/dashboard/audit',         label: 'Audit',  adminOnly: true },
]

interface Props { user: AdminUser; onSignOut: () => void }

export function Navbar({ user, onSignOut }: Props) {
  const provincial = isProvincialRole(user.role)
  const roleLabel = (ROLE_LABELS[user.role] ?? 'Unknown') +
    (user.role === 'municipal_admin' ? ` — ${user.municipality}` : ' — All Municipalities')

  return (
    <header
      className="sticky top-0 z-50 text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/img/seals/nueva-vizcaya.png"
            alt="NV"
            className="w-10 h-10 rounded-full border-2 border-white/30 object-contain p-0.5 bg-white/10"
            onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight">One Vizcaya</div>
            <div className="text-[11px] opacity-60 hidden sm:block">Admin Portal</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.filter(l => !l.adminOnly || provincial).map(l => (
            <Link
              key={l.to}
              to={l.to as '/dashboard'}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition-all"
              activeProps={{ className: 'text-white bg-white/20' }}
              activeOptions={{ exact: l.to === '/dashboard' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 opacity-60" />
            <span className="text-xs font-medium opacity-80">{roleLabel}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-white/80 hover:text-white hover:bg-white/15 border border-white/20"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
