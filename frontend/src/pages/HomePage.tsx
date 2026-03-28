import { lazy, startTransition, Suspense, useMemo, useState, type FormEvent } from 'react'

import { RouteMap } from '../components/map/RouteMap'
import { OECD_MARITIME_SUMMARY } from '../data/oecdSummary.generated'
import {
  adaptBackendPlan,
  LOCATION_OPTIONS,
  planRoute,
  type PlannerResult,
  type RouteCandidate,
  type RoutePlanRequest,
} from '../lib/demoPlanner'
import {
  planMultimodalRoute,
  type MultimodalPlanResponse,
  type RouteEvaluation,
  type TransportMode,
} from '../lib/api'

const RouteGlobe = lazy(() =>
  import('../components/map/RouteGlobe').then((m) => ({ default: m.RouteGlobe })),
)

type FormState = {
  origin_address: string
  destination_address: string
  cargo_weight_tonnes: string
  carbon_budget_kg: string
  carbon_tax_per_tonne_co2e: string
  max_transit_time_hours: string
  include_hotspot_penalties: boolean
  include_ship: boolean
  include_air: boolean
  include_truck: boolean
  include_rail: boolean
}

const DEFAULT_FORM_STATE: FormState = {
  origin_address: 'Auto Components Campus, Pune, India',
  destination_address: 'Rotterdam Assembly Plant, Rotterdam, Netherlands',
  cargo_weight_tonnes: '28',
  carbon_budget_kg: '6400',
  carbon_tax_per_tonne_co2e: '110',
  max_transit_time_hours: '540',
  include_hotspot_penalties: false,
  include_ship: true,
  include_air: false,
  include_truck: true,
  include_rail: true,
}

function formStateToPayload(form: FormState): RoutePlanRequest {
  return {
    origin_address: form.origin_address.trim(),
    destination_address: form.destination_address.trim(),
    cargo_weight_tonnes: Number(form.cargo_weight_tonnes),
    carbon_budget_kg: Number(form.carbon_budget_kg),
    carbon_tax_per_tonne_co2e: Number(form.carbon_tax_per_tonne_co2e || 0),
    max_transit_time_hours: form.max_transit_time_hours
      ? Number(form.max_transit_time_hours)
      : null,
    include_hotspot_penalties: form.include_hotspot_penalties,
  }
}

function selectedLonghaulModes(form: FormState): TransportMode[] {
  const modes: TransportMode[] = []
  if (form.include_ship) modes.push('ship')
  if (form.include_air) modes.push('air')
  return modes.length > 0 ? modes : ['ship']
}

function selectedSurfaceModes(form: FormState): Array<'truck' | 'rail'> {
  const modes: Array<'truck' | 'rail'> = []
  if (form.include_truck) modes.push('truck')
  if (form.include_rail) modes.push('rail')
  return modes.length > 0 ? modes : ['truck']
}

export function HomePage() {
  const initialPayload = formStateToPayload(DEFAULT_FORM_STATE)
  const initialResult = planRoute(initialPayload)

  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE)
  const [result, setResult] = useState<PlannerResult>(initialResult)
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    initialResult.recommendedRoute.routeId,
  )
  const [plannerMode, setPlannerMode] = useState<'live' | 'demo'>('demo')
  const [plannerMessage, setPlannerMessage] = useState<string | null>('Run planning to fetch live backend routes.')
  const [liveResponse, setLiveResponse] = useState<MultimodalPlanResponse | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [spatialTab, setSpatialTab] = useState<'map' | 'globe'>('map')

  const selectedRoute =
    result.routes.find((route) => route.routeId === selectedRouteId) ??
    result.recommendedRoute

  const convertedRoutes = useMemo(
    () => result.routes.map(convertRouteCandidateToEvaluation),
    [result.routes],
  )
  const convertedSelectedRoute = useMemo(
    () => convertRouteCandidateToEvaluation(selectedRoute),
    [selectedRoute],
  )

  const applyResult = (
    nextResult: PlannerResult,
    mode: 'live' | 'demo',
    message: string,
    response: MultimodalPlanResponse | null,
  ) => {
    startTransition(() => {
      setResult(nextResult)
      setSelectedRouteId(nextResult.recommendedRoute.routeId)
      setPlannerMode(mode)
      setPlannerMessage(message)
      setLiveResponse(response)
    })
  }

  const runPlanner = async (nextFormState: FormState) => {
    const payload = formStateToPayload(nextFormState)
    setIsPlanning(true)

    try {
      const response = await planMultimodalRoute({
        origin_address: payload.origin_address,
        destination_address: payload.destination_address,
        weight_kg: payload.cargo_weight_tonnes * 1000,
        longhaul_modes: selectedLonghaulModes(nextFormState),
        surface_modes: selectedSurfaceModes(nextFormState),
        constraints: {
          carbon_budget_kg_co2e: payload.carbon_budget_kg,
          max_transit_time_hours: payload.max_transit_time_hours,
        },
        economics: {
          carbon_tax_per_tonne_co2e: payload.carbon_tax_per_tonne_co2e,
        },
      })

      if (response.options.length === 0) {
        throw new Error('Backend returned zero routes for this combination.')
      }

      const liveResult = adaptBackendPlan(payload, response)
      const portsSummary = formatSourceSummary(response.data_sources?.ports)
      applyResult(
        liveResult,
        'live',
        portsSummary ? `Live backend route planning active. ${portsSummary}` : 'Live backend route planning active.',
        response,
      )
    } catch (error) {
      const fallback = planRoute(payload)
      applyResult(
        fallback,
        'demo',
        error instanceof Error
          ? `Live API unavailable: ${error.message}. Start backend with: cd backend && uvicorn app.main:app --reload --port 8000`
          : 'Live API unavailable, showing deterministic demo routing. Start backend with: cd backend && uvicorn app.main:app --reload --port 8000',
        null,
      )
    } finally {
      setIsPlanning(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await runPlanner(formState)
  }

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId)
    setIsDetailOpen(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SpaceHACK for Sustainability · Net-zero supply chain track</p>
          <h1>ChainWise Route Planner</h1>
        </div>
        <div className="topbar-meta">
          <span className={`pill ${plannerMode === 'live' ? '' : 'medium'}`}>
            {plannerMode === 'live' ? 'Live backend routes' : 'Demo fallback'}
          </span>
          <span className="pill">WPI ports + OECD emissions context</span>
        </div>
      </header>

      <section className="map-studio">
        <aside className="panel planner-rail">
          <div className="planner-rail-copy">
            <p className="eyebrow">Planner Inputs</p>
            <h2>Compare full multimodal corridors, not single legs.</h2>
            <p className="planner-rail-text">
              Plan routes from factory to destination with carbon budget, transit-time policy,
              and carbon tax exposure in one decision flow.
            </p>
          </div>

          <form className="planner-form" onSubmit={handleSubmit}>
            <label>
              <span>Origin address</span>
              <input
                name="origin_address"
                list="location-options"
                required
                value={formState.origin_address}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, origin_address: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Destination address</span>
              <input
                name="destination_address"
                list="location-options"
                required
                value={formState.destination_address}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, destination_address: event.target.value }))
                }
              />
            </label>

            <div className="form-grid">
              <label>
                <span>Cargo (tonnes)</span>
                <input
                  name="cargo_weight_tonnes"
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={formState.cargo_weight_tonnes}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, cargo_weight_tonnes: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Carbon budget (kg CO2e)</span>
                <input
                  name="carbon_budget_kg"
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={formState.carbon_budget_kg}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, carbon_budget_kg: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                <span>Carbon tax (per tonne CO2e)</span>
                <input
                  name="carbon_tax_per_tonne_co2e"
                  type="number"
                  min="0"
                  step="5"
                  value={formState.carbon_tax_per_tonne_co2e}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      carbon_tax_per_tonne_co2e: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Max transit time (hours)</span>
                <input
                  name="max_transit_time_hours"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={formState.max_transit_time_hours}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      max_transit_time_hours: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="form-grid">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={formState.include_ship}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, include_ship: event.target.checked }))
                  }
                />
                <span>Include ship long-haul</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={formState.include_air}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, include_air: event.target.checked }))
                  }
                />
                <span>Include air long-haul</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={formState.include_truck}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, include_truck: event.target.checked }))
                  }
                />
                <span>Include truck access legs</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={formState.include_rail}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, include_rail: event.target.checked }))
                  }
                />
                <span>Include rail access legs</span>
              </label>
            </div>

            <div className="toggle-row">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={formState.include_hotspot_penalties}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      include_hotspot_penalties: event.target.checked,
                    }))
                  }
                />
                <span>Include hotspot proxy penalty (demo fallback only)</span>
              </label>
              <button className="primary-button" type="submit" disabled={isPlanning}>
                {isPlanning ? 'Planning...' : 'Plan routes'}
              </button>
            </div>
          </form>

          <article className="planner-fact-card">
            <span className="metric-label">Planner status</span>
            <strong>{plannerMode === 'live' ? 'Backend connected' : 'Fallback mode'}</strong>
            <p>{plannerMessage}</p>
          </article>
        </aside>

        <section className="panel map-stage">
          <div className="map-stage-header">
            <div>
              <p className="eyebrow">Route Map</p>
              <h3>
                {selectedRoute.origin.label} to {selectedRoute.destination.label}
              </h3>
              <p className="map-stage-copy">
                Select any option to inspect exact backend leg geometry and emissions breakdown.
              </p>
            </div>
            <div className="route-meta">
              <div className="inline-flex overflow-hidden rounded-full border border-emerald-300/30 bg-slate-900/70">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold ${spatialTab === 'map' ? 'bg-emerald-500 text-slate-950' : 'text-slate-200'}`}
                  onClick={() => setSpatialTab('map')}
                >
                  2D Map
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold ${spatialTab === 'globe' ? 'bg-emerald-500 text-slate-950' : 'text-slate-200'}`}
                  onClick={() => setSpatialTab('globe')}
                >
                  3D Globe
                </button>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsDetailOpen((v) => !v)}
              >
                {isDetailOpen ? 'Hide route legs' : 'Show route legs'}
              </button>
              <span className={`badge ${selectedRoute.budgetPass ? '' : 'fail'}`}>
                {selectedRoute.budgetPass ? 'Budget pass' : 'Budget fail'}
              </span>
              <span className={`badge ${selectedRoute.withinTimePolicy === false ? 'fail' : ''}`}>
                {selectedRoute.withinTimePolicy === false ? 'Time policy fail' : 'Time policy pass'}
              </span>
            </div>
          </div>

          <div className="route-pill-row">
            {result.routes.map((route) => (
              <button
                key={route.routeId}
                type="button"
                className={`route-pill ${route.routeId === selectedRoute.routeId ? 'active' : ''}`}
                onClick={() => handleSelectRoute(route.routeId)}
              >
                <span>#{route.rank}</span>
                <strong>
                  {route.originPort.name} {'->'} {route.destinationPort.name}
                </strong>
                <small>{route.modeSequence}</small>
                <small>
                  {formatNumber(route.totalEmissionsKg)} kg CO2e · {formatHours(route.totalDurationHours)}
                </small>
              </button>
            ))}
          </div>

          <div className="map-mode-legend">
            <span className="legend-chip">
              <i className="legend-swatch legend-truck"></i>Truck
            </span>
            <span className="legend-chip">
              <i className="legend-swatch legend-rail"></i>Rail
            </span>
            <span className="legend-chip">
              <i className="legend-swatch legend-ship"></i>Ship/Air long-haul
            </span>
          </div>

          <div className="map-canvas-shell map-canvas-interactive">
            {spatialTab === 'map' ? (
              <RouteMap
                routes={result.routes}
                selectedRouteId={selectedRoute.routeId}
                onSelectRoute={handleSelectRoute}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="map-status-overlay">
                    <div className="map-status-card">
                      <strong>Loading 3D globe...</strong>
                      <p>Preparing route arcs and hubs.</p>
                    </div>
                  </div>
                }
              >
                <RouteGlobe
                  route={convertedSelectedRoute}
                  planOptions={convertedRoutes}
                  recommendationId={result.recommendedRoute.routeId}
                  onSelectPlanOption={(route) => {
                    if (!route.id) return
                    handleSelectRoute(route.id)
                  }}
                />
              </Suspense>
            )}
          </div>
        </section>
      </section>

      <section className="summary-strip">
        <article className="summary-card">
          <span className="metric-label">Routes evaluated</span>
          <div className="metric-value">{result.budgetSummary.evaluatedRouteCount}</div>
          <p>Top candidates are ranked by feasibility (budget/time) and then by emissions.</p>
        </article>
        <article className="summary-card">
          <span className="metric-label">Feasible routes</span>
          <div className="metric-value">{result.budgetSummary.feasibleRouteCount}</div>
          <p>{result.insights.feasibilityLabel}</p>
        </article>
        <article className="summary-card">
          <span className="metric-label">WPI ports in model</span>
          <div className="metric-value">{formatCompactNumber(result.dataSummary.ports.commercialPortCount)}</div>
          <p>{result.dataSummary.ports.countriesCovered} countries covered by processed commercial ports.</p>
        </article>
        <article className="summary-card">
          <span className="metric-label">OECD latest period</span>
          <div className="metric-value">{OECD_MARITIME_SUMMARY.latestMonthlyPeriod}</div>
          <p>
            {formatCompactNumber(OECD_MARITIME_SUMMARY.observationCount)} maritime observations support the emissions context.
          </p>
        </article>
      </section>

      <section className="insight-grid">
        <article className="panel assumptions-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Data provenance</p>
              <h3>What data is used in this run</h3>
            </div>
          </div>
          <div className="confidence-stack">
            <article className="confidence-item">
              <strong>Ports (WPI)</strong>
              <p>{formatSourceSummary(liveResponse?.data_sources?.ports) ?? 'Using frontend processed WPI subset.'}</p>
            </article>
            <article className="confidence-item">
              <strong>Airports</strong>
              <p>{formatSourceSummary(liveResponse?.data_sources?.airports) ?? 'Curated fallback airport list active.'}</p>
            </article>
            <article className="confidence-item">
              <strong>Route scoring</strong>
              <p>
                Route totals include transport emissions, optional transit-time policy checks,
                and carbon-tax exposure for investment-style comparison.
              </p>
            </article>
          </div>
        </article>

        <article className="panel mission-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Hackathon edge</p>
              <h3>Judge-facing narrative points</h3>
            </div>
          </div>
          <div className="mission-points">
            <article>
              <h4>Green corridor credibility</h4>
              <p>
                The recommendation is end-to-end (factory, port choice, long-haul mode, destination),
                matching the track focus on coordinated multimodal decarbonization.
              </p>
            </article>
            <article>
              <h4>Transparent data lineage</h4>
              <p>
                Processed WPI and OECD sources are surfaced directly in the UI to make
                assumptions auditable during judging.
              </p>
            </article>
            <article>
              <h4>EO integration-ready path</h4>
              <p>
                The route contract already supports penalties/metadata layers, so Sentinel-5P NO2
                and VIIRS activity scores can plug in without changing planner UX.
              </p>
            </article>
          </div>
        </article>
      </section>

      <datalist id="location-options">
        {LOCATION_OPTIONS.map((label) => (
          <option key={label} value={label}></option>
        ))}
      </datalist>

      <RouteDetailPanel
        route={selectedRoute}
        budgetHeadroom={result.budgetSummary.budgetKg - selectedRoute.totalEmissionsKg}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  )
}

function convertRouteCandidateToEvaluation(route: RouteCandidate): RouteEvaluation {
  return {
    id: route.routeId,
    total_emissions_kg_co2e: route.totalEmissionsKg,
    total_duration_hours: route.totalDurationHours,
    carbon_tax_cost: route.carbonTaxCost,
    within_carbon_budget: route.budgetPass,
    within_time_policy: route.withinTimePolicy,
    legs: route.legs.map((leg) => ({
      mode: leg.mode,
      distance_km: leg.distanceKm,
      duration_hours: leg.durationHours,
      emissions_kg_co2e: leg.emissionsKg,
      notes: leg.notes,
      origin_hub_name: leg.fromLabel,
      dest_hub_name: leg.toLabel,
      geometry_geojson: {
        type: 'LineString',
        coordinates: leg.geometry.map(([lat, lng]) => [lng, lat]),
      },
    })),
  }
}

function RouteDetailPanel({
  route,
  budgetHeadroom,
  isOpen,
  onClose,
}: {
  route: RouteCandidate
  budgetHeadroom: number
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[1200] w-[430px] max-w-[92vw] transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="eyebrow">Route dashboard</p>
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {route.originPort.name} {'->'} {route.destinationPort.name}
            </h4>
            <p className="mt-1 text-xs text-slate-500">{route.explanation}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
          <div className="bg-white px-4 py-3 dark:bg-slate-950">
            <span className="metric-label">Total emissions</span>
            <strong>{formatNumber(route.totalEmissionsKg)} kg CO2e</strong>
          </div>
          <div className="bg-white px-4 py-3 dark:bg-slate-950">
            <span className="metric-label">Transit time</span>
            <strong>{formatHours(route.totalDurationHours)}</strong>
          </div>
          <div className="bg-white px-4 py-3 dark:bg-slate-950">
            <span className="metric-label">Carbon tax</span>
            <strong>{formatCurrency(route.carbonTaxCost)}</strong>
          </div>
          <div className="bg-white px-4 py-3 dark:bg-slate-950">
            <span className="metric-label">Budget headroom</span>
            <strong>{formatSigned(budgetHeadroom)} kg</strong>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {route.legs.map((leg) => (
            <article key={leg.id} className="route-leg-card">
              <div className="route-leg-card-header">
                <span className={`mode-pill ${leg.mode}`}>{formatLegMode(leg.mode)}</span>
                <span className="mini-badge">{leg.trafficLevel ?? 'Open water / air'}</span>
              </div>
              <strong>
                {leg.fromLabel} {'->'} {leg.toLabel}
              </strong>
              <p>{leg.strategy}</p>
              <div className="route-leg-metrics">
                <span>{formatNumber(leg.distanceKm)} km</span>
                <span>{formatHours(leg.durationHours)}</span>
                <span>{formatNumber(leg.emissionsKg)} kg CO2e</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  )
}

function formatSourceSummary(source: Record<string, string | number> | null | undefined) {
  if (!source) return null
  if (typeof source.status === 'string') return source.status

  const sourceName = typeof source.source === 'string' ? source.source : 'Unknown source'
  const count = typeof source.count === 'number' ? source.count : null
  const generatedAt = typeof source.generated_at === 'string' ? source.generated_at : null

  const parts = [sourceName]
  if (count != null) parts.push(`${formatNumber(count)} records`)
  if (generatedAt) parts.push(`generated ${new Date(generatedAt).toLocaleDateString()}`)
  return parts.join(' · ')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatSigned(value: number) {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}`
}

function formatHours(value: number) {
  return `${Math.round(value)} h`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatLegMode(mode: RouteCandidate['legs'][number]['mode']) {
  if (mode === 'truck') return 'Truck'
  if (mode === 'rail') return 'Rail'
  if (mode === 'air') return 'Air'
  return 'Ship'
}
