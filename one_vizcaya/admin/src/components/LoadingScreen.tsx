export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-[9999] text-white"
      style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }}
    >
      <img
        src="/img/seals/nueva-vizcaya.png"
        alt="NV Seal"
        className="w-16 h-16 rounded-full border-2 border-white/40 object-contain bg-white/10 p-0.5"
        onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
      />
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      <div className="text-center">
        <h2 className="text-xl font-bold">One Vizcaya Admin</h2>
        <p className="text-sm opacity-60 mt-1">Loading…</p>
      </div>
    </div>
  )
}
