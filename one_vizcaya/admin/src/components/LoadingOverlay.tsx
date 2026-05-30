export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-[9999] text-white"
      style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }}>
      <img src="/img/seals/nueva-vizcaya.png" alt="NV Seal"
        className="w-18 h-18 rounded-full border-2 border-white/40 object-contain bg-white/10 p-0.5"
        style={{ width: 72, height: 72 }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <div className="w-14 h-14 border-4 border-white/25 border-t-white rounded-full animate-spin" />
      <h2 className="text-2xl font-extrabold tracking-tight mt-1">One Vizcaya Admin</h2>
      <p className="text-sm opacity-65">Loading dashboard…</p>
    </div>
  )
}
