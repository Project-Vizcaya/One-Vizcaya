import type { AdminUser } from '@/lib/authContext'
import { MUNI_SEALS } from '@/lib/constants'
import { isProvincialRole } from '@/lib/utils'

export function RoleBanner({ user }: { user: AdminUser }) {
  const provincial = isProvincialRole(user.role)
  const sealUrl = provincial ? '/img/seals/nueva-vizcaya.png' : MUNI_SEALS[user.municipality]

  return (
    <div
      className={`flex items-center gap-2.5 px-6 py-2 text-sm font-medium text-white ${
        provincial
          ? 'bg-gradient-to-r from-green-900 via-green-700 to-green-600'
          : 'bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600'
      }`}
    >
      {sealUrl && (
        <img
          src={sealUrl}
          alt="seal"
          className="w-7 h-7 rounded-full object-contain bg-white/10 border border-white/25 p-0.5"
          onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
      <span className="opacity-90">
        {provincial
          ? '🏛️ Provincial View — Monitoring all 15 municipalities of Nueva Vizcaya'
          : `📍 Municipal View — ${user.municipality} only`}
      </span>
    </div>
  )
}
