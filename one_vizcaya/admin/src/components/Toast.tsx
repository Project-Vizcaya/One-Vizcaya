import type { Toast } from '../hooks/useToast'

interface Props {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => onRemove(t.id)}
          className="pointer-events-auto animate-slide-up cursor-pointer"
          style={{ animation: 'slideUp .3s ease' }}>
          {t.type === 'new-report' ? (
            <div className="bg-white border-l-4 border-green-400 rounded-xl shadow-xl px-4 py-3 min-w-[240px] max-w-[300px]">
              <div className="text-sm font-extrabold text-green-700 mb-0.5">{t.title}</div>
              <div className="text-xs text-gray-600">{t.sub}</div>
            </div>
          ) : (
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-xl max-w-xs ${
              t.type === 'success' ? 'bg-green-700 text-white' :
              t.type === 'error'   ? 'bg-red-600 text-white' :
              'bg-gray-900 text-white'
            }`}>
              {t.message}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
