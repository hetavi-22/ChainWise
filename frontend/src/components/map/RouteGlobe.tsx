import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import type { RouteEvaluation } from '../../lib/api'
import {
  buildGlobeArcsAndHubs,
  getRouteJourneyOrigin,
} from './routeGlobeData'

/** High-res texture - NASA Blue Marble. */
const GLOBE_IMAGE =
  'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'

type Props = {
  route: RouteEvaluation | null
  planOptions?: RouteEvaluation[]
  recommendationId?: string | null
  showNo2Overlay?: boolean
  className?: string
  onSelectPlanOption?: (route: RouteEvaluation) => void
}

function routeStableKey(r: RouteEvaluation | null): string | null {
  if (!r?.legs?.length) return null
  return r.id ?? `noid-${r.legs.length}-${r.legs[0]?.distance_km}`
}

export function RouteGlobe({
  route,
  className = '',
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 320, h: 320 })
  const prevRouteKeyRef = useRef<string | null | undefined>(undefined)

  const { paths, hubs } = useMemo(() => buildGlobeArcsAndHubs(route), [route])

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(64, Math.floor(r.width))
      const h = Math.max(64, Math.floor(r.height))
      setDims((d) => (d.w === w && d.h === h ? d : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const applyRouteCamera = useCallback(() => {
    const g = globeRef.current
    if (!g) return

    const key = routeStableKey(route)
    if (key === null) {
      prevRouteKeyRef.current = undefined
      return
    }

    const prev = prevRouteKeyRef.current
    if (prev === key) return

    const origin = getRouteJourneyOrigin(route)
    const altitude = 1.35 

    if (origin) {
      const ms = prev === undefined ? 1000 : 1700
      g.pointOfView({ lat: origin.lat, lng: origin.lng, altitude }, ms)
    }

    prevRouteKeyRef.current = key
  }, [route])

  useEffect(() => {
    applyRouteCamera()
  }, [applyRouteCamera])

  return (
    <div ref={wrapRef} className={`relative h-full w-full min-h-[280px] bg-[#000000] ${className}`}>
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        onGlobeReady={applyRouteCamera}
        waitForGlobeReady={true}
        backgroundColor="#000000"
        globeImageUrl={GLOBE_IMAGE}
        showAtmosphere={true}
        atmosphereColor="rgba(34, 211, 238, 0.45)"
        atmosphereAltitude={0.35}
        rendererConfig={{ antialias: true, alpha: false }}
        
        // Force cleanup
        labelsData={[]}
        arcsData={[]}
        customLayerData={[]}

        pathsData={paths}
        pathPoints="path"
        pathColor={(d: any) => d.color[0]}
        pathStroke={4.8}
        pathDashLength={0.15}
        pathDashGap={0.08}
        pathDashAnimateTime={1800}
        pathLabel={() => ''}
        
        pointsData={hubs}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: any) => {
          const p = d as any
          if (p.name === route?.origin_label) return '#f3cb72'
          if (p.name === route?.destination_label) return '#f6947e'
          return p.mode === 'air' ? '#8b5cf6' : '#ff4b2b'
        }}
        pointAltitude={(d: any) => (d.name === route?.origin_label || d.name === route?.destination_label ? 0.08 : 0.05)}
        pointRadius={(d: any) => (d.isChokepoint ? 0.48 : 0.24)}
        pointsMerge={false}
        pointsTransitionDuration={400}
        pointLabel={(d: any) => {
          const p = d as any
          const parts = p.name.split(',')
          const countryName = parts.length > 1 ? parts[parts.length - 1].trim() : ''
          const primaryName = parts.length > 1 ? parts.slice(0, -1).join(', ').trim() : p.name

          let badgeColor = '#ff4b2b'
          if (p.name === route?.origin_label) badgeColor = '#f3cb72'
          else if (p.name === route?.destination_label) badgeColor = '#f6947e'
          else if (p.mode === 'air') badgeColor = '#8b5cf6'

          return `
            <div style="
              padding:12px 16px;
              font-family:'Outfit', sans-serif;
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:10px;
              color:#0f172a;
              box-shadow:0 15px 30px -10px rgb(0 0 0 / 0.5);
              text-align:left;
              min-width:120px;
              pointer-events:none;
            ">
              <div style="font-size:15px;font-weight:700;line-height:1.2;color:#1e293b">${primaryName}</div>
              ${
                countryName
                  ? `
                <div style="
                  display:inline-block;
                  font-size:11px;
                  font-weight:700;
                  color:#ffffff;
                  background:${badgeColor};
                  padding:1px 8px;
                  border-radius:4px;
                  text-transform:uppercase;
                  letter-spacing:1px;
                  margin-top:6px;
                ">${countryName}</div>
              `
                  : ''
              }
            </div>
          `
        }}
      />

      {!paths.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-8 py-6 text-center shadow-xl backdrop-blur-md">
            <p className="text-2xl">🌍</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">3D globe</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Run the planner to compare paths. The 3D view provides a tactile, surface-level audit of all maritime corridors.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
