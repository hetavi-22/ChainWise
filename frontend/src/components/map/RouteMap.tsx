import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { MutableRefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type RouteEvaluation, type RouteLeg } from '../../lib/api'
import { MODE_COLOR_HEX, MODE_LEGEND_ROWS } from '../../lib/transportModeLegend'
import { initDarkFreightMap } from './mapInitialization'
import { createNo2ImageMapType } from './no2ImageMapType'

export { drawRoute } from './drawFreightRoute'
export type { FreightLatLng } from './drawFreightRoute'

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

interface HubInfo {
  lat: number
  lon: number
  name: string
  mode: string
  role: string
}

export type RouteMapProps = {
  route: RouteEvaluation | null
  /** Earth Engine / backend XYZ template with `{z}`, `{x}`, `{y}` */
  eeTileUrlTemplate?: string | null
  className?: string
}

let mapsBootstrapPromise: Promise<void> | null = null

function loadGoogleMapsOnce(apiKey: string): Promise<void> {
  if (!mapsBootstrapPromise) {
    setOptions({ key: apiKey, v: 'weekly' })
    mapsBootstrapPromise = importLibrary('maps').then(() => undefined)
  }
  return mapsBootstrapPromise
}

function removeOverlayAt(map: google.maps.Map, indexRef: MutableRefObject<number | null>) {
  if (indexRef.current === null) return
  map.overlayMapTypes.removeAt(indexRef.current)
  indexRef.current = null
}

function syncNo2Overlay(args: {
  map: google.maps.Map
  template: string | null | undefined
  visible: boolean
  indexRef: MutableRefObject<number | null>
}) {
  const { map, template, visible, indexRef } = args
  removeOverlayAt(map, indexRef)
  const trimmed = template?.trim()
  if (!trimmed || !visible) return
  const layer = createNo2ImageMapType(trimmed)
  map.overlayMapTypes.push(layer)
  indexRef.current = map.overlayMapTypes.getLength() - 1
}

export function RouteMap({ route, eeTileUrlTemplate, className = '' }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const no2OverlayIndexRef = useRef<number | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [no2Visible, setNo2Visible] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const hasApiKey = Boolean(GMAPS_API_KEY && GMAPS_API_KEY !== 'your_google_maps_api_key_here')
  const hasTemplate = Boolean(eeTileUrlTemplate?.trim())

  // ── Bootstrap: dark basemap (hackathon NO₂ viz) ──────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !hasApiKey) return

    let cancelled = false

    void (async () => {
      try {
        await loadGoogleMapsOnce(GMAPS_API_KEY)
        if (cancelled || !containerRef.current) return
        const map = initDarkFreightMap(containerRef.current, {
          center: { lat: 25, lng: 50 },
          zoom: 3,
        })
        mapRef.current = map
        map.setOptions({
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          gestureHandling: 'greedy',
        })
        setMapReady(true)
      } catch {
        if (!cancelled) setLoadError('Failed to load Google Maps.')
      }
    })()

    const ro = new ResizeObserver(() => {
      const m = mapRef.current
      if (m) google.maps.event.trigger(m, 'resize')
    })
    ro.observe(el)

    return () => {
      cancelled = true
      ro.disconnect()
      polylinesRef.current.forEach((p) => p.setMap(null))
      polylinesRef.current = []
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      infoWindowRef.current?.close()
      infoWindowRef.current = null
      const m = mapRef.current
      if (m && no2OverlayIndexRef.current !== null) {
        m.overlayMapTypes.removeAt(no2OverlayIndexRef.current)
        no2OverlayIndexRef.current = null
      }
      mapRef.current = null
      setMapReady(false)
    }
  }, [hasApiKey])

  // ── NO₂ ImageMapType overlay ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    syncNo2Overlay({
      map: mapRef.current,
      template: eeTileUrlTemplate,
      visible: no2Visible,
      indexRef: no2OverlayIndexRef,
    })
  }, [mapReady, eeTileUrlTemplate, no2Visible])

  // ── Route geometry + hub markers (from main branch) ─────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoWindowRef.current?.close()

    if (!route?.legs.length) return

    const bounds = new google.maps.LatLngBounds()
    const newHubs: HubInfo[] = []

    route.legs.forEach((leg: RouteLeg) => {
      const rawCoords = (leg.geometry_geojson?.coordinates as number[][] | undefined) ?? []
      const path = rawCoords.map((c) => ({ lat: c[1], lng: c[0] }))
      if (path.length < 2) return

      path.forEach((p) => bounds.extend(p))

      const color = MODE_COLOR_HEX[leg.mode] ?? '#64748b'
      const isTruck = leg.mode === 'truck' || leg.mode === 'rail'

      const polyline = new google.maps.Polyline({
        path,
        map,
        strokeColor: color,
        strokeWeight: isTruck ? 2 : 4,
        strokeOpacity: isTruck ? 0.0 : 0.95,
        icons: isTruck
          ? [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 0.7,
                  strokeColor: color,
                  scale: 2,
                },
                offset: '0',
                repeat: '14px',
              },
            ]
          : leg.mode === 'ship'
            ? [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 4,
                  },
                  offset: '0',
                  repeat: '20px',
                },
              ]
            : undefined,
        geodesic: false,
      })
      polylinesRef.current.push(polyline)

      if (leg.mode === 'ship' || leg.mode === 'air') {
        if (leg.origin_hub_lat != null && leg.origin_hub_lon != null) {
          newHubs.push({
            lat: leg.origin_hub_lat,
            lon: leg.origin_hub_lon,
            name: leg.origin_hub_name ?? 'Hub',
            mode: leg.mode,
            role: leg.mode === 'ship' ? 'Origin Port' : 'Origin Airport',
          })
        }
        if (leg.dest_hub_lat != null && leg.dest_hub_lon != null) {
          newHubs.push({
            lat: leg.dest_hub_lat,
            lon: leg.dest_hub_lon,
            name: leg.dest_hub_name ?? 'Hub',
            mode: leg.mode,
            role: leg.mode === 'ship' ? 'Destination Port' : 'Destination Airport',
          })
        }
      }
    })

    const iw = new google.maps.InfoWindow()
    infoWindowRef.current = iw

    newHubs.forEach((hub) => {
      const color = MODE_COLOR_HEX[hub.mode] ?? '#64748b'
      const marker = new google.maps.Marker({
        map,
        position: { lat: hub.lat, lng: hub.lon },
        title: hub.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      marker.addListener('click', () => {
        iw.setContent(
          `<div style="padding:8px;font-family:system-ui,sans-serif;min-width:160px">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${color}">${hub.role}</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a">${hub.name}</p>
          </div>`,
        )
        iw.open(map, marker)
      })
      markersRef.current.push(marker)
    })

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60)
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null))
      polylinesRef.current = []
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      iw.close()
    }
  }, [mapReady, route])

  const onNo2Toggle = useCallback(() => {
    setNo2Visible((v) => !v)
  }, [])

  if (!hasApiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="max-w-sm rounded-2xl border border-amber-200 bg-white px-8 py-6 text-center shadow dark:border-amber-900 dark:bg-slate-950">
          <p className="mb-2 text-2xl">🗝️</p>
          <p className="font-bold text-slate-800 dark:text-slate-100">Google Maps API Key Required</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Add your key to <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">frontend/.env</code>:
            <br />
            <code className="text-amber-600">VITE_GOOGLE_MAPS_API_KEY=...</code>
          </p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 p-4 text-center text-sm text-amber-200">
        {loadError}
      </div>
    )
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {!mapReady && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-slate-950/90">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}

      <div ref={containerRef} className="h-full w-full" />

      {/* Top-right so it stays clear of the 2D/3D tab control (top-left). */}
      <div className="pointer-events-none absolute right-3 top-3 z-[780] flex max-w-[min(100%,280px)] flex-col items-end gap-2">
        <label className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs font-medium text-slate-100 shadow-lg backdrop-blur-sm">
          <input
            type="checkbox"
            className="size-3.5 accent-emerald-400"
            checked={no2Visible}
            onChange={onNo2Toggle}
            disabled={!mapReady || !hasTemplate}
          />
          <span className="tracking-tight">NO₂ satellite overlay</span>
        </label>
        {!hasTemplate && mapReady && (
          <p className="pointer-events-none rounded-md border border-amber-500/30 bg-slate-950/90 px-2 py-1.5 text-[10px] text-amber-200/90">
            Add <code className="font-mono text-[9px] text-slate-300">VITE_EE_NO2_TILE_TEMPLATE</code> in{' '}
            <code className="font-mono text-[9px] text-slate-300">.env</code> for NO₂ tiles.
          </p>
        )}
      </div>

      {route && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-[760] max-w-[min(100%,320px)] rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 shadow-lg backdrop-blur-md">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Route line colors
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {MODE_LEGEND_ROWS.map((row) => (
              <div key={row.mode} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-6 shrink-0 rounded-full shadow-sm"
                  style={{ background: row.color }}
                />
                <span className="text-[11px] font-semibold text-slate-200">{row.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-slate-500">
            Dotted segments = road/rail; solid = sea &amp; air legs.
          </p>
        </div>
      )}

      {!route && mapReady && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-slate-950/90 px-10 py-8 text-center shadow-2xl backdrop-blur-md">
            <p className="mb-3 text-4xl">🗺️</p>
            <p className="text-lg font-bold text-slate-100">Plan a route to see it here</p>
            <p className="mt-1 text-sm text-slate-400">Sea lanes, ports &amp; truck legs visualized</p>
          </div>
        </div>
      )}
    </div>
  )
}
