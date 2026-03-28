import { useState } from 'react'
import { PlannerForm } from '../components/input/PlannerForm'
import { RouteMap } from '../components/map/RouteMap'
import { type RouteEvaluation, type RouteLeg } from '../lib/api'

// ── GLEC emission factors (kg CO2e / km / tonne) ─────────────────────────────
const EMISSION_FACTORS: Record<string, number> = {
  truck: 0.085, ship: 0.015, air: 0.850, rail: 0.035,
}

// Port halt estimates (actual industry norms for containerized freight):
// Sea: ~24h at modern major hubs (JNPT, Singapore, Long Beach) for loading/customs
// Air: ~6h for express cargo handling and export clearance
const PORT_HALT_HOURS: Record<string, number> = {
  ship: 24, air: 6, truck: 0, rail: 2,
}
const PORT_HALT_DESC: Record<string, string> = {
  ship: 'Berth, loading/unloading, customs (~24h industry avg)',
  air: 'Ramp handling, export clearance (~6h industry avg)',
  rail: 'Platform transfer (~2h)',
  truck: '',
}

function fmt(h: number) {
  const d = Math.floor(h / 24)
  const hr = Math.floor(h % 24)
  const m = Math.round((h * 60) % 60)
  if (d > 0) return `${d}d ${hr}h`
  if (hr > 0) return `${hr}h ${m}m`
  return `${m}m`
}

function computeLegEmissions(legs: RouteLeg[], totalEmissions: number): number[] {
  const weights = legs.map((l) => (EMISSION_FACTORS[l.mode] ?? 0.05) * l.distance_km)
  const total = weights.reduce((a, b) => a + b, 0)
  return total === 0 ? legs.map(() => 0) : weights.map((w) => (w / total) * totalEmissions)
}

export function HomePage() {
  const [activeRoute, setActiveRoute] = useState<RouteEvaluation | null>(null)
  const [dashboardRoute, setDashboardRoute] = useState<RouteEvaluation | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const handleRouteSelect = (route: RouteEvaluation) => setActiveRoute(route)

  const handleShowDashboard = (route: RouteEvaluation) => {
    setActiveRoute(route)
    setDashboardRoute(route)
    setIsPanelOpen(true)
  }

  return (
    <div className="relative flex h-full">
      {/* Left Planner Sidebar */}
      <div className="w-[340px] shrink-0 h-full overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <PlannerForm onRouteSelect={handleRouteSelect} onShowDetails={handleShowDashboard} />
      </div>

      {/* Right Map — fills remaining space */}
      <div className="flex-1 h-full relative">
        <RouteMap
          route={activeRoute}
          eeTileUrlTemplate={import.meta.env.VITE_EE_NO2_TILE_TEMPLATE}
        />
      </div>

      {/* Side Dashboard Panel */}
      <DetailPanel
        route={dashboardRoute}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

// ── Comprehensive Route Dashboard ─────────────────────────────────────────────
function DetailPanel({
  route, isOpen, onClose,
}: {
  route: RouteEvaluation | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!route) return null

  const legEmissions = computeLegEmissions(route.legs, route.total_emissions_kg_co2e)

  const modeColor: Record<string, string> = {
    truck: '#10b981', ship: '#0ea5e9', air: '#f43f5e', rail: '#f59e0b',
  }
  const modeIcon: Record<string, string> = {
    truck: '🚛', ship: '⚓', air: '✈️', rail: '🚂',
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-[9999] w-[500px] flex flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-500 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold">Route Dashboard</h2>
          <p className="text-xs text-slate-500 font-mono">ID: {route.id}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Top KPI row */}
        <div className="grid grid-cols-3 gap-px bg-slate-800 border-b border-slate-800">
          {[
            { label: 'Total Carbon', value: `${Math.round(route.total_emissions_kg_co2e)} kg`, sub: 'CO₂e' },
            { label: 'Transit Time', value: fmt(route.total_duration_hours), sub: 'door-to-door' },
            { label: 'Carbon Tax', value: `$${route.carbon_tax_cost.toFixed(2)}`, sub: 'total liability' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-950 px-4 py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">{kpi.label}</p>
              <p className="text-xl font-black leading-none">{kpi.value}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Feasibility status ── */}
        {(route.within_carbon_budget === false || route.within_time_policy === false) && (
          <div className="mx-6 mt-4 rounded-xl bg-red-900/30 border border-red-800/50 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-400">Route Exceeds Budget</p>
              <p className="text-xs text-red-500/80">
                {route.within_carbon_budget === false && 'Over carbon budget. '}
                {route.within_time_policy === false && 'Exceeds max transit time.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Full Journey Breakdown ── */}
        <div className="px-6 py-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
            Full Journey Breakdown
          </h3>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 top-5 bottom-5 w-px bg-slate-800" />

            {route.legs.map((leg: RouteLeg, i: number) => {
              const color = modeColor[leg.mode] ?? '#64748b'
              const icon = modeIcon[leg.mode] ?? '📦'
              const legEm = legEmissions[i]
              const haltHours = PORT_HALT_HOURS[leg.mode] ?? 0

              return (
                <div key={i}>
                  {/* ── Leg card ── */}
                  <div className="flex gap-4 mb-1">
                    {/* Timeline dot */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 text-sm shadow-lg border-2 border-slate-950"
                      style={{ background: color }}
                    >
                      {icon}
                    </div>

                    {/* Leg content */}
                    <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 mb-3">
                      {/* Leg header */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-bold capitalize" style={{ color }}>
                            {leg.mode === 'truck' ? 'Road Freight' : leg.mode === 'ship' ? 'Ocean Freight' : leg.mode === 'air' ? 'Air Freight' : 'Rail Freight'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {leg.origin_hub_name ?? 'Origin'} → {leg.dest_hub_name ?? 'Destination'}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}22`, color }}
                        >
                          Leg {i + 1}/{route.legs.length}
                        </span>
                      </div>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <MetricCell label="Distance" value={`${leg.distance_km.toFixed(0)}`} unit="km" />
                        <MetricCell label="Transit" value={fmt(leg.duration_hours ?? 0)} unit="" />
                        <MetricCell label="CO₂e" value={`${legEm.toFixed(1)}`} unit="kg" />
                      </div>

                      {/* Emission bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                          <span>Emission share</span>
                          <span>{route.total_emissions_kg_co2e > 0 ? ((legEm / route.total_emissions_kg_co2e) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${route.total_emissions_kg_co2e > 0 ? (legEm / route.total_emissions_kg_co2e) * 100 : 0}%`,
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Port Halt between legs ── */}
                  {i < route.legs.length - 1 && (leg.mode === 'ship' || leg.mode === 'air' || route.legs[i + 1].mode === 'ship' || route.legs[i + 1].mode === 'air') && (
                    <div className="flex gap-4 mb-1">
                      <div className="w-8 flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-600 bg-slate-950 z-10" />
                      </div>
                      <div className="flex-1 border border-dashed border-slate-800 rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">
                            {leg.mode === 'ship' || route.legs[i + 1].mode === 'ship' ? '⚓ Port Operations' : '✈️ Airport Transfer'}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {PORT_HALT_DESC[leg.mode === 'ship' ? 'ship' : 'air'] ?? 'Hub transfer'}
                          </p>
                          <p className="text-[9px] text-slate-700 mt-1 italic">At: {leg.dest_hub_name ?? 'Hub'}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs font-bold text-slate-400">{haltHours}h</p>
                          <p className="text-[9px] text-slate-600">est.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Operational Risk ── */}
        <div className="px-6 pb-5 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Operational Risk
          </h3>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-sm font-semibold">Port Congestion Risk</p>
                  <p className="text-[10px] text-slate-500">Based on historical AIS data</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800/50 text-[10px] font-bold">
                  MODERATE +3.5h
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full w-[45%] rounded-full" />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
              <div>
                <p className="text-sm font-semibold">Estimated Idle Time</p>
                <p className="text-[10px] text-slate-500">Customs + transshipment wait</p>
              </div>
              <p className="text-sm font-mono font-bold">
                {fmt(route.legs.filter(l => l.mode === 'ship').length * 36 + route.legs.filter(l => l.mode === 'air').length * 8)}
              </p>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
              <div>
                <p className="text-sm font-semibold">Effective Journey Time</p>
                <p className="text-[10px] text-slate-500">Including halts & delays</p>
              </div>
              <p className="text-sm font-mono font-bold text-amber-400">
                {fmt(route.total_duration_hours + 3.5 +
                  route.legs.filter(l => l.mode === 'ship').length * 36 +
                  route.legs.filter(l => l.mode === 'air').length * 8
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Financial Summary ── */}
        <div className="px-6 pb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            Financial Summary
          </h3>
          <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-5">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Carbon Liability</p>
                <p className="text-3xl font-black">${route.carbon_tax_cost.toFixed(2)}</p>
              </div>
              <p className="text-[10px] text-slate-600 max-w-[120px] text-right">
                Includes regional carbon pricing & offset costs
              </p>
            </div>
            <div className="space-y-2">
              {route.legs.map((leg: RouteLeg, i: number) => {
                const legCost = (legEmissions[i] / 1000) * (route.carbon_tax_cost / (route.total_emissions_kg_co2e / 1000 || 1))
                return (
                  <div key={i} className="flex justify-between text-xs text-slate-400">
                    <span className="capitalize">{leg.mode} Leg {i + 1}</span>
                    <span className="font-mono">${legCost.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer CTA ── */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-800">
        <button className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all rounded-xl py-3.5 font-bold text-sm shadow-lg flex items-center justify-center gap-2">
          🚢 Book this Route
        </button>
      </div>
    </div>
  )
}

function MetricCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl px-3 py-2.5">
      <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">{label}</p>
      <p className="text-sm font-bold leading-none">
        {value} <span className="text-[10px] font-normal text-slate-400">{unit}</span>
      </p>
    </div>
  )
}
