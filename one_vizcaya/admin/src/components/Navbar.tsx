import { Link } from '@tanstack/react-router'
import type { AdminUser } from '../hooks/useAuth'
import { ROLE_LABELS } from '../lib/constants'
import { isProvincialRole } from '../lib/utils'

interface Props {
  user: AdminUser
  onSignOut: () => void
}

const NAV_LINKS = [
  { to: '/dashboard',              label: '📊 Overview' },
  { to: '/dashboard/analytics',    label: '📈 Analytics' },
  { to: '/dashboard/announcements',label: '📢 Announcements' },
  { to: '/dashboard/users',        label: '👥 Users',  adminOnly: true },
  { to: '/dashboard/audit',        label: '📋 Audit',  adminOnly: true },
]

export function Navbar({ user, onSignOut }: Props) {
  const isProvincial = isProvincialRole(user.role)
  const roleLabel = (ROLE_LABELS[user.role] ?? 'Unknown') +
    (user.role === 'municipal_admin' ? ` — ${user.municipality}` : ' — All Municipalities')

  const links = NAV_LINKS.filter(l => !l.adminOnly || isProvincial)

  return (
    <nav className="sticky top-0 z-50 text-white shadow-xl"
      style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)', height: 68 }}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">

        <div className="flex items-center gap-3 shrink-0">
          <img src="/img/seals/nueva-vizcaya.png" alt="NV" className="w-12 h-12 rounded-full border-2 border-white/40 object-contain p-0.5 bg-white/10"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <div className="text-lg font-extrabold tracking-tight leading-tight">One Vizcaya Admin</div>
            <div className="text-xs opacity-70 hidden sm:block">Nueva Vizcaya · Emergency Management</div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white/80 hover:text-white hover:bg-white/15 transition-all"
              activeProps={{ className: 'bg-white/20 text-white' }}
              activeOptions={{ exact: l.to === '/dashboard' }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`hidden sm:block rounded-full px-3 py-1 text-xs font-bold border ${
            isProvincial ? 'bg-white/20 border-white/40' : 'bg-yellow-500 border-yellow-400'
          }`}>{roleLabel}</span>
          <span className="text-xs opacity-70 hidden md:block">{user.phoneNumber}</span>
          <button onClick={onSignOut}
            className="bg-white/15 border border-white/35 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/25 transition-all">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
