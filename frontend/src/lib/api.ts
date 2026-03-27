const base = import.meta.env.VITE_API_URL ?? ''

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${base}/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

export type TransportMode = 'truck' | 'rail' | 'ship' | 'air'

export type RouteLeg = {
  mode: TransportMode
  distance_km: number
  duration_hours?: number | null
}

export type RouteEvaluateRequest = {
  weight_kg: number
  origin_label?: string
  destination_label?: string
  legs: RouteLeg[]
  constraints?: {
    carbon_budget_kg_co2e?: number | null
    max_transit_time_hours?: number | null
  }
  economics?: {
    carbon_tax_per_tonne_co2e?: number
  }
}

export type RouteEvaluation = {
  legs: RouteLeg[]
  total_emissions_kg_co2e: number
  total_duration_hours: number
  carbon_tax_cost: number
  within_carbon_budget?: boolean | null
  within_time_policy?: boolean | null
}

export async function evaluateRoute(
  body: RouteEvaluateRequest,
): Promise<RouteEvaluation> {
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

/** Demo multimodal chain until ORS + WPI build full legs. */
export const DEMO_TRUCK_SHIP_TRUCK_LEGS: RouteLeg[] = [
  { mode: 'truck', distance_km: 150 },
  { mode: 'ship', distance_km: 8200 },
  { mode: 'truck', distance_km: 120 },
]
