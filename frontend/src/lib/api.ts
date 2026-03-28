const base =
  import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000'

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${base}/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

export type TransportMode = 'truck' | 'rail' | 'ship' | 'air'

export type ApiRouteLeg = {
  mode: TransportMode
  distance_km: number
  emissions_kg_co2e?: number | null
  duration_hours?: number | null
  geometry_geojson?: {
    type: string
    coordinates?: number[][]
  } | null
  origin_hub_name?: string | null
  dest_hub_name?: string | null
  origin_hub_lat?: number | null
  origin_hub_lon?: number | null
  dest_hub_lat?: number | null
  dest_hub_lon?: number | null
  origin_is_chokepoint?: boolean
  dest_is_chokepoint?: boolean
  notes?: string | null
}

export type RouteLeg = ApiRouteLeg

export type RouteEvaluateRequest = {
  weight_kg: number
  origin_label?: string
  destination_label?: string
  legs: ApiRouteLeg[]
  constraints?: {
    carbon_budget_kg_co2e?: number | null
    max_transit_time_hours?: number | null
  }
  economics?: {
    carbon_tax_per_tonne_co2e?: number
  }
}

export type ApiRouteEvaluation = {
  id?: string | null
  legs: ApiRouteLeg[]
  total_emissions_kg_co2e: number
  total_duration_hours: number
  carbon_tax_cost: number
  within_carbon_budget?: boolean | null
  within_time_policy?: boolean | null
}

export type RouteEvaluation = ApiRouteEvaluation

export type MultimodalPlanRequest = {
  origin_address: string
  destination_address: string
  weight_kg: number
  longhaul_modes?: TransportMode[]
  surface_modes?: Array<'truck' | 'rail'>
  constraints?: {
    carbon_budget_kg_co2e?: number | null
    max_transit_time_hours?: number | null
  }
  economics?: {
    carbon_tax_per_tonne_co2e?: number
  }
}

export type MultimodalPlanResponse = {
  origin?: { lat: number; lon: number; name?: string | null } | null
  destination?: { lat: number; lon: number; name?: string | null } | null
  options: ApiRouteEvaluation[]
  recommendation_id?: string | null
  data_sources?: Record<string, Record<string, string | number> | null> | null
}

export async function evaluateRoute(
  body: RouteEvaluateRequest,
): Promise<ApiRouteEvaluation> {
  const res = await fetch(`${base}/api/routes/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Evaluate failed: ${res.status}`)
  }
  return res.json()
}

export async function planMultimodalRoute(
  body: MultimodalPlanRequest,
): Promise<MultimodalPlanResponse> {
  const res = await fetch(`${base}/api/routes/plan/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Plan failed: ${res.status}`)
  }
  return res.json()
}

export const DEMO_TRUCK_SHIP_TRUCK_LEGS: ApiRouteLeg[] = [
  { mode: 'truck', distance_km: 150 },
  { mode: 'ship', distance_km: 8200 },
  { mode: 'truck', distance_km: 120 },
]
