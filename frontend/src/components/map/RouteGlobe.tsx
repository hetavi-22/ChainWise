import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import type { RouteEvaluation } from '../../lib/api'
import { MODE_LEGEND_ROWS } from '../../lib/transportModeLegend'
import {
  buildGlobeArcsAndHubs,
  getRouteJourneyOrigin,
  suggestGlobePov,
  suggestOriginViewAltitude,
  type GlobeArc,
} from './routeGlobeData'

/** Night texture — matches dark 2D map tone. */
const GLOBE_IMAGE =
  'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg'

type Props = {
  route: RouteEvaluation | null
  /** All routes from the last plan — used for on-globe path picker. */
  planOptions?: RouteEvaluation[]
  recommendationId?: string | null
  onSelectPlanOption?: (route: RouteEvaluation) => void
  className?: string
}

function formatCo2e(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kg`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k kg`
  return `${Math.round(n)} kg`
}

function routeStableKey(r: RouteEvaluation | null): string | null {
  if (!r?.legs?.length) return null
  return r.id ?? `noid-${r.legs.length}-${r.legs[0]?.distance_km}`
}

/**
 * 3D globe: changing path flies to journey origin (not full “reset”); arcs swap without long wipe.
 */
export function RouteGlobe({
  route,
  planOptions = [],
  recommendationId = null,
  onSelectPlanOption,
  className = '',
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 320, h: 320 })
  const prevRouteKeyRef = useRef<string | null | undefined>(undefined)

  const { arcs, hubs } = useMemo(() => buildGlobeArcsAndHubs(route), [route])

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
    const altitude = suggestOriginViewAltitude(arcs)

    if (origin) {
      const ms = prev === undefined ? 1000 : 1700
      g.pointOfView({ lat: origin.lat, lng: origin.lng, altitude }, ms)
    } else if (arcs.length) {
      const pov = suggestGlobePov(arcs)
      g.pointOfView(pov, prev === undefined ? 800 : 1200)
    }

    prevRouteKeyRef.current = key
  }, [route, arcs])

  useEffect(() => {
    applyRouteCamera()
  }, [applyRouteCamera])

  const hasPathPicker = planOptions.length > 0 && onSelectPlanOption

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full min-h-[280px] bg-slate-950 ${className}`}
    >
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        onGlobeReady={applyRouteCamera}
        backgroundColor="rgba(6,10,18,0.96)"
        globeImageUrl={GLOBE_IMAGE}
        atmosphereColor="rgba(16,185,129,0.28)"
        atmosphereAltitude={0.2}
        arcCurveResolution={64}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcAltitude={0.4}
        arcStroke={0.72}
        arcDashLength={0.09}
        arcDashGap={0.07}
        arcDashInitialGap={(d) => (d as GlobeArc).dashPhase}
        arcDashAnimateTime={3200}
        arcsTransitionDuration={0}
        arcLabel={(d) => {
          const a = d as (typeof arcs)[0]
          return `<div style="padding:6px 8px;font:12px system-ui;max-width:220px;color:#f1f5f9">
            <b style="text-transform:capitalize">${a.mode}</b><br/>
            ${a.label}
          </div>`
        }}
        pointsData={hubs}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.02}
        pointRadius={0.06}
        pointsMerge={true}
        pointsTransitionDuration={0}
        pointLabel={(d) => {
          const p = d as (typeof hubs)[0]
          return `<div style="padding:4px 8px;font:11px system-ui;background:rgba(15,23,42,0.92);border-radius:6px;border:1px solid rgba(255,255,255,0.12);color:#e2e8f0">${p.name}</div>`
        }}
      />

      <div className="pointer-events-none absolute right-3 top-14 z-[760] w-[200px] rounded-xl border border-white/10 bg-slate-950/92 p-3 shadow-lg backdrop-blur-md">
        <p className="pointer-events-none mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Line colors
        </p>
        <ul className="space-y-1.5">
          {MODE_LEGEND_ROWS.map((row) => (
            <li key={row.mode} className="flex items-center gap-2 text-xs text-slate-200">
              <span
                className="h-2.5 w-8 shrink-0 rounded-full shadow-sm"
                style={{ background: row.color }}
              />
              <span className="font-medium capitalize">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {hasPathPicker && (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-[760] max-h-[min(42vh,320px)] w-[min(92vw,260px)] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/92 p-3 shadow-lg backdrop-blur-md">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Calculated paths
          </p>
          <ul className="flex flex-col gap-1.5">
            {planOptions.map((opt) => {
              const active = opt.id === route?.id
              const rec = opt.id === recommendationId
              return (
                <li key={opt.id ?? String(opt.total_emissions_kg_co2e)}>
                  <button
                    type="button"
                    onClick={() => onSelectPlanOption(opt)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      active
                        ? 'border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/35'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-slate-100">
                        {opt.id ?? 'route'}
                      </span>
                      {rec && (
                        <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>CO₂e {formatCo2e(opt.total_emissions_kg_co2e)}</span>
                      <span>{opt.legs.length} legs</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!arcs.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-8 py-6 text-center shadow-xl backdrop-blur-md">
            <p className="text-2xl">🌍</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">3D globe</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Run the planner to compare paths. Each selection flies to the route origin without resetting
              the globe view.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
