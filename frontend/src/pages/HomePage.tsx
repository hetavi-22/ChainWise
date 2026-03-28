import { lazy, startTransition, Suspense, useState, type FormEvent } from 'react'

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
  transit_days: string
  transit_hours: string
  transit_mins: string
  include_ship: boolean
  include_air: boolean
  include_truck: boolean
  include_rail: boolean
}

const DEFAULT_FORM_STATE: FormState = {
  origin_address: '',
  destination_address: '',
  cargo_weight_tonnes: '',
  carbon_budget_kg: '',
  carbon_tax_per_tonne_co2e: '',
  transit_days: '',
  transit_hours: '',
  transit_mins: '',
  include_ship: true,
  include_air: false,
  include_truck: true,
  include_rail: true,
}

function formStateToPayload(form: FormState): RoutePlanRequest {
  const totalHours =
    Number(form.transit_days || 0) * 24 +
    Number(form.transit_hours || 0) +
    Number(form.transit_mins || 0) / 60

  return {
    origin_address: form.origin_address.trim(),
    destination_address: form.destination_address.trim(),
    cargo_weight_tonnes: Number(form.cargo_weight_tonnes),
    carbon_budget_kg: Number(form.carbon_budget_kg),
    carbon_tax_per_tonne_co2e: Number(form.carbon_tax_per_tonne_co2e || 0),
    max_transit_time_hours: totalHours > 0 ? totalHours : null,
    include_hotspot_penalties: false,
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
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE)
  const [result, setResult] = useState<PlannerResult | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [plannerMode, setPlannerMode] = useState<'live' | 'demo'>('demo')
  const [plannerMessage, setPlannerMessage] = useState<string | null>('Run planning to see optimal routes.')

  const [isPlanning, setIsPlanning] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [spatialTab, setSpatialTab] = useState<'map' | 'globe'>('map')
  const [showNo2Overlay, setShowNo2Overlay] = useState(false)

  const [sidebarWidth, setSidebarWidth] = useState(480)
  const [detailWidth, setDetailWidth] = useState(430)

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      // Allow sidebar to be at most 45% of screen width OR 800px, whichever is smaller
      const maxWidth = Math.min(800, window.innerWidth * 0.45)
      setSidebarWidth(Math.max(360, Math.min(maxWidth, startWidth + (ev.clientX - startX))))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleDetailResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = detailWidth
    const onMove = (ev: MouseEvent) => {
      setDetailWidth(Math.max(380, Math.min(800, startWidth + (startX - ev.clientX))))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }


  const selectedRoute = result
    ? result.routes.find((route) => route.routeId === selectedRouteId) ??
      result.recommendedRoute
    : null


  const applyResult = (
    nextResult: PlannerResult,
    mode: 'live' | 'demo',
    message: string,
  ) => {
    startTransition(() => {
      setResult(nextResult)
      setSelectedRouteId(nextResult.recommendedRoute.routeId)
      setPlannerMode(mode)
      setPlannerMessage(message)

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
      )
    } catch (error) {
      const fallback = planRoute(payload)
      applyResult(
        fallback,
        'demo',
        error instanceof Error
          ? `Live API unavailable: ${error.message}. Start backend with: cd backend && uvicorn app.main:app --reload --port 8000`
          : 'Live API unavailable, showing deterministic demo routing. Start backend with: cd backend && uvicorn app.main:app --reload --port 8000',
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
        <aside className="panel planner-rail" style={{ width: sidebarWidth }}>
          <div className="sidebar-resize-handle" onMouseDown={handleSidebarResize}></div>
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
                <span>Carbon budget (kg CO₂e)</span>
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
                <span>Carbon tax (USD per tonne CO₂e)</span>
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
              <div className="form-grid-time">
                <span className="time-label">Transit Time Threshold (Days/Hrs/Mins)</span>
                <div className="time-inputs-container">
                  <div className="time-input-group">
                    <span className="unit-label">Days</span>
                    <input
                      type="number"
                      min="0"
                      value={formState.transit_days}
                      onChange={(e) => setFormState(c => ({ ...c, transit_days: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="time-input-group">
                    <span className="unit-label">Hours</span>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={formState.transit_hours}
                      onChange={(e) => setFormState(c => ({ ...c, transit_hours: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="time-input-group">
                    <span className="unit-label">Mins</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formState.transit_mins}
                      onChange={(e) => setFormState(c => ({ ...c, transit_mins: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
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
          {result && selectedRoute ? (
            <>
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
                      {formatNumber(route.totalEmissionsKg)} kg CO₂e · {formatHours(route.totalDurationHours)}
                    </small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-transparent pointer-events-none relative z-10">
              <div className="text-center p-8 rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-md shadow-2xl pointer-events-auto">
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                    <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.418a2 2 0 011.106-1.789L9 2m0 18l6-3m-6 3V2m6 15V1.724a2 2 0 011.106 1.789L21 6.418v8.964a2 2 0 01-1.106 1.789L15 20m-6-3l6 3" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">ChainWise Connectivity Map</h3>
                <p className="text-slate-400 max-w-sm mx-auto mb-8">
                  Enter your freight requirements in the sidebar to generate and visualize carbon-optimized multimodal corridors.
                </p>
                <div className="flex gap-4 justify-center">
                   <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-white/5 text-[11px] font-medium text-slate-400 uppercase tracking-widest">WPI Global Ports</div>
                   <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-white/5 text-[11px] font-medium text-slate-400 uppercase tracking-widest">OECD Factors</div>
                </div>
              </div>
            </div>
          )}

          {result && selectedRoute && (
            <div className="map-mode-legend">
              <span className="legend-chip">
                <i className="legend-swatch legend-truck"></i>Truck
              </span>
              <span className="legend-chip">
                <i className="legend-swatch legend-rail"></i>Rail
              </span>
              <span className="legend-chip">
                <i className="legend-swatch legend-ship"></i>Ship
              </span>
              <span className="legend-chip">
                <i className="legend-swatch legend-air"></i>Air
              </span>
              <span className="legend-chip">
                <i className="legend-choke"></i>Maritime Hub
              </span>
              {plannerMode === 'live' && (
                <label className="toggle-pill">
                  <input
                    type="checkbox"
                    checked={showNo2Overlay}
                    onChange={(e) => setShowNo2Overlay(e.target.checked)}
                  />
                  <span>Hotspot Proxy Overlay</span>
                </label>
              )}
            </div>
          )}

          <div className="map-canvas-shell map-canvas-interactive">
            {spatialTab === 'map' ? (
              <RouteMap
                routes={result?.routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={handleSelectRoute}
                showNo2Overlay={showNo2Overlay}
              />
            ) : (
              result && selectedRoute && (
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
                    route={convertRouteCandidateToEvaluation(selectedRoute)}
                    planOptions={result.routes.map(convertRouteCandidateToEvaluation)}
                    recommendationId={result.recommendedRoute.routeId}
                    onSelectPlanOption={(route) => {
                      if (!route.id) return
                      handleSelectRoute(route.id)
                    }}
                  />
                </Suspense>
              )
            )}
          </div>
        </section>
      </section>

      {result && (
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
      )}



      <datalist id="location-options">
        {LOCATION_OPTIONS.map((label) => (
          <option key={label} value={label}></option>
        ))}
      </datalist>

      {result && selectedRoute && (
        <RouteDetailPanel
          route={selectedRoute}
          budgetHeadroom={result.budgetSummary.budgetKg - selectedRoute.totalEmissionsKg}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          width={detailWidth}
          onResize={handleDetailResize}
        />
      )}
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
  width,
  onResize,
}: {
  route: RouteCandidate
  budgetHeadroom: number
  isOpen: boolean
  onClose: () => void
  width: number
  onResize: (e: React.MouseEvent) => void
}) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[1200] transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width, transitionDuration: '300ms' }}
      aria-hidden={!isOpen}
    >
      <div className="resize-handle-left" onMouseDown={onResize}></div>
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
            <strong>{formatNumber(route.totalEmissionsKg)} kg CO₂e</strong>
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

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {route.legs.map((leg, i, arr) => {
            // Simulated granular breakdown for audit-level dashboard
            const isFirstOfMode = i === 0 || arr[i - 1].mode !== leg.mode;
            const isLastOfMode = i === arr.length - 1 || arr[i + 1].mode !== leg.mode;
            
            let loadingTime = 0;
            if (isFirstOfMode || isLastOfMode) {
              loadingTime = leg.mode === 'ship' ? 12 : leg.mode === 'air' ? 3 : leg.mode === 'rail' ? 4 : 1;
            }
            // Add slight handling delays for canal crossings specifically
            if (leg.mode === 'ship' && leg.notes?.includes('Canal')) {
                loadingTime += 8;
            }

            const congestionHours = ['ship', 'truck'].includes(leg.mode) ? Math.max(1, leg.durationHours * 0.05) : 0;
            const pureTransit = Math.max(0, leg.durationHours - congestionHours);
            // Derive tax rate from total to keep consistent per-leg estimates
            const impliedTaxRate = route.totalEmissionsKg > 0 ? (route.carbonTaxCost / (route.totalEmissionsKg / 1000)) : 0;
            const taxCost = (leg.emissionsKg / 1000) * impliedTaxRate;

            return (
              <article key={leg.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      leg.mode === 'ship' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      leg.mode === 'air' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' :
                      leg.mode === 'rail' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {formatLegMode(leg.mode)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">{leg.trafficLevel ?? (leg.mode === 'ship' ? 'Deep Sea / Coastal' : 'Network clear')}</span>
                  </div>
                  <span className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-300">{formatNumber(leg.distanceKm * 0.621371)} mi</span>
                </div>
                
                <div className="mb-1 text-[14px] font-bold leading-tight text-slate-900 dark:text-slate-100">
                  {leg.fromLabel} <span className="mx-1 text-slate-400">→</span> {leg.toLabel}
                </div>
                <p className="mb-4 text-xs font-medium text-slate-500">{leg.strategy}</p>

                {/* Audit-level Logistics Breakdown */}
                <div className="rounded-lg bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-900/5 dark:bg-slate-950 dark:ring-white/5">
                  <h5 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Segment Ledger (Est.)</h5>
                  <div className="space-y-2 text-[12px] text-slate-600 dark:text-slate-400">
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                        Terminal Handling (Load/Unload)
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatHours(loadingTime)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                        Pure Linehaul Transit
                      </span>
                      <span>{formatHours(pureTransit)}</span>
                    </div>

                    {congestionHours > 0 && (
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                          Congestion / Idle Penalty
                        </span>
                        <span className="font-semibold">+{formatHours(congestionHours)}</span>
                      </div>
                    )}

                    <div className="my-2.5 border-t border-slate-200 dark:border-slate-800"></div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500"></div>
                        Scope 3 CO₂e Emissions
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(leg.emissionsKg)} kg</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                        Leg Carbon Tax Liability
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(taxCost)}</span>
                    </div>

                  </div>
                </div>
              </article>
            );
          })}

          {route.hotspotPenaltyKg > 1 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Environmental Hotspot Penalty</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">+{formatNumber(route.hotspotPenaltyKg)} kg</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-600/80 leading-snug">Authoritative intermodal adjustment for corridor-wide congestion, regional high-intensity grids, and transshipment indirects.</p>
            </div>
          )}
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
  const totalMinutes = Math.round(value * 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)
  
  return parts.join(' ')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value) + ' USD'
}

function formatLegMode(mode: RouteCandidate['legs'][number]['mode']) {
  if (mode === 'truck') return 'Truck'
  if (mode === 'rail') return 'Rail'
  if (mode === 'air') return 'Air'
  return 'Ship'
}
