import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { type RouteEvaluation, type RouteLeg } from '../../lib/api'

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

const MODE_COLOR: Record<string, string> = {
  truck: '#10b981', ship: '#0ea5e9', air: '#f43f5e', rail: '#f59e0b',
}

interface HubInfo { lat: number; lon: number; name: string; mode: string; role: string }

export function RouteMap({ route }: { route: RouteEvaluation | null }) {
  const hasApiKey = GMAPS_API_KEY && GMAPS_API_KEY !== 'your_google_maps_api_key_here'

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GMAPS_API_KEY,
    id: 'chainwise-gmaps',
    language: 'en',
    region: 'US',
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  // Imperative refs for polylines and markers — guarantees cleanup on route change
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const [hubs, setHubs] = useState<HubInfo[]>([])
  const [activeHub, setActiveHub] = useState<HubInfo | null>(null)
  const mapReadyRef = useRef(false)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    mapReadyRef.current = true
  }, [])

  // ── Imperatively draw/clear polylines when route changes ─────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // ALWAYS clear old polylines first
    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []
    setHubs([])
    setActiveHub(null)

    if (!route?.legs.length) return

    const bounds = new window.google.maps.LatLngBounds()
    const newHubs: HubInfo[] = []

    route.legs.forEach((leg: RouteLeg) => {
      const rawCoords = (leg.geometry_geojson?.coordinates as number[][] | undefined) ?? []
      const path = rawCoords.map(c => ({ lat: c[1], lng: c[0] }))
      if (path.length < 2) return

      path.forEach(p => bounds.extend(p))

      const color = MODE_COLOR[leg.mode] ?? '#64748b'
      const isTruck = leg.mode === 'truck' || leg.mode === 'rail'

      const polyline = new window.google.maps.Polyline({
        path,
        map,
        strokeColor: color,
        strokeWeight: isTruck ? 2 : 4,
        strokeOpacity: isTruck ? 0.0 : 0.95,  // truck uses icons for dots
        icons: isTruck
          ? [{
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 0.7,
                strokeColor: color,
                scale: 2,
              },
              offset: '0',
              repeat: '14px',
            }]
          : leg.mode === 'ship'
          ? [{
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 4,
              },
              offset: '0',
              repeat: '20px',
            }]
          : undefined,
        geodesic: false,
      })
      polylinesRef.current.push(polyline)

      // Collect hub markers for ships/air only
      if (leg.mode === 'ship' || leg.mode === 'air') {
        if (leg.origin_hub_lat != null && leg.origin_hub_lon != null) {
          newHubs.push({
            lat: leg.origin_hub_lat, lon: leg.origin_hub_lon!,
            name: leg.origin_hub_name ?? 'Hub', mode: leg.mode,
            role: leg.mode === 'ship' ? 'Origin Port' : 'Origin Airport',
          })
        }
        if (leg.dest_hub_lat != null && leg.dest_hub_lon != null) {
          newHubs.push({
            lat: leg.dest_hub_lat, lon: leg.dest_hub_lon!,
            name: leg.dest_hub_name ?? 'Hub', mode: leg.mode,
            role: leg.mode === 'ship' ? 'Destination Port' : 'Destination Airport',
          })
        }
      }
    })

    setHubs(newHubs)

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60)
    }

    // Cleanup on unmount or next route
    return () => {
      polylinesRef.current.forEach(p => p.setMap(null))
      polylinesRef.current = []
    }
  }, [route]) // Only re-runs when route reference changes

  if (!hasApiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="text-center px-8 py-6 bg-white rounded-2xl shadow border border-amber-200 max-w-sm">
          <p className="text-2xl mb-2">🗝️</p>
          <p className="font-bold text-slate-800">Google Maps API Key Required</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Add your key to <code className="bg-slate-100 px-1 rounded">frontend/.env</code>:<br />
            <code className="text-amber-600">VITE_GOOGLE_MAPS_API_KEY=AIza...</code>
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={{ lat: 25, lng: 50 }}
        zoom={3}
        onLoad={onLoad}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: 9 },
          gestureHandling: 'greedy',
          backgroundColor: '#f8fafc',
        }}
        onClick={() => setActiveHub(null)}
      >
        {/* Hub markers via OverlayView — placed after polylines are drawn imperatively */}
        {hubs.map((hub, i) => {
          const color = MODE_COLOR[hub.mode] ?? '#64748b'
          const isActive = activeHub === hub
          return (
            <OverlayView
              key={`${route?.id}-hub-${i}`}
              position={{ lat: hub.lat, lng: hub.lon }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div style={{ transform: 'translate(-50%, -50%)', position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveHub(isActive ? null : hub) }}
                  style={{ background: color, border: '3px solid white' }}
                  className="w-9 h-9 rounded-full shadow-xl flex items-center justify-center text-white text-sm font-bold transition-transform hover:scale-110"
                  title={hub.name}
                >
                  {hub.mode === 'ship' ? '⚓' : '✈'}
                </button>
                {/* Port label */}
                <div
                  className="absolute whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full shadow pointer-events-none"
                  style={{ top: 38, left: '50%', transform: 'translateX(-50%)', background: color, color: '#fff' }}
                >
                  {hub.name.split('(')[0].trim()}
                </div>
                {/* Info popup */}
                {isActive && (
                  <div
                    className="absolute w-52 bg-white rounded-2xl shadow-2xl border border-black/5 p-4 z-50"
                    style={{ bottom: 48, left: '50%', transform: 'translateX(-50%)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>{hub.role}</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{hub.name}</p>
                  </div>
                )}
              </div>
            </OverlayView>
          )
        })}
      </GoogleMap>

      {/* Legend */}
      {route && (
        <div className="absolute bottom-5 left-4 z-[500] flex items-center gap-4 rounded-2xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-md border border-black/5">
          <div className="flex items-center gap-1.5">
            <div className="h-[3px] w-5 rounded-full" style={{ background: MODE_COLOR.ship }} />
            <span className="text-[11px] font-semibold text-slate-600">Sea</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span className="text-[11px]">· · ·</span>
            <span className="text-[11px] font-semibold text-slate-600 ml-0.5">Truck</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-[3px] w-5 rounded-full" style={{ background: MODE_COLOR.air }} />
            <span className="text-[11px] font-semibold text-slate-600">Air</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!route && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="rounded-3xl border border-black/5 bg-white/90 px-10 py-8 text-center shadow-2xl backdrop-blur-md">
            <p className="mb-3 text-4xl">🗺️</p>
            <p className="text-lg font-bold text-slate-800">Plan a route to see it here</p>
            <p className="mt-1 text-sm text-slate-400">Sea lanes, ports &amp; truck legs visualized</p>
          </div>
        </div>
      )}
    </div>
  )
}
