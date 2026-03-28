import { useState } from 'react'
import {
  planMultimodal,
  type RouteEvaluation,
  type MultimodalPlanResponse,
  type TransportMode,
} from '../../lib/api'

function numOrUndef(raw: string): number | undefined {
  const t = raw.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const d = Math.floor(totalMinutes / (24 * 60))
  const h = Math.floor((totalMinutes % (24 * 60)) / 60)
  const m = totalMinutes % 60

  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

export function PlannerForm({
  onRouteSelect,
  onShowDetails,
}: {
  onRouteSelect?: (route: RouteEvaluation) => void
  onShowDetails?: (route: RouteEvaluation) => void
}) {
  const [result, setResult] = useState<MultimodalPlanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedModes, setSelectedModes] = useState<TransportMode[]>([
    'ship',
  ])
  const [activeRoute, setActiveRoute] = useState<RouteEvaluation | null>(null)

  const toggleMode = (m: TransportMode) => {
    setSelectedModes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    )
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setResult(null)
        const fd = new FormData(e.currentTarget)
        const originAddr = String(fd.get('origin') ?? '').trim()
        const destAddr = String(fd.get('destination') ?? '').trim()

        if (!originAddr || !destAddr) {
          setError('Origin and destination addresses are required.')
          return
        }

        const tonnesRaw = fd.get('weightTonnes')
        const tonnes = tonnesRaw ? Number(tonnesRaw) : 10
        if (tonnes <= 0) {
          setError('Weight must be positive.')
          return
        }

        const taxRaw = fd.get('carbonTax')
        const tax = taxRaw ? Number(taxRaw) : 85
        
        const carbonBudget = numOrUndef(String(fd.get('carbonBudget') ?? ''))
        const maxHours = numOrUndef(String(fd.get('maxTransitHours') ?? ''))

        const constraints: {
          carbon_budget_kg_co2e?: number
          max_transit_time_hours?: number
        } = {}
        if (carbonBudget !== undefined)
          constraints.carbon_budget_kg_co2e = carbonBudget
        if (maxHours !== undefined) constraints.max_transit_time_hours = maxHours

        setLoading(true)
        try {
          const res = await planMultimodal({
            origin_address: originAddr,
            destination_address: destAddr,
            weight_kg: tonnes * 1000,
            longhaul_modes: selectedModes,
            constraints:
              Object.keys(constraints).length > 0 ? constraints : undefined,
            economics: { carbon_tax_per_tonne_co2e: tax },
          })
          setResult(res)

          if (res.options.length > 0 && onRouteSelect) {
            const rec =
              res.options.find((o) => o.id === res.recommendation_id) ||
              res.options[0]
            onRouteSelect(rec)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Planning failed')
        } finally {
          setLoading(false)
        }
      }}
    >
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        ChainWise Planner
      </h2>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Origin Address
          <input
            type="text"
            name="origin"
            required
            placeholder="e.g. Factory, Shanghai"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-400 text-sm"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Destination Address
          <input
            type="text"
            name="destination"
            required
            placeholder="e.g. Warehouse, London"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-400 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Cargo (tonnes)
          <input
            type="number"
            name="weightTonnes"
            min={0.01}
            step={0.01}
            defaultValue={10}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Carbon Tax/t
          <input
            type="number"
            name="carbonTax"
            min={0}
            step={1}
            defaultValue={85}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Carbon Budget (kg)
          <input
            type="number"
            name="carbonBudget"
            placeholder="e.g. 500"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Max Transit (h)
          <input
            type="number"
            name="maxTransitHours"
            placeholder="e.g. 120"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 text-sm"
          />
        </label>
      </div>

      <div className="space-y-1.5 pt-1">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Long-haul modes
        </span>
        <div className="flex flex-wrap gap-2">
          {(['ship', 'air'] as TransportMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedModes.includes(m)
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md active:scale-95"
      >
        {loading ? 'Analyzing Routes…' : 'Plan Supply Chain'}
      </button>

      {error && (
        <p className="text-xs text-red-500 font-medium px-1 bg-red-50/50 py-1 rounded border border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
          ⚠ {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {result.options.map((opt) => (
            <ResultsSummary
              key={opt.id}
              result={opt}
              isRecommended={opt.id === result.recommendation_id}
              isActive={opt.id === activeRoute?.id}
              onSelect={() => { onRouteSelect?.(opt); setActiveRoute(opt) }}
              onShowDetails={() => { onRouteSelect?.(opt); setActiveRoute(opt); onShowDetails?.(opt) }}
            />
          ))}
        </div>
      )}
    </form>
  )
}

function ResultsSummary({
  result,
  isRecommended,
  isActive,
  onSelect,
  onShowDetails,
}: {
  result: RouteEvaluation
  isRecommended?: boolean
  isActive?: boolean
  onSelect: () => void
  onShowDetails: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border p-3.5 text-sm transition-all overflow-hidden cursor-pointer ${
        isActive
          ? 'border-emerald-500 ring-2 ring-emerald-400/50 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/30 shadow-md'
          : isRecommended
          ? 'border-emerald-400/60 bg-emerald-50/20 dark:border-emerald-800 dark:bg-emerald-950/10 shadow-sm'
          : 'border-slate-200 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-900/30 hover:border-slate-300'
      }`}
    >
      {isRecommended && (
        <span className="absolute -right-6 top-2 rotate-45 bg-emerald-600 px-8 py-0.5 text-[8px] font-bold text-white shadow-sm">
          OPTIMIZED
        </span>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {result.id}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowDetails() }}
            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 underline underline-offset-2"
          >
            SHOW DASHBOARD
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Carbon Footprint</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
              {Math.round(result.total_emissions_kg_co2e).toLocaleString()} <span className="text-xs font-normal opacity-70">kg</span>
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Transit Time</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
              {formatDuration(result.total_duration_hours)}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 pt-1">
          <p className="text-[10px] font-medium text-slate-500 uppercase">Carbon Tax Liability:</p>
          <p className="font-bold text-emerald-700 dark:text-emerald-400">
            ${result.carbon_tax_cost.toFixed(2)}
          </p>
        </div>

        {(result.within_carbon_budget === false || result.within_time_policy === false) && (
          <div className="mt-2 rounded-md bg-red-50 dark:bg-red-950/20 p-2 text-[10px] font-bold uppercase text-red-500 border border-red-100 dark:border-red-900/50">
            ⚠️ Infeasible (Exceeds {result.within_carbon_budget === false ? 'Budget' : 'Time'})
          </div>
        )}
      </div>
    </div>
  )
}
