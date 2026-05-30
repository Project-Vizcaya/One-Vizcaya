import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Report } from '@/hooks/useReports'
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from '@/lib/firebase'
import { isProvincialRole } from '@/lib/utils'
import { MUNICIPALITIES } from '@/lib/constants'

declare global {
  interface Window {
    initGoogleMap: () => void
    gm_authFailure: () => void
  }
}

interface Props { reports: Report[]; role: string; municipality: string }

export function InteractiveMap({ reports, role, municipality }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObj     = useRef<google.maps.Map | null>(null)
  const heatmapObj = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  const pinsRef    = useRef<google.maps.Marker[]>([])
  const [mapError, setMapError]     = useState('')
  const [showHeat, setShowHeat]     = useState(true)
  const [showPins, setShowPins]     = useState(false)
  const [muniFilter, setMuniFilter] = useState('all')

  useEffect(() => {
    if (window.google?.maps) { initMap(); return }
    window.initGoogleMap = () => initMap()
    window.gm_authFailure = () => setMapError('Maps API key error.')
    if (document.getElementById('gmap-script')) return
    const s = document.createElement('script')
    s.id = 'gmap-script'
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=visualization&callback=initGoogleMap&loading=async`
    s.async = true
    document.head.appendChild(s)
  }, [])

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center: NV_CENTER, zoom: NV_ZOOM, mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HL = window.google.maps.visualization.HeatmapLayer as any
      heatmapObj.current = new HL({ map: mapObj.current, radius: 40, gradient: ['rgba(0,0,0,0)','rgba(0,200,83,1)','rgba(100,221,23,1)','rgba(255,214,0,1)','rgba(255,109,0,1)','rgba(213,0,0,1)'] })
    } catch { /* visualization optional */ }
  }

  useEffect(() => {
    if (!window.google?.maps) return
    const hl = heatmapObj.current as (google.maps.visualization.HeatmapLayer & { setData?: (d: google.maps.LatLng[]) => void }) | null
    if (!hl?.setData) return
    const pts = reports.filter(r => r.latitude && r.longitude && (muniFilter === 'all' || r.municipality === muniFilter))
      .map(r => new window.google.maps.LatLng(r.latitude!, r.longitude!))
    hl.setData(pts)
  }, [reports, muniFilter])

  useEffect(() => {
    if (!mapObj.current || !window.google?.maps) return
    pinsRef.current.forEach(m => m.setMap(null)); pinsRef.current = []
    if (!showPins) return
    pinsRef.current = reports.filter(r => r.latitude && r.longitude && (muniFilter === 'all' || r.municipality === muniFilter))
      .map(r => {
        const m = new window.google.maps.Marker({
          position: { lat: r.latitude!, lng: r.longitude! }, map: mapObj.current!,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: r.priority === 'critical' ? '#D50000' : r.priority === 'high' ? '#FF6D00' : '#2E7D32', fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 1.5 },
        })
        new window.google.maps.InfoWindow({ content: `<div style="font-family:Inter,sans-serif"><b>${r.category}</b><br/><span style="color:#666;font-size:12px">${r.municipality} · ${r.status}</span></div>` })
          .open(mapObj.current, m)
        return m
      })
  }, [reports, showPins, muniFilter])

  function toggleHeat() {
    setShowHeat(v => {
      const hl = heatmapObj.current as (google.maps.visualization.HeatmapLayer & { setMap?: (m: google.maps.Map | null) => void }) | null
      hl?.setMap?.(!v ? mapObj.current : null)
      return !v
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">📍 Report Heatmap</CardTitle>
          <span className="text-xs text-muted-foreground">{isProvincialRole(role) ? 'Nueva Vizcaya Province' : municipality}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <Button variant={showHeat ? 'default' : 'outline'} size="sm" onClick={toggleHeat} className={`h-8 text-xs ${showHeat ? 'bg-orange-600 hover:bg-orange-700 border-orange-600' : ''}`}>
            🔥 Heatmap
          </Button>
          <Button variant={showPins ? 'default' : 'outline'} size="sm" onClick={() => setShowPins(v => !v)} className="h-8 text-xs">
            📌 Pins
          </Button>
          <Select value={muniFilter} onValueChange={setMuniFilter}>
            <SelectTrigger className="h-8 w-44 text-xs ml-auto"><SelectValue placeholder="All Municipalities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Municipalities</SelectItem>
              {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {mapError ? (
          <div className="h-80 flex flex-col items-center justify-center gap-2 bg-muted/30 text-destructive">
            <span className="text-3xl">🗺️</span>
            <p className="text-sm font-medium">{mapError}</p>
          </div>
        ) : (
          <div ref={mapRef} style={{ height: 420 }} className="w-full" />
        )}
        <div className="px-4 py-2 border-t bg-muted/30 flex flex-wrap gap-3 text-xs text-muted-foreground items-center">
          {[['#00C853','Low'],['#FFD600','Medium'],['#FF6D00','High'],['#D50000','Critical']].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
