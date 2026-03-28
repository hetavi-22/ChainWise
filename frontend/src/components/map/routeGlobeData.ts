import type { RouteEvaluation, RouteLeg } from '../../lib/api'
import { modeArcGradient, MODE_COLOR_HEX } from '../../lib/transportModeLegend'

/** Per-leg great-circle style arcs (react-globe.gl `arcsData`), patterned on example/airline-routes. */
export type GlobeArc = {
  id: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  mode: string
  label: string
  color: [string, string]
  /** Stable 0–1 phase so dashes don’t re-randomize on every React render. */
  dashPhase: number
}

export type GlobeHubPoint = {
  lat: number
  lng: number
  name: string
  mode: string
  color: string
  isChokepoint: boolean
}

export type GlobePath = {
  id: string
  path: [number, number][] // [lat, lng]
  mode: string
  color: string | string[]
  dashPhase: number
}

function legEndpoints(leg: RouteLeg): { start: [number, number]; end: [number, number] } | null {
  const coords = leg.geometry_geojson?.coordinates as number[][] | undefined
  if (coords && coords.length >= 2) {
    const [sLng, sLat] = coords[0]
    const [eLng, eLat] = coords[coords.length - 1]
    return { start: [sLng, sLat], end: [eLng, eLat] }
  }
  if (
    leg.origin_hub_lat != null &&
    leg.origin_hub_lon != null &&
    leg.dest_hub_lat != null &&
    leg.dest_hub_lon != null
  ) {
    return {
      start: [leg.origin_hub_lon, leg.origin_hub_lat],
      end: [leg.dest_hub_lon, leg.dest_hub_lat],
    }
  }
  return null
}

export function buildGlobeArcsAndHubs(route: RouteEvaluation | null): {
  arcs: GlobeArc[]
  paths: GlobePath[]
  hubs: GlobeHubPoint[]
} {
  if (!route?.legs?.length) return { arcs: [], paths: [], hubs: [] }

  const arcs: GlobeArc[] = []
  const paths: GlobePath[] = []
  const hubKey = new Set<string>()
  const hubs: GlobeHubPoint[] = []

  const pushHub = (lat: number, lng: number, name: string, mode: string, isChokepoint: boolean = false) => {
    const k = `${lat.toFixed(3)},${lng.toFixed(3)}`
    if (hubKey.has(k)) return
    hubKey.add(k)
    hubs.push({
      lat,
      lng,
      name,
      mode,
      color: MODE_COLOR_HEX[mode] ?? '#94a3b8',
      isChokepoint,
    })
  }

  route.legs.forEach((leg, i) => {
    const ends = legEndpoints(leg)
    if (!ends) return
    const [sLng, sLat] = ends.start
    const [eLng, eLat] = ends.end
    const mode = leg.mode
    const label = `${leg.origin_hub_name ?? 'Origin'} → ${leg.dest_hub_name ?? 'Destination'}`
    const routeId = route.id ?? 'route'
    const colorGradient = modeArcGradient(mode)

    // Legacy arc
    arcs.push({
      id: `${routeId}-arc-${i}`,
      startLat: sLat,
      startLng: sLng,
      endLat: eLat,
      endLng: eLng,
      mode,
      label,
      color: colorGradient,
      dashPhase: (i * 0.23 + (sLat + sLng) * 0.001) % 1,
    })

    // Surface path
    const coords = leg.geometry_geojson?.coordinates as number[][] | undefined
    const pathCoords: [number, number][] =
      coords && coords.length >= 2
        ? coords.map(([lng, lat]) => [lat, lng])
        : [[sLat, sLng], [eLat, eLng]]

    paths.push({
      id: `${routeId}-path-${i}`,
      path: pathCoords,
      mode,
      color: colorGradient,
      dashPhase: (i * 0.23 + (sLat + sLng) * 0.001) % 1,
    })

    if (leg.origin_hub_lat != null && leg.origin_hub_lon != null) {
      pushHub(
        leg.origin_hub_lat,
        leg.origin_hub_lon,
        leg.origin_hub_name ?? 'Hub',
        leg.mode,
        leg.origin_is_chokepoint ?? false,
      )
    } else {
      // Fallback: use first geometry vertex if meta is missing
      pushHub(sLat, sLng, leg.origin_hub_name ?? 'Terminal', leg.mode, leg.origin_is_chokepoint ?? false)
    }

    if (leg.dest_hub_lat != null && leg.dest_hub_lon != null) {
      pushHub(
        leg.dest_hub_lat,
        leg.dest_hub_lon,
        leg.dest_hub_name ?? 'Hub',
        leg.mode,
        leg.dest_is_chokepoint ?? false,
      )
    } else {
      // Fallback: use last geometry vertex if meta is missing
      pushHub(eLat, eLng, leg.dest_hub_name ?? 'Terminal', leg.mode, leg.dest_is_chokepoint ?? false)
    }
  })

  return { arcs, paths, hubs }
}

/** First-mile start: first vertex of first leg, else first leg origin hub. */
export function getRouteJourneyOrigin(
  route: RouteEvaluation | null,
): { lat: number; lng: number } | null {
  if (!route?.legs?.length) return null
  const first = route.legs[0]
  const coords = first.geometry_geojson?.coordinates as number[][] | undefined
  if (coords?.length) {
    const [lng, lat] = coords[0]
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }
  if (first.origin_hub_lat != null && first.origin_hub_lon != null) {
    return { lat: first.origin_hub_lat, lng: first.origin_hub_lon }
  }
  return null
}

function maxArcSpan(arcs: GlobeArc[]): number {
  let maxChord = 0
  for (const a of arcs) {
    const dLat = Math.abs(a.endLat - a.startLat)
    const dLng = Math.min(Math.abs(a.endLng - a.startLng), 360 - Math.abs(a.endLng - a.startLng))
    maxChord = Math.max(maxChord, dLat + dLng)
  }
  return maxChord
}

/** Altitude when framing from the shipment origin (closer than full-route centroid). */
export function suggestOriginViewAltitude(arcs: GlobeArc[]): number {
  if (!arcs.length) return 1.85
  const maxChord = maxArcSpan(arcs)
  return Math.min(2.55, Math.max(1.42, 1.52 + maxChord / 32))
}

/** Camera target from arc spread (similar to aiming the airline-routes demo). */
export function suggestGlobePov(arcs: GlobeArc[]): { lat: number; lng: number; altitude: number } {
  if (!arcs.length) return { lat: 22, lng: 55, altitude: 2.4 }

  let latSum = 0
  let lngSum = 0
  let n = 0
  const maxChord = maxArcSpan(arcs)

  for (const a of arcs) {
    latSum += a.startLat + a.endLat
    lngSum += a.startLng + a.endLng
    n += 2
  }

  const lat = latSum / n
  let lng = lngSum / n
  while (lng > 180) lng -= 360
  while (lng < -180) lng += 360

  const altitude = Math.min(4.2, Math.max(1.35, 1.6 + maxChord / 25))
  return { lat, lng, altitude }
}
