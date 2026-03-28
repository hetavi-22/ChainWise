import {
  PORT_DATASET_SUMMARY,
  PROCESSED_PORTS,
  type PortDatasetSummary,
  type ProcessedPort,
} from '../data/ports.generated'
import {
  SEA_LANE_NETWORK,
  type SeaLaneEdge,
  type SeaLaneNode,
} from '../data/seaLaneNetwork.generated'
import type {
  ApiRouteEvaluation,
  ApiRouteLeg,
  MultimodalPlanResponse,
} from './api'

type MatchQuality = 'high' | 'medium' | 'low'
type ProxyConfidence = 'high' | 'medium' | 'low'
type RouteConfidence = 'High' | 'Medium' | 'Low'
type SurfaceMode = 'truck' | 'rail'
type RouteLegMode = SurfaceMode | 'ship' | 'air'
type TrafficLevel = 'High' | 'Moderate' | 'Low'
type Coordinate = [number, number]

type DemoLocation = {
  id: string
  label: string
  type: string
  aliases: string[]
  lat: number
  lng: number
}

type DemoPort = ProcessedPort & {
  proxyConfidence: ProxyConfidence
}

type NearbyPort = DemoPort & {
  distanceToLocationKm: number
}

type GeoNode = {
  label?: string
  lat: number
  lng: number
}

type SurfaceOption = {
  mode: SurfaceMode
  label: string
  strategy: string
  trafficLevel: TrafficLevel
  distanceKm: number
  emissionsKg: number
  durationHours: number
  geometry: Coordinate[]
}

type SeaPlan = {
  legs: RouteLeg[]
  distanceKm: number
  emissionsKg: number
  intermediatePort: DemoPort | null
}

type SeaLaneRoute = {
  nodeIds: string[]
  distanceKm: number
}

export type ResolvedLocation = DemoLocation & {
  resolvedFromInput: string
  matchQuality: MatchQuality
  resolutionNote: string
}

export type RoutePlanRequest = {
  origin_address: string
  destination_address: string
  cargo_weight_tonnes: number
  carbon_budget_kg: number
  carbon_tax_per_tonne_co2e: number
  max_transit_time_hours: number | null
  include_hotspot_penalties: boolean
}

export type RouteLeg = {
  id: string
  kind: 'surface' | 'sea'
  mode: RouteLegMode
  label: string
  strategy: string
  fromLabel: string
  toLabel: string
  distanceKm: number
  emissionsKg: number
  durationHours: number
  trafficLevel: TrafficLevel | null
  geometry: Coordinate[]
  isEstimated: boolean
  notes?: string
  originIsChokepoint?: boolean
  destIsChokepoint?: boolean
}

export type RouteCandidate = {
  routeId: string
  rank: number
  origin: ResolvedLocation
  destination: ResolvedLocation
  originPort: NearbyPort
  destinationPort: NearbyPort
  intermediatePort: DemoPort | null
  legs: RouteLeg[]
  surfaceDistanceKm: number
  seaDistanceKm: number
  totalDistanceKm: number
  surfaceEmissionsKg: number
  seaEmissionsKg: number
  hotspotPenaltyKg: number
  totalEmissionsKg: number
  totalDurationHours: number
  carbonTaxCost: number
  surfaceShare: number
  seaShare: number
  budgetPass: boolean
  withinTimePolicy: boolean | null
  confidence: RouteConfidence
  primarySurfaceMode: SurfaceMode | 'mixed'
  modeSequence: string
  dataSource: 'demo' | 'live'
  explanation: string
}

export type PlannerResult = {
  request: RoutePlanRequest
  config: typeof CONFIG
  dataSummary: {
    ports: PortDatasetSummary
  }
  origin: ResolvedLocation
  destination: ResolvedLocation
  originPorts: NearbyPort[]
  destinationPorts: NearbyPort[]
  budgetSummary: {
    budgetKg: number
    timePolicyHours: number | null
    feasibleRouteCount: number
    returnedRouteCount: number
    evaluatedRouteCount: number
  }
  routes: RouteCandidate[]
  recommendedRoute: RouteCandidate
  baselineRoute: RouteCandidate
  insights: {
    savingsKg: number
    budgetHeadroom: number
    timeHeadroom: number | null
    carbonTaxDelta: number
    dominantLever: string
    hotspotMode: string
    feasibilityLabel: string
    keyRisk: string
    plannerSource: string
  }
}

export type PlannerPreset = {
  id: string
  label: string
  origin: string
  destination: string
  cargo: number
  budget: number
  carbonTax: number
  maxTransitHours: number | null
  includeHotspots: boolean
}

const CONFIG = {
  truckFactor: 0.085,
  railFactor: 0.035,
  shipFactor: 0.015,
  surfaceRouteMultiplier: 1.18,
  ecoSurfaceMultiplier: 1.32,
  railRouteMultiplier: 1.12,
  seaRouteMultiplier: 1.15,
  railTransferPerTonneKg: 9,
  truckSpeedKmh: 55,
  ecoTruckSpeedKmh: 62,
  railSpeedKmh: 40,
  shipSpeedKmh: 18,
  hotspotAlpha: 0.6,
  hotspotBeta: 0.4,
  portPenaltyBase: 5,
  railMinDistanceKm: 180,
  railCargoScoreThreshold: 3.4,
  transshipmentMinSeaKm: 5200,
  transshipmentDetourCap: 1.26,
  nearestPortsK: 4,
  maxRoutes: 3,
}

const LOCATIONS: DemoLocation[] = [
  {
    id: 'milan-fashion',
    label: 'Fashion Hub Milan Manufacturing Campus, Milan, Italy',
    type: 'Factory',
    aliases: ['milan', 'italy', 'fashion hub', 'manufacturing campus'],
    lat: 45.4642,
    lng: 9.19,
  },
  {
    id: 'hamburg-retail',
    label: 'North Sea Retail Distribution Center, Hamburg, Germany',
    type: 'Retail DC',
    aliases: ['hamburg', 'germany', 'north sea retail', 'distribution center'],
    lat: 53.5511,
    lng: 9.9937,
  },
  {
    id: 'pune-auto',
    label: 'Auto Components Campus, Pune, India',
    type: 'Factory',
    aliases: ['pune', 'india', 'auto components', 'campus'],
    lat: 18.5204,
    lng: 73.8567,
  },
  {
    id: 'rotterdam-assembly',
    label: 'Rotterdam Assembly Plant, Rotterdam, Netherlands',
    type: 'Assembly Plant',
    aliases: ['rotterdam', 'netherlands', 'assembly plant'],
    lat: 51.9244,
    lng: 4.4777,
  },
  {
    id: 'shenzhen-electronics',
    label: 'Electronics Mega Factory, Shenzhen, China',
    type: 'Factory',
    aliases: ['shenzhen', 'china', 'electronics', 'mega factory'],
    lat: 22.5431,
    lng: 114.0579,
  },
  {
    id: 'los-angeles-fulfillment',
    label: 'Pacific Fulfillment Hub, Los Angeles, United States',
    type: 'Fulfillment',
    aliases: ['los angeles', 'united states', 'usa', 'pacific fulfillment'],
    lat: 34.0522,
    lng: -118.2437,
  },
  {
    id: 'izmir-textiles',
    label: 'Aegean Textiles Plant, Izmir, Turkey',
    type: 'Factory',
    aliases: ['izmir', 'turkey', 'aegean textiles', 'textiles plant'],
    lat: 38.4237,
    lng: 27.1428,
  },
  {
    id: 'barcelona-store',
    label: 'Barcelona Sustainable Retail Cluster, Barcelona, Spain',
    type: 'Store Cluster',
    aliases: ['barcelona', 'spain', 'sustainable retail', 'store cluster'],
    lat: 41.3874,
    lng: 2.1686,
  },
]

const PORTS: DemoPort[] = PROCESSED_PORTS
const HUB_PORT_FRAGMENTS = [
  'singapore',
  'colombo',
  'tanjung pelepas',
  'busan',
  'yokohama',
  'algeciras',
  'tangier',
]
const TRANSSHIPMENT_HUBS = HUB_PORT_FRAGMENTS.map((fragment) =>
  PORTS.find((port) => port.name.toLowerCase().includes(fragment)),
).filter((port): port is DemoPort => Boolean(port))
const SEA_LANE_NODE_MAP = new Map(SEA_LANE_NETWORK.nodes.map((node) => [node.id, node]))
const SEA_LANE_ADJACENCY = buildSeaLaneAdjacency(SEA_LANE_NETWORK.nodes, SEA_LANE_NETWORK.edges)

export const PRESETS: PlannerPreset[] = [
  {
    id: 'msc-fashion',
    label: 'MSC Sponsor Demo',
    origin: 'Fashion Hub Milan Manufacturing Campus, Milan, Italy',
    destination: 'North Sea Retail Distribution Center, Hamburg, Germany',
    cargo: 20,
    budget: 2500,
    carbonTax: 95,
    maxTransitHours: 220,
    includeHotspots: true,
  },
  {
    id: 'auto-europe',
    label: 'Auto Parts India to Rotterdam',
    origin: 'Auto Components Campus, Pune, India',
    destination: 'Rotterdam Assembly Plant, Rotterdam, Netherlands',
    cargo: 28,
    budget: 6400,
    carbonTax: 110,
    maxTransitHours: 540,
    includeHotspots: true,
  },
  {
    id: 'electronics-us',
    label: 'Electronics China to LA',
    origin: 'Electronics Mega Factory, Shenzhen, China',
    destination: 'Pacific Fulfillment Hub, Los Angeles, United States',
    cargo: 18,
    budget: 14500,
    carbonTax: 85,
    maxTransitHours: 420,
    includeHotspots: true,
  },
  {
    id: 'med-retail',
    label: 'Textiles Turkey to Barcelona',
    origin: 'Aegean Textiles Plant, Izmir, Turkey',
    destination: 'Barcelona Sustainable Retail Cluster, Barcelona, Spain',
    cargo: 12,
    budget: 2200,
    carbonTax: 75,
    maxTransitHours: 180,
    includeHotspots: false,
  },
]

export const LOCATION_OPTIONS = LOCATIONS.map((location) => location.label)

export function planRoute(payload: RoutePlanRequest): PlannerResult {
  const origin = resolveLocation(payload.origin_address)
  const destination = resolveLocation(payload.destination_address)
  const cargoTonnes = Math.max(Number(payload.cargo_weight_tonnes) || 0, 1)
  const budget = Math.max(Number(payload.carbon_budget_kg) || 0, 100)
  const carbonTax = Math.max(Number(payload.carbon_tax_per_tonne_co2e) || 0, 0)
  const maxTransitHours =
    payload.max_transit_time_hours == null || Number.isNaN(payload.max_transit_time_hours)
      ? null
      : Math.max(Number(payload.max_transit_time_hours), 0)
  const includeHotspots = Boolean(payload.include_hotspot_penalties)

  const originPorts = nearestPorts(origin, CONFIG.nearestPortsK)
  const destinationPorts = nearestPorts(destination, CONFIG.nearestPortsK)

  const candidates: RouteCandidate[] = []
  let routeCount = 0

  originPorts.forEach((originPort) => {
    destinationPorts.forEach((destinationPort) => {
      if (originPort.id === destinationPort.id) return

      routeCount += 1

      const originSurfaceLeg = buildSurfaceLeg({
        id: `origin-${routeCount}`,
        from: origin,
        to: { lat: originPort.lat, lng: originPort.lng, label: originPort.name },
        cargoTonnes,
        anchorPort: originPort,
        roleLabel: 'Factory to export port',
      })
      const destinationSurfaceLeg = buildSurfaceLeg({
        id: `destination-${routeCount}`,
        from: {
          lat: destinationPort.lat,
          lng: destinationPort.lng,
          label: destinationPort.name,
        },
        to: destination,
        cargoTonnes,
        anchorPort: destinationPort,
        roleLabel: 'Import port to destination',
      })
      const seaPlan = buildSeaPlan({
        routeId: routeCount,
        originPort,
        destinationPort,
        cargoTonnes,
      })

      const legs = [originSurfaceLeg, ...seaPlan.legs, destinationSurfaceLeg]
      const surfaceDistanceKm =
        originSurfaceLeg.distanceKm + destinationSurfaceLeg.distanceKm
      const surfaceEmissionsKg =
        originSurfaceLeg.emissionsKg + destinationSurfaceLeg.emissionsKg
      const hotspotPenaltyKg = includeHotspots
        ? computeHotspotPenalty(originPort, destinationPort, cargoTonnes)
        : 0
      const totalEmissionsKg =
        surfaceEmissionsKg + seaPlan.emissionsKg + hotspotPenaltyKg
      const totalDurationHours = legs.reduce((sum, leg) => sum + leg.durationHours, 0)
      const carbonTaxCost = linehaulTaxCost(totalEmissionsKg, carbonTax)
      const surfaceShare = surfaceEmissionsKg / totalEmissionsKg
      const seaShare = seaPlan.emissionsKg / totalEmissionsKg
      const confidence = deriveConfidence([
        origin.matchQuality,
        destination.matchQuality,
        originPort.proxyConfidence,
        destinationPort.proxyConfidence,
      ])

      candidates.push({
        routeId: `route-${routeCount}`,
        rank: 0,
        origin,
        destination,
        originPort,
        destinationPort,
        intermediatePort: seaPlan.intermediatePort,
        legs,
        surfaceDistanceKm,
        seaDistanceKm: seaPlan.distanceKm,
        totalDistanceKm: surfaceDistanceKm + seaPlan.distanceKm,
        surfaceEmissionsKg,
        seaEmissionsKg: seaPlan.emissionsKg,
        hotspotPenaltyKg,
        totalEmissionsKg,
        totalDurationHours,
        carbonTaxCost,
        surfaceShare,
        seaShare,
        budgetPass: totalEmissionsKg <= budget,
        withinTimePolicy:
          maxTransitHours == null ? null : totalDurationHours <= maxTransitHours,
        confidence,
        primarySurfaceMode: derivePrimarySurfaceMode(
          originSurfaceLeg.mode,
          destinationSurfaceLeg.mode,
        ),
        modeSequence: buildModeSequence(legs),
        dataSource: 'demo',
        explanation: buildExplanation({
          originSurfaceLeg,
          destinationSurfaceLeg,
          intermediatePort: seaPlan.intermediatePort,
          hotspotPenaltyKg,
          surfaceShare,
          originPort,
          destinationPort,
        }),
      })
    })
  })

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (routeFeasibilityRank(a) !== routeFeasibilityRank(b)) {
      return routeFeasibilityRank(a) - routeFeasibilityRank(b)
    }
    if (a.totalEmissionsKg !== b.totalEmissionsKg) {
      return a.totalEmissionsKg - b.totalEmissionsKg
    }
    if (a.totalDurationHours !== b.totalDurationHours) {
      return a.totalDurationHours - b.totalDurationHours
    }
    if (a.hotspotPenaltyKg !== b.hotspotPenaltyKg) {
      return a.hotspotPenaltyKg - b.hotspotPenaltyKg
    }
    return a.totalDistanceKm - b.totalDistanceKm
  })

  const routes = sortedCandidates.slice(0, CONFIG.maxRoutes).map((route, index) => ({
    ...route,
    rank: index + 1,
  }))

  const recommendedRoute = routes[0]
  const baselineRoute = sortedCandidates[sortedCandidates.length - 1] ?? routes[0]
  const feasibleCount = candidates.filter((route) => route.budgetPass).length

  return {
    request: payload,
    config: CONFIG,
    dataSummary: {
      ports: PORT_DATASET_SUMMARY,
    },
    origin,
    destination,
    originPorts,
    destinationPorts,
    budgetSummary: {
      budgetKg: budget,
      timePolicyHours: maxTransitHours,
      feasibleRouteCount: feasibleCount,
      returnedRouteCount: routes.length,
      evaluatedRouteCount: candidates.length,
    },
    routes,
    recommendedRoute,
    baselineRoute,
    insights: buildInsights({
      recommendedRoute,
      baselineRoute,
      feasibleCount,
      budget,
      maxTransitHours,
      includeHotspots,
    }),
  }
}

export function adaptBackendPlan(
  payload: RoutePlanRequest,
  response: MultimodalPlanResponse,
): PlannerResult {
  const origin = resolveLiveLocation(payload.origin_address, response.origin, 'Factory')
  const destination = resolveLiveLocation(
    payload.destination_address,
    response.destination,
    'Destination',
  )
  const originPorts = nearestPorts(origin, CONFIG.nearestPortsK)
  const destinationPorts = nearestPorts(destination, CONFIG.nearestPortsK)

  const routes = response.options
    .map((option, index) => adaptBackendRoute(option, index, origin, destination, payload))
    .sort((a, b) => {
      if (response.recommendation_id) {
        if (a.routeId === response.recommendation_id) return -1
        if (b.routeId === response.recommendation_id) return 1
      }
      if (routeFeasibilityRank(a) !== routeFeasibilityRank(b)) {
        return routeFeasibilityRank(a) - routeFeasibilityRank(b)
      }
      return a.totalEmissionsKg - b.totalEmissionsKg
    })
    .map((route, index) => ({
      ...route,
      rank: index + 1,
    }))

  const fallbackResult = planRoute(payload)
  if (routes.length === 0) return fallbackResult

  const recommendedRoute =
    routes.find((route) => route.routeId === response.recommendation_id) ?? routes[0]
  const baselineRoute = routes[routes.length - 1] ?? recommendedRoute
  const feasibleCount = routes.filter((route) => routeFeasibilityRank(route) === 0).length

  return {
    request: payload,
    config: CONFIG,
    dataSummary: {
      ports: PORT_DATASET_SUMMARY,
    },
    origin,
    destination,
    originPorts,
    destinationPorts,
    budgetSummary: {
      budgetKg: payload.carbon_budget_kg,
      timePolicyHours: payload.max_transit_time_hours,
      feasibleRouteCount: feasibleCount,
      returnedRouteCount: routes.length,
      evaluatedRouteCount: response.options.length,
    },
    routes,
    recommendedRoute,
    baselineRoute,
    insights: buildInsights({
      recommendedRoute,
      baselineRoute,
      feasibleCount,
      budget: payload.carbon_budget_kg,
      maxTransitHours: payload.max_transit_time_hours,
      includeHotspots: false,
    }),
  }
}

function resolveLocation(input: string): ResolvedLocation {
  const normalized = input.toLowerCase()
  const scored = LOCATIONS.map((location) => {
    let score = 0
    if (location.label.toLowerCase() === normalized) score += 8
    if (
      location.label.toLowerCase().includes(normalized) ||
      normalized.includes(location.label.toLowerCase())
    ) {
      score += 4
    }
    score += location.aliases.reduce(
      (sum, alias) => sum + (normalized.includes(alias) ? 1 : 0),
      0,
    )
    return { location, score }
  }).sort((a, b) => b.score - a.score)

  if (scored[0].score <= 0) {
    return {
      ...LOCATIONS[0],
      resolvedFromInput: input,
      matchQuality: 'low',
      resolutionNote:
        'Demo fallback used because the address was not in the seeded hackathon dataset.',
    }
  }

  return {
    ...scored[0].location,
    resolvedFromInput: input,
    matchQuality: scored[0].score >= 5 ? 'high' : 'medium',
    resolutionNote:
      scored[0].score >= 5
        ? 'Matched against the seeded demo geocoder. Swap this for ORS geocoding in the backend.'
        : 'Partial match found in the seeded demo geocoder. A backend geocoder will raise confidence.',
  }
}

function resolveLiveLocation(
  input: string,
  liveLocation: MultimodalPlanResponse['origin'] | MultimodalPlanResponse['destination'],
  fallbackType: string,
): ResolvedLocation {
  const seeded = resolveLocation(input)
  if (!liveLocation) return seeded

  return {
    ...seeded,
    label: liveLocation.name || seeded.label,
    type: seeded.type || fallbackType,
    lat: liveLocation.lat,
    lng: liveLocation.lon,
    resolvedFromInput: input,
    matchQuality: liveLocation.name ? 'high' : seeded.matchQuality,
    resolutionNote: liveLocation.name
      ? 'Resolved by the live backend planner.'
      : 'Resolved by the live backend planner with fallback display naming.',
  }
}

function nearestPorts(location: ResolvedLocation, count: number) {
  return [...PORTS]
    .map((port) => ({
      ...port,
      distanceToLocationKm: haversine(location.lat, location.lng, port.lat, port.lng),
    }))
    .sort(
      (a, b) =>
        portSelectionRank(a.distanceToLocationKm, a.cargoScore) -
        portSelectionRank(b.distanceToLocationKm, b.cargoScore),
    )
    .slice(0, count)
}

function adaptBackendRoute(
  option: ApiRouteEvaluation,
  index: number,
  origin: ResolvedLocation,
  destination: ResolvedLocation,
  payload: RoutePlanRequest,
): RouteCandidate {
  const cargoTonnes = Math.max(payload.cargo_weight_tonnes, 1)
  const mappedLegs = option.legs.map((leg, legIndex) => adaptApiLeg(leg, legIndex, cargoTonnes))
  const originPort =
    resolvePortFromLeg(option.legs[0], 'dest') ?? nearestPorts(origin, 1)[0]
  const destinationPort =
    resolvePortFromLeg(option.legs[option.legs.length - 1], 'origin') ??
    nearestPorts(destination, 1)[0]
  const surfaceLegs = mappedLegs.filter((leg) => leg.mode !== 'ship')
  const seaLegs = mappedLegs.filter((leg) => leg.mode === 'ship')
  const surfaceDistanceKm = surfaceLegs.reduce((sum, leg) => sum + leg.distanceKm, 0)
  const seaDistanceKm = seaLegs.reduce((sum, leg) => sum + leg.distanceKm, 0)
  const surfaceEmissionsKg = surfaceLegs.reduce((sum, leg) => sum + leg.emissionsKg, 0)
  const seaEmissionsKg = seaLegs.reduce((sum, leg) => sum + leg.emissionsKg, 0)
  const hotspotPenaltyKg = Math.max(
    option.total_emissions_kg_co2e - surfaceEmissionsKg - seaEmissionsKg,
    0,
  )
  const surfaceShare = safeRatio(surfaceEmissionsKg, option.total_emissions_kg_co2e)
  const seaShare = safeRatio(seaEmissionsKg, option.total_emissions_kg_co2e)
  const confidence = deriveConfidence([
    origin.matchQuality,
    destination.matchQuality,
    originPort.proxyConfidence,
    destinationPort.proxyConfidence,
  ])

  const originSurfaceLeg = surfaceLegs[0] ?? mappedLegs[0]
  const destinationSurfaceLeg = surfaceLegs[surfaceLegs.length - 1] ?? mappedLegs[mappedLegs.length - 1]

  return {
    routeId: option.id ?? `live-${index + 1}`,
    rank: 0,
    origin,
    destination,
    originPort,
    destinationPort,
    intermediatePort: null,
    legs: mappedLegs,
    surfaceDistanceKm,
    seaDistanceKm,
    totalDistanceKm: surfaceDistanceKm + seaDistanceKm,
    surfaceEmissionsKg,
    seaEmissionsKg,
    hotspotPenaltyKg,
    totalEmissionsKg: option.total_emissions_kg_co2e,
    totalDurationHours: option.total_duration_hours,
    carbonTaxCost: option.carbon_tax_cost,
    surfaceShare,
    seaShare,
    budgetPass:
      option.within_carbon_budget ?? option.total_emissions_kg_co2e <= payload.carbon_budget_kg,
    withinTimePolicy:
      option.within_time_policy ??
      (payload.max_transit_time_hours == null
        ? null
        : option.total_duration_hours <= payload.max_transit_time_hours),
    confidence,
    primarySurfaceMode: derivePrimarySurfaceModeFromLegs(surfaceLegs),
    modeSequence: buildModeSequence(mappedLegs),
    dataSource: 'live',
    explanation: buildExplanation({
      originSurfaceLeg,
      destinationSurfaceLeg,
      intermediatePort: null,
      hotspotPenaltyKg,
      surfaceShare,
      originPort,
      destinationPort,
    }),
  }
}

function adaptApiLeg(leg: ApiRouteLeg, legIndex: number, cargoTonnes: number): RouteLeg {
  const coordinates = geometryToCoordinates(leg)
  const distanceKm = Math.max(leg.distance_km, estimatedDistanceFromCoordinates(coordinates))
  const durationHours = leg.duration_hours ?? estimateDurationHours(leg.mode, distanceKm)
  const resolvedEmissionsKg =
    leg.emissions_kg_co2e != null
      ? Math.max(leg.emissions_kg_co2e, 0)
      : emissionsForMode(leg.mode, distanceKm, cargoTonnes)

  return {
    id: `live-leg-${legIndex + 1}`,
    kind: leg.mode === 'ship' ? 'sea' : 'surface',
    mode: leg.mode,
    label: buildApiLegLabel(leg),
    strategy: leg.notes ?? buildApiLegStrategy(leg.mode),
    fromLabel: leg.origin_hub_name ?? 'Origin',
    toLabel: leg.dest_hub_name ?? 'Destination',
    distanceKm,
    emissionsKg: resolvedEmissionsKg,
    durationHours,
    trafficLevel: deriveApiTrafficLevel(leg.mode),
    geometry: coordinates,
    isEstimated: leg.mode !== 'truck' || leg.duration_hours == null,
    notes: leg.notes ?? undefined,
    originIsChokepoint: leg.origin_is_chokepoint,
    destIsChokepoint: leg.dest_is_chokepoint,
  }
}

function resolvePortFromLeg(
  leg: ApiRouteLeg | undefined,
  edge: 'origin' | 'dest',
): NearbyPort | null {
  if (!leg) return null

  const lat = edge === 'origin' ? leg.origin_hub_lat : leg.dest_hub_lat
  const lng = edge === 'origin' ? leg.origin_hub_lon : leg.dest_hub_lon
  if (lat == null || lng == null) return null

  return [...PORTS]
    .map((port) => ({
      ...port,
      distanceToLocationKm: haversine(lat, lng, port.lat, port.lng),
    }))
    .sort((a, b) => a.distanceToLocationKm - b.distanceToLocationKm)[0]
}

function buildSurfaceLeg({
  id,
  from,
  to,
  cargoTonnes,
  anchorPort,
  roleLabel,
}: {
  id: string
  from: GeoNode
  to: GeoNode
  cargoTonnes: number
  anchorPort: DemoPort
  roleLabel: string
}): RouteLeg {
  const directKm = haversine(from.lat, from.lng, to.lat, to.lng)
  const trafficIndex = deriveTrafficIndex(from.label ?? roleLabel, anchorPort)
  const baseDistance =
    directKm * CONFIG.surfaceRouteMultiplier * clamp(anchorPort.roadBias, 0.9, 1.14)

  const directTruckDistance = baseDistance * 0.97
  const ecoTruckDistance = directKm * CONFIG.ecoSurfaceMultiplier

  const directTruckEmissions =
    directTruckDistance *
    cargoTonnes *
    CONFIG.truckFactor *
    (1.02 + trafficIndex * 0.58)
  const directTruckDurationHours =
    directTruckDistance / (CONFIG.truckSpeedKmh * (0.88 - trafficIndex * 0.1))
  const ecoTruckEmissions =
    ecoTruckDistance *
    cargoTonnes *
    CONFIG.truckFactor *
    (0.92 + trafficIndex * 0.12)
  const ecoTruckDurationHours = ecoTruckDistance / CONFIG.ecoTruckSpeedKmh

  const options: SurfaceOption[] = [
    {
      mode: 'truck',
      label: `${roleLabel} via shortest truck lane`,
      strategy:
        'Shortest access road, but modeled congestion raises idle and stop-start emissions.',
      trafficLevel: trafficIndex > 0.72 ? 'High' : 'Moderate',
      distanceKm: directTruckDistance,
      emissionsKg: directTruckEmissions,
      durationHours: directTruckDurationHours,
      geometry: createSurfaceGeometry(from, to, 'direct-truck'),
    },
    {
      mode: 'truck',
      label: `${roleLabel} via lower-traffic truck corridor`,
      strategy:
        'Longer truck approach that bypasses congestion, lowering emissions despite extra distance.',
      trafficLevel: trafficIndex > 0.68 ? 'Moderate' : 'Low',
      distanceKm: ecoTruckDistance,
      emissionsKg: ecoTruckEmissions,
      durationHours: ecoTruckDurationHours,
      geometry: createSurfaceGeometry(from, to, 'eco-truck'),
    },
  ]

  if (
    directKm >= CONFIG.railMinDistanceKm &&
    anchorPort.cargoScore >= CONFIG.railCargoScoreThreshold
  ) {
    const railDistance = directKm * CONFIG.railRouteMultiplier
    const railEmissions =
      railDistance * cargoTonnes * CONFIG.railFactor +
      cargoTonnes * CONFIG.railTransferPerTonneKg

    options.push({
      mode: 'rail',
      label: `${roleLabel} by inland rail shuttle`,
      strategy:
        'Intermodal rail is chosen when lower line-haul emissions beat the transfer overhead.',
      trafficLevel: 'Low',
      distanceKm: railDistance,
      emissionsKg: railEmissions,
      durationHours: railDistance / CONFIG.railSpeedKmh,
      geometry: createSurfaceGeometry(from, to, 'rail'),
    })
  }

  const selected = [...options].sort((a, b) => {
    if (a.emissionsKg !== b.emissionsKg) return a.emissionsKg - b.emissionsKg
    return a.distanceKm - b.distanceKm
  })[0]

  return {
    id,
    kind: 'surface',
    mode: selected.mode,
    label: selected.label,
    strategy: selected.strategy,
    fromLabel: from.label ?? 'Waypoint',
    toLabel: to.label ?? 'Waypoint',
    distanceKm: selected.distanceKm,
    emissionsKg: selected.emissionsKg,
    durationHours: selected.durationHours,
    trafficLevel: selected.trafficLevel,
    geometry: selected.geometry,
    isEstimated: true,
    notes: selected.strategy,
  }
}

function buildSeaPlan({
  routeId,
  originPort,
  destinationPort,
  cargoTonnes,
}: {
  routeId: number
  originPort: DemoPort
  destinationPort: DemoPort
  cargoTonnes: number
}): SeaPlan {
  const directDistanceKm =
    haversine(originPort.lat, originPort.lng, destinationPort.lat, destinationPort.lng) *
    CONFIG.seaRouteMultiplier
  const intermediatePort = selectIntermediatePort(originPort, destinationPort, directDistanceKm)
  const seaStops = intermediatePort
    ? [originPort, intermediatePort, destinationPort]
    : [originPort, destinationPort]

  const legs = seaStops.slice(0, -1).map((port, index) => {
    const nextPort = seaStops[index + 1]
    const corridor = buildSeaCorridor(
      { lat: port.lat, lng: port.lng, label: port.name },
      { lat: nextPort.lat, lng: nextPort.lng, label: nextPort.name },
      index,
    )
    const segmentDistanceKm = corridor.distanceKm
    const segmentEmissionsKg =
      segmentDistanceKm *
      cargoTonnes *
      CONFIG.shipFactor *
      (intermediatePort ? 0.96 : 1)
    const segmentDurationHours = segmentDistanceKm / CONFIG.shipSpeedKmh

    return {
      id: `sea-${routeId}-${index + 1}`,
      kind: 'sea' as const,
      mode: 'ship' as const,
      label: intermediatePort
        ? `MSC sea corridor ${index + 1}`
        : 'MSC direct sea corridor',
      strategy: intermediatePort
        ? `Dotted sea lane uses ${intermediatePort.name} as a transshipment hub to keep a greener long-haul corridor.`
        : 'Dotted sea lane represents the modeled ocean corridor between the selected ports.',
      fromLabel: port.name,
      toLabel: nextPort.name,
      distanceKm: segmentDistanceKm,
      emissionsKg: segmentEmissionsKg,
      durationHours: segmentDurationHours,
      trafficLevel: null,
      geometry: corridor.geometry,
      isEstimated: true,
      notes: intermediatePort
        ? `Via ${intermediatePort.name} to stay on a stronger green corridor.`
        : 'Water-aware sea lane generated from the maritime network.',
    }
  })

  return {
    legs,
    distanceKm: legs.reduce((sum, leg) => sum + leg.distanceKm, 0),
    emissionsKg: legs.reduce((sum, leg) => sum + leg.emissionsKg, 0),
    intermediatePort,
  }
}

function selectIntermediatePort(
  originPort: DemoPort,
  destinationPort: DemoPort,
  directDistanceKm: number,
) {
  if (directDistanceKm < CONFIG.transshipmentMinSeaKm) return null

  const midpoint = midpointBetween(originPort, destinationPort)
  const bestCandidate = TRANSSHIPMENT_HUBS.map((hub) => {
    if (hub.id === originPort.id || hub.id === destinationPort.id) return null

    const viaDistance =
      haversine(originPort.lat, originPort.lng, hub.lat, hub.lng) +
      haversine(hub.lat, hub.lng, destinationPort.lat, destinationPort.lng)
    const detourRatio = viaDistance / (directDistanceKm / CONFIG.seaRouteMultiplier)
    if (detourRatio > CONFIG.transshipmentDetourCap) return null

    const midpointDistance = haversine(midpoint.lat, midpoint.lng, hub.lat, hub.lng)
    const score =
      midpointDistance +
      detourRatio * 850 -
      hub.cargoScore * 90 +
      hub.activityScore * 110

    return { hub, score }
  })
    .filter((candidate): candidate is { hub: DemoPort; score: number } => Boolean(candidate))
    .sort((a, b) => a.score - b.score)[0]

  return bestCandidate?.hub ?? null
}

function computeHotspotPenalty(
  originPort: DemoPort,
  destinationPort: DemoPort,
  cargoTonnes: number,
) {
  const originScore = originPort.activityScore
  const destinationScore = destinationPort.activityScore
  return (originScore + destinationScore) * cargoTonnes * CONFIG.portPenaltyBase
}

function deriveConfidence(signals: Array<MatchQuality | ProxyConfidence>): RouteConfidence {
  if (signals.includes('low')) return 'Low'
  if (signals.includes('medium')) return 'Medium'
  return 'High'
}

function derivePrimarySurfaceMode(
  originMode: RouteLegMode,
  destinationMode: RouteLegMode,
): SurfaceMode | 'mixed' {
  if (
    originMode === destinationMode &&
    (originMode === 'truck' || originMode === 'rail')
  ) {
    return originMode
  }
  return 'mixed'
}

function derivePrimarySurfaceModeFromLegs(legs: RouteLeg[]) {
  const modes = legs
    .filter((leg) => leg.mode === 'truck' || leg.mode === 'rail')
    .map((leg) => leg.mode)

  if (modes.length === 0) return 'mixed'
  if (modes.every((mode) => mode === 'truck')) return 'truck'
  if (modes.every((mode) => mode === 'rail')) return 'rail'
  return 'mixed'
}

function buildModeSequence(legs: RouteLeg[]) {
  const modeLabels = legs
    .map((leg) => formatModeLabel(leg.mode))
    .filter((label, index, all) => label !== all[index - 1])

  return modeLabels.join(' -> ')
}

function buildExplanation({
  originSurfaceLeg,
  destinationSurfaceLeg,
  intermediatePort,
  hotspotPenaltyKg,
  surfaceShare,
  originPort,
  destinationPort,
}: {
  originSurfaceLeg: RouteLeg
  destinationSurfaceLeg: RouteLeg
  intermediatePort: DemoPort | null
  hotspotPenaltyKg: number
  surfaceShare: number
  originPort: DemoPort
  destinationPort: DemoPort
}) {
  if (originSurfaceLeg.mode === 'rail' || destinationSurfaceLeg.mode === 'rail') {
    return 'One inland segment shifts to rail because the transfer overhead is lower than keeping that leg on truck.'
  }

  if (intermediatePort) {
    return `A transshipment hop through ${intermediatePort.name} makes the long-haul sea corridor cleaner without changing the factory or destination endpoints.`
  }

  if (hotspotPenaltyKg > 60) {
    return `The corridor is competitive, but infrastructure intensity at ${originPort.name} and ${destinationPort.name} still adds avoidable carbon risk.`
  }

  if (surfaceShare > 0.42) {
    return 'Most of the gain comes from a lower-emission inland approach, so the first and last mile matter more here than the sea lane.'
  }

  return 'This route balances a clean inland approach with a manageable maritime corridor and lower port-intensity exposure.'
}

function buildInsights({
  recommendedRoute,
  baselineRoute,
  feasibleCount,
  budget,
  maxTransitHours,
  includeHotspots,
}: {
  recommendedRoute: RouteCandidate
  baselineRoute: RouteCandidate
  feasibleCount: number
  budget: number
  maxTransitHours: number | null
  includeHotspots: boolean
}) {
  const savingsKg = Math.max(
    baselineRoute.totalEmissionsKg - recommendedRoute.totalEmissionsKg,
    0,
  )
  const budgetHeadroom = budget - recommendedRoute.totalEmissionsKg
  const timeHeadroom =
    maxTransitHours == null ? null : maxTransitHours - recommendedRoute.totalDurationHours
  const carbonTaxDelta = Math.max(
    baselineRoute.carbonTaxCost - recommendedRoute.carbonTaxCost,
    0,
  )
  const dominantLever =
    recommendedRoute.surfaceShare > 0.4
      ? recommendedRoute.primarySurfaceMode === 'rail'
        ? 'Protect the intermodal rail leg because inland access is doing most of the decarbonization work.'
        : 'Steer trucks onto the lower-traffic access corridor because inland emissions dominate this route.'
      : recommendedRoute.intermediatePort
        ? `Keep the ${recommendedRoute.intermediatePort.name} transshipment option because the sea lane is the main lever here.`
        : 'Lock in the cleaner port pair because the maritime corridor is doing most of the work.'

  return {
    savingsKg,
    budgetHeadroom,
    timeHeadroom,
    carbonTaxDelta,
    dominantLever,
    hotspotMode: includeHotspots
      ? 'Port activity penalties are active using WPI-derived infrastructure intensity while EO hotspot layers are prepared.'
      : 'Ranking is based on transport emissions only.',
    feasibilityLabel:
      feasibleCount > 0
        ? `${feasibleCount} candidate routes stay under the carbon budget.`
        : 'No route clears the budget yet, so the planner is showing the closest low-emission fallback.',
    keyRisk:
      recommendedRoute.confidence === 'High'
        ? 'Confidence is high because the demo geocoder matched cleanly and the selected ports come from the processed World Port Index subset.'
        : 'Confidence drops when the demo geocoder uses fallback assumptions or when the route depends on lower-confidence port proxies.',
    plannerSource:
      recommendedRoute.dataSource === 'live'
        ? 'Live backend planning'
        : 'Frontend demo planner',
  }
}

function deriveTrafficIndex(locationLabel: string, anchorPort: DemoPort) {
  const normalized = locationLabel.toLowerCase()
  let locationFactor = 0.58

  if (normalized.includes('retail')) locationFactor = 0.82
  else if (normalized.includes('store')) locationFactor = 0.88
  else if (normalized.includes('fulfillment')) locationFactor = 0.78
  else if (normalized.includes('assembly')) locationFactor = 0.66
  else if (normalized.includes('factory')) locationFactor = 0.56

  return clamp((locationFactor + anchorPort.activityScore + anchorPort.roadBias) / 3, 0.32, 1)
}

function createSurfaceGeometry(
  start: GeoNode,
  end: GeoNode,
  variant: 'direct-truck' | 'eco-truck' | 'rail',
) {
  const profile =
    variant === 'direct-truck'
      ? { offsets: [0, 0.3, -0.14, 0.1, 0], scale: 0.42 }
      : variant === 'eco-truck'
        ? { offsets: [0, 0.46, -0.22, 0.14, 0], scale: 0.64 }
        : { offsets: [0, 0.12, -0.06, 0.08, 0], scale: 0.28 }

  return createCurvedPath(start, end, profile.offsets, profile.scale)
}

function createSeaGeometry(start: GeoNode, end: GeoNode, segmentIndex: number) {
  const baseOffsets =
    segmentIndex % 2 === 0
      ? [0, 0.34, 0.52, 0.24, 0]
      : [0, -0.26, -0.4, -0.18, 0]

  return createCurvedPath(start, end, baseOffsets, 1.08)
}

function buildSeaCorridor(start: GeoNode, end: GeoNode, segmentIndex: number) {
  if (isShortRegionalSeaHop(start, end)) {
    return {
      geometry: createSeaGeometry(start, end, segmentIndex),
      distanceKm:
        haversine(start.lat, start.lng, end.lat, end.lng) * CONFIG.seaRouteMultiplier,
    }
  }

  const startAccessNodes = resolvePortAccessNodes(start)
  const endAccessNodes = resolvePortAccessNodes(end)
  const bestRoute = findBestSeaLanePath(start, end, startAccessNodes, endAccessNodes)
  const seaLaneNodes = bestRoute
    ? bestRoute.nodeIds
        .map((nodeId) => SEA_LANE_NODE_MAP.get(nodeId))
        .filter((node): node is SeaLaneNode => Boolean(node))
    : []
  const corridorStops =
    seaLaneNodes.length > 0 ? [start, ...seaLaneNodes, end] : [start, end]
  const geometry: Coordinate[] = []
  let distanceKm = 0

  corridorStops.slice(0, -1).forEach((point, index) => {
    const nextPoint = corridorStops[index + 1]
    const segmentGeometry = createSeaGeometry(point, nextPoint, segmentIndex + index)
    const segmentDistance =
      haversine(point.lat, point.lng, nextPoint.lat, nextPoint.lng) *
      CONFIG.seaRouteMultiplier

    if (index === 0) geometry.push(...segmentGeometry)
    else geometry.push(...segmentGeometry.slice(1))

    distanceKm += segmentDistance
  })

  return {
    geometry,
    distanceKm: bestRoute?.distanceKm ?? distanceKm,
  }
}

function findBestSeaLanePath(
  start: GeoNode,
  end: GeoNode,
  startAccessNodes: string[],
  endAccessNodes: string[],
): SeaLaneRoute | null {
  let bestRoute: SeaLaneRoute | null = null

  startAccessNodes.forEach((startNodeId) => {
    endAccessNodes.forEach((endNodeId) => {
      const seaLaneRoute = findSeaLanePath(startNodeId, endNodeId)
      const startNode = SEA_LANE_NODE_MAP.get(startNodeId)
      const endNode = SEA_LANE_NODE_MAP.get(endNodeId)

      if (!seaLaneRoute || !startNode || !endNode) return

      const totalDistanceKm =
        haversine(start.lat, start.lng, startNode.lat, startNode.lng) *
          CONFIG.seaRouteMultiplier +
        seaLaneRoute.distanceKm +
        haversine(end.lat, end.lng, endNode.lat, endNode.lng) *
          CONFIG.seaRouteMultiplier

      if (!bestRoute || totalDistanceKm < bestRoute.distanceKm) {
        bestRoute = {
          nodeIds: seaLaneRoute.nodeIds,
          distanceKm: totalDistanceKm,
        }
      }
    })
  })

  return bestRoute
}

function findSeaLanePath(startNodeId: string, endNodeId: string): SeaLaneRoute | null {
  if (startNodeId === endNodeId) {
    return {
      nodeIds: [startNodeId],
      distanceKm: 0,
    }
  }

  const distances = new Map<string, number>()
  const previous = new Map<string, string | null>()
  const unvisited = new Set(SEA_LANE_NETWORK.nodes.map((node) => node.id))

  SEA_LANE_NETWORK.nodes.forEach((node) => {
    distances.set(node.id, Number.POSITIVE_INFINITY)
    previous.set(node.id, null)
  })
  distances.set(startNodeId, 0)

  while (unvisited.size > 0) {
    let currentNodeId: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY

    unvisited.forEach((nodeId) => {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY
      if (distance < currentDistance) {
        currentDistance = distance
        currentNodeId = nodeId
      }
    })

    if (!currentNodeId || currentDistance === Number.POSITIVE_INFINITY) break
    if (currentNodeId === endNodeId) break

    unvisited.delete(currentNodeId)

    ;(SEA_LANE_ADJACENCY.get(currentNodeId) ?? []).forEach((neighbor) => {
      if (!unvisited.has(neighbor.nodeId)) return

      const nextDistance = currentDistance + neighbor.distanceKm
      if (nextDistance < (distances.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.nodeId, nextDistance)
        previous.set(neighbor.nodeId, currentNodeId)
      }
    })
  }

  const totalDistance = distances.get(endNodeId)
  if (!totalDistance || totalDistance === Number.POSITIVE_INFINITY) return null

  const nodeIds: string[] = []
  let currentNodeId: string | null = endNodeId

  while (currentNodeId) {
    nodeIds.unshift(currentNodeId)
    currentNodeId = previous.get(currentNodeId) ?? null
  }

  return {
    nodeIds,
    distanceKm: totalDistance,
  }
}

function resolvePortAccessNodes(point: GeoNode) {
  const accessNodes = new Set<string>()

  if (isIndiaLike(point)) {
    accessNodes.add(point.lng < 78 ? 'arabian_sea' : 'sri_lanka_south')
    accessNodes.add('sri_lanka_south')
  }

  if (isSoutheastAsiaLike(point)) {
    accessNodes.add('malacca_strait')
    accessNodes.add('singapore_strait')
    accessNodes.add('south_china_sea')
  }

  if (isEastAsiaLike(point)) {
    accessNodes.add(point.lat > 30 || point.lng > 128 ? 'sea_of_japan' : 'east_china_sea')
    accessNodes.add(point.lat < 22 ? 'south_china_sea' : 'east_china_sea')
  }

  if (isMiddleEastLike(point)) {
    accessNodes.add('gulf_of_aden')
    if (point.lat > 16) accessNodes.add('red_sea_south')
    if (point.lat > 24 && point.lng < 38) accessNodes.add('suez_approach')
  }

  if (isMediterraneanLike(point)) {
    accessNodes.add('mediterranean_central')
    if (point.lng < 6) accessNodes.add('gibraltar')
  }

  if (isAtlanticEuropeLike(point)) {
    accessNodes.add('bay_of_biscay')
    accessNodes.add('north_sea')
  }

  if (isWestCoastUsLike(point)) {
    accessNodes.add('california_approach')
    accessNodes.add('north_pacific_east')
    if (point.lat < 34) accessNodes.add('panama')
  }

  if (accessNodes.size === 0) {
    SEA_LANE_NETWORK.nodes
      .map((node) => ({
        id: node.id,
        distanceKm: haversine(point.lat, point.lng, node.lat, node.lng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 2)
      .forEach((node) => accessNodes.add(node.id))
  }

  return [...accessNodes]
}

function buildSeaLaneAdjacency(nodes: SeaLaneNode[], edges: SeaLaneEdge[]) {
  const adjacency = new Map<string, Array<{ nodeId: string; distanceKm: number }>>()
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  edges.forEach((edge) => {
    const fromNode = nodeMap.get(edge.from)
    const toNode = nodeMap.get(edge.to)
    if (!fromNode || !toNode) return

    const distanceKm =
      haversine(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng) *
      CONFIG.seaRouteMultiplier

    adjacency.set(edge.from, [
      ...(adjacency.get(edge.from) ?? []),
      { nodeId: edge.to, distanceKm },
    ])
    adjacency.set(edge.to, [
      ...(adjacency.get(edge.to) ?? []),
      { nodeId: edge.from, distanceKm },
    ])
  })

  return adjacency
}

function isShortRegionalSeaHop(start: GeoNode, end: GeoNode) {
  const directDistanceKm = haversine(start.lat, start.lng, end.lat, end.lng)
  return directDistanceKm < 1200 && sharesSeaRegion(start, end)
}

function sharesSeaRegion(start: GeoNode, end: GeoNode) {
  return (
    (isEastAsiaLike(start) && isEastAsiaLike(end)) ||
    (isIndiaLike(start) && isIndiaLike(end)) ||
    (isMediterraneanLike(start) && isMediterraneanLike(end)) ||
    (isAtlanticEuropeLike(start) && isAtlanticEuropeLike(end)) ||
    (isWestCoastUsLike(start) && isWestCoastUsLike(end))
  )
}

function isIndiaLike(point: GeoNode) {
  return point.lng >= 65 && point.lng <= 84 && point.lat >= 5 && point.lat <= 25
}

function isEastAsiaLike(point: GeoNode) {
  return point.lng >= 105 && point.lng <= 145 && point.lat >= 1 && point.lat <= 42
}

function isSoutheastAsiaLike(point: GeoNode) {
  return point.lng >= 95 && point.lng <= 115 && point.lat >= -2 && point.lat <= 16
}

function isMiddleEastLike(point: GeoNode) {
  return point.lng >= 32 && point.lng <= 60 && point.lat >= 10 && point.lat <= 32
}

function isMediterraneanLike(point: GeoNode) {
  return point.lng >= -6 && point.lng <= 36 && point.lat >= 30 && point.lat <= 46
}

function isAtlanticEuropeLike(point: GeoNode) {
  return point.lng >= -12 && point.lng <= 12 && point.lat > 46
}

function isWestCoastUsLike(point: GeoNode) {
  return point.lng <= -110 && point.lng >= -130 && point.lat >= 24 && point.lat <= 50
}

function createCurvedPath(
  start: GeoNode,
  end: GeoNode,
  offsets: number[],
  curveScale: number,
) {
  const adjustedEndLng = normalizeForShortestPath(start.lng, end.lng)
  const deltaLat = end.lat - start.lat
  const deltaLng = adjustedEndLng - start.lng
  const length = Math.hypot(deltaLat, deltaLng) || 1
  const perpendicularLat = -deltaLng / length
  const perpendicularLng = deltaLat / length
  const distanceScale = clamp(haversine(start.lat, start.lng, end.lat, end.lng) / 1800, 0.18, 1.65)

  return offsets.map((offset, index) => {
    const ratio = offsets.length === 1 ? 0 : index / (offsets.length - 1)
    const baseLat = start.lat + deltaLat * ratio
    const baseLng = start.lng + deltaLng * ratio
    const displacement = offset * curveScale * distanceScale

    return [
      baseLat + perpendicularLat * displacement,
      normalizeLongitude(baseLng + perpendicularLng * displacement),
    ] as Coordinate
  })
}

function midpointBetween(start: GeoNode, end: GeoNode) {
  const adjustedEndLng = normalizeForShortestPath(start.lng, end.lng)
  return {
    lat: (start.lat + end.lat) / 2,
    lng: normalizeLongitude((start.lng + adjustedEndLng) / 2),
  }
}

function normalizeForShortestPath(startLng: number, endLng: number) {
  if (endLng - startLng > 180) return endLng - 360
  if (endLng - startLng < -180) return endLng + 360
  return endLng
}

function normalizeLongitude(value: number) {
  if (value > 180) return value - 360
  if (value < -180) return value + 360
  return value
}

function geometryToCoordinates(leg: ApiRouteLeg) {
  const rawCoordinates = leg.geometry_geojson?.coordinates
  if (!rawCoordinates || rawCoordinates.length < 2) {
    const fallback = [
      [leg.origin_hub_lat, leg.origin_hub_lon],
      [leg.dest_hub_lat, leg.dest_hub_lon],
    ].filter(
      (point): point is [number, number] => point[0] != null && point[1] != null,
    )

    return fallback.map(([lat, lng]) => [lat, lng] as Coordinate)
  }

  return rawCoordinates.map(([lng, lat]) => [lat, lng] as Coordinate)
}

function estimatedDistanceFromCoordinates(coordinates: Coordinate[]) {
  if (coordinates.length < 2) return 0

  return coordinates.slice(0, -1).reduce((sum, point, index) => {
    const nextPoint = coordinates[index + 1]
    return sum + haversine(point[0], point[1], nextPoint[0], nextPoint[1])
  }, 0)
}

function buildApiLegLabel(leg: ApiRouteLeg) {
  if (leg.mode === 'ship') return 'Backend multimodal sea lane'
  if (leg.mode === 'rail') return 'Backend intermodal rail leg'
  if (leg.mode === 'air') return 'Backend long-haul air leg'
  return 'Backend first/last-mile truck leg'
}

function buildApiLegStrategy(mode: ApiRouteLeg['mode']) {
  if (mode === 'ship') return 'Live backend-generated sea lane.'
  if (mode === 'rail') return 'Live backend-generated rail approximation.'
  if (mode === 'air') return 'Live backend-generated air corridor.'
  return 'Live backend-generated surface route.'
}

function deriveApiTrafficLevel(mode: ApiRouteLeg['mode']): TrafficLevel | null {
  if (mode === 'ship') return null
  if (mode === 'rail') return 'Low'
  return 'Moderate'
}

function emissionsForMode(mode: RouteLegMode, distanceKm: number, cargoTonnes: number) {
  if (mode === 'truck') return distanceKm * cargoTonnes * CONFIG.truckFactor
  if (mode === 'rail') return distanceKm * cargoTonnes * CONFIG.railFactor
  if (mode === 'air') return distanceKm * cargoTonnes * 0.85
  if (mode === 'ship') return distanceKm * cargoTonnes * CONFIG.shipFactor
  return 0
}

function estimateDurationHours(mode: RouteLegMode | 'air', distanceKm: number) {
  if (mode === 'truck') return distanceKm / CONFIG.truckSpeedKmh
  if (mode === 'rail') return distanceKm / CONFIG.railSpeedKmh
  if (mode === 'ship') return distanceKm / CONFIG.shipSpeedKmh
  return distanceKm / 650
}

function linehaulTaxCost(totalEmissionsKg: number, carbonTaxPerTonne: number) {
  if (carbonTaxPerTonne <= 0) return 0
  return (totalEmissionsKg / 1000) * carbonTaxPerTonne
}

function routeFeasibilityRank(route: RouteCandidate) {
  const budgetPenalty = route.budgetPass ? 0 : 1
  const timePenalty = route.withinTimePolicy === false ? 1 : 0
  return budgetPenalty + timePenalty
}

function safeRatio(value: number, total: number) {
  if (total <= 0) return 0
  return value / total
}

function formatModeLabel(mode: RouteLegMode) {
  if (mode === 'truck') return 'Truck'
  if (mode === 'rail') return 'Rail'
  if (mode === 'air') return 'Air'
  return 'Ship'
}

function portSelectionRank(distanceToLocationKm: number, cargoScore: number) {
  return distanceToLocationKm / (1 + cargoScore)
}

export function projectPoint(
  lat: number,
  lng: number,
  width: number,
  height: number,
) {
  const x = ((lng + 180) / 360) * (width - 48) + 24
  const y = ((90 - lat) / 180) * (height - 48) + 24
  return {
    x: clamp(x, 24, width - 24),
    y: clamp(y, 24, height - 24),
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return radiusKm * c
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
