import type { AdminUser } from '../hooks/useAuth'
import { MUNI_SEALS } from '../lib/constants'
import { isProvincialRole } from '../lib/utils'

export function RoleBanner({ user }: { user: AdminUser }) {
  const isProvincial = isProvincialRole(user.role)
  const sealUrl = isProvincial ? '/img/seals/nueva-vizcaya.png' : MUNI_SEALS[user.municipality]

  return (
    <div className={`px-6 py-2.5 flex items-center gap-2.5 text-sm font-semibold text-white ${
      isProvincial
        ? 'bg-gradient-to-r from-green-900 via-green-700 to-green-600'
        : 'bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600'
    }`}>
      {sealUrl && (
        <img src={sealUrl} alt="seal" className="w-8 h-8 rounded-full object-contain border border-white/30 bg-white/10 p-0.5"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
      {isProvincial
        ? '🏛️ Provincial View — Monitoring all 15 municipalities of Nueva Vizcaya'
        : `📍 Municipal View — ${user.municipality} only`}
    </div>
  )
}
