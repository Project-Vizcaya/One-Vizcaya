import { useEffect, useRef, useState } from 'react'
import type { Report } from '../hooks/useReports'
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from '../lib/firebase'
import { isProvincialRole } from '../lib/utils'

declare global {
  interface Window {
    google: typeof google
    initGoogleMap: () => void
    gm_authFailure: () => void
  }
}

interface Props {
  reports: Report[]
  role: string
  municipality: string
}

export function InteractiveMap({ reports, role, municipality }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapObj      = useRef<google.maps.Map | null>(null)
  const heatmapObj  = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  const pinsRef     = useRef<google.maps.Marker[]>([])
  const [mapError, setMapError]       = useState('')
  const [showHeat, setShowHeat]       = useState(true)
  const [showPins, setShowPins]       = useState(false)
  const [muniFilter, setMuniFilter]   = useState('all')

  useEffect(() => {
    if (window.google?.maps) { initMap(); return }
    window.initGoogleMap = () => initMap()
    window.gm_authFailure = () => setMapError('Google Maps API key error. Check billing and restrictions.')
    if (!document.getElementById('gmap-script')) {
      const s = document.createElement('script')
      s.id = 'gmap-script'
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=visualization&callback=initGoogleMap&loading=async`
      s.async = true
      document.head.appendChild(s)
    }
  }, [])

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center: NV_CENTER,
      zoom: NV_ZOOM,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HL = window.google.maps.visualization.HeatmapLayer as any
      heatmapObj.current = new HL({
        map: showHeat ? mapObj.current : null,
        radius: 40,
        gradient: ['rgba(0,0,0,0)', 'rgba(0,200,83,1)', 'rgba(100,221,23,1)', 'rgba(255,214,0,1)', 'rgba(255,109,0,1)', 'rgba(213,0,0,1)'],
      }) as google.maps.visualization.HeatmapLayer
    } catch { /* visualization not available */ }
  }

  // Update heatmap data when reports change
  useEffect(() => {
    const layer = heatmapObj.current as (google.maps.visualization.HeatmapLayer & { setData?: (d: google.maps.LatLng[]) => void }) | null
    if (!layer?.setData || !window.google?.maps) return
    const points = reports
      .filter(r => r.latitude && r.longitude && (muniFilter === 'all' || r.municipality === muniFilter))
      .map(r => new window.google.maps.LatLng(r.latitude!, r.longitude!))
    layer.setData(points)
  }, [reports, muniFilter])

  // Update report pins
  useEffect(() => {
    if (!mapObj.current || !window.google?.maps) return
    pinsRef.current.forEach(m => m.setMap(null))
    pinsRef.current = []
    if (!showPins) return
    const shown = reports.filter(r => r.latitude && r.longitude && (muniFilter === 'all' || r.municipality === muniFilter))
    pinsRef.current = shown.map(r => {
      const m = new window.google.maps.Marker({
        position: { lat: r.latitude!, lng: r.longitude! },
        map: mapObj.current!,
        title: r.category,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: r.priority === 'critical' ? '#D50000' : r.priority === 'high' ? '#FF6D00' : '#2E7D32',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 1.5,
        },
      })
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:13px">${r.category}</div>
          <div style="font-size:11px;color:#718096">${r.municipality} · ${r.status}</div>
          <div style="font-size:12px;color:#4A5568;margin-top:4px">${r.description?.slice(0, 100) ?? ''}</div>
        </div>`,
      })
      m.addListener('click', () => iw.open(mapObj.current, m))
      return m
    })
  }, [reports, showPins, muniFilter])

  function toggleHeat() {
    setShowHeat(v => {
      if (heatmapObj.current) (heatmapObj.current as google.maps.visualization.HeatmapLayer & { setMap?: (m: google.maps.Map | null) => void }).setMap?.(!v ? mapObj.current : null)
      return !v
    })
  }

  function togglePins() { setShowPins(v => !v) }

  if (mapError) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-3xl mb-2">🗺️</div>
        <p className="text-red-600 font-semibold text-sm">{mapError}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-sm">📍 Report Heatmap &amp; Responder Locations</span>
        <span className="text-xs text-gray-400">
          {isProvincialRole(role) ? 'Nueva Vizcaya Province' : municipality}
        </span>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-center">
        <ToggleBtn active={showHeat}  onClick={toggleHeat}  label="🔥 Heatmap" activeClass="bg-orange-600 border-orange-600" />
        <ToggleBtn active={showPins}  onClick={togglePins}  label="📌 Report Pins" />
        <select value={muniFilter} onChange={e => setMuniFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white outline-none ml-auto">
          <option value="all">All Municipalities</option>
          {['Ambaguio','Aritao','Bagabag','Bambang','Bayombong','Diadi','Dupax del Norte','Dupax del Sur','Kasibu','Kayapa','Quezon','Santa Fe','Solano','Villaverde','Alfonso Castañeda'].map(m =>
            <option key={m} value={m}>{m}</option>
          )}
        </select>
      </div>

      <div ref={mapRef} style={{ height: 440 }} className="w-full" />

      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-gray-500 items-center">
        <strong className="text-gray-400 mr-1">Heatmap:</strong>
        {[['#00C853','Low'],['#FFD600','Medium'],['#FF6D00','High'],['#D50000','Critical']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}

function ToggleBtn({ active, onClick, label, activeClass = 'bg-green-700 border-green-700' }: { active: boolean; onClick: () => void; label: string; activeClass?: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
        active ? `${activeClass} text-white` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
      }`}>
      {label}
    </button>
  )
}
