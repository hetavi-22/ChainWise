import { useState } from 'react'
import {
  DEMO_TRUCK_SHIP_TRUCK_LEGS,
  evaluateRoute,
  type RouteEvaluation,
} from '../../lib/api'

function numOrUndef(raw: string): number | undefined {
  const t = raw.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function PlannerForm() {
  const [result, setResult] = useState<RouteEvaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setResult(null)
        const fd = new FormData(e.currentTarget)
        const weightKg = numOrUndef(String(fd.get('weightKg') ?? ''))
        if (weightKg === undefined || weightKg <= 0) {
          setError('Cargo weight (kg) must be a positive number.')
          return
        }
        const carbonBudget = numOrUndef(String(fd.get('carbonBudget') ?? ''))
        const maxHours = numOrUndef(String(fd.get('maxTransitHours') ?? ''))
        const tax = numOrUndef(String(fd.get('carbonTax') ?? '')) ?? 0

        const constraints: {
          carbon_budget_kg_co2e?: number
          max_transit_time_hours?: number
        } = {}
        if (carbonBudget !== undefined) constraints.carbon_budget_kg_co2e = carbonBudget
        if (maxHours !== undefined) constraints.max_transit_time_hours = maxHours

        setLoading(true)
        try {
          const ev = await evaluateRoute({
            weight_kg: weightKg,
            origin_label: String(fd.get('origin') ?? ''),
            destination_label: String(fd.get('destination') ?? ''),
            legs: DEMO_TRUCK_SHIP_TRUCK_LEGS,
            constraints:
              Object.keys(constraints).length > 0 ? constraints : undefined,
            economics: { carbon_tax_per_tonne_co2e: tax },
          })
          setResult(ev)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Request failed')
        } finally {
          setLoading(false)
        }
      }}
    >
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Plan inputs
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Demo route: truck → ship → truck (fixed distances) until full routing is
        wired. Carbon tax applies to total tonnes CO₂e at your entered rate.
      </p>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Origin (factory address)
        <input
          type="text"
          name="origin"
          placeholder="City, region"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Destination (factory address)
        <input
          type="text"
          name="destination"
          placeholder="City, region"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Cargo weight (kg)
        <input
          type="number"
          name="weightKg"
          min={1}
          step={1}
          defaultValue={10000}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Carbon budget (kg CO₂e, optional)
        <input
          type="number"
          name="carbonBudget"
          min={0}
          step={1}
          placeholder="No cap if empty"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Carbon tax (per tonne CO₂e, same currency across the UI)
        <input
          type="number"
          name="carbonTax"
          min={0}
          step={0.01}
          defaultValue={85}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Max transit time (hours, optional)
        <input
          type="number"
          name="maxTransitHours"
          min={0}
          step={0.5}
          placeholder="No time cap if empty"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Evaluating…' : 'Evaluate demo route'}
      </button>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {result ? <ResultsSummary result={result} /> : null}
    </form>
  )
}

function ResultsSummary({ result }: { result: RouteEvaluation }) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="font-medium text-emerald-900 dark:text-emerald-100">
        Results (demo legs)
      </p>
      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
        <li>
          Total emissions:{' '}
          <span className="font-mono">
            {result.total_emissions_kg_co2e.toFixed(1)} kg CO₂e
          </span>
        </li>
        <li>
          Door-to-door time:{' '}
          <span className="font-mono">
            {result.total_duration_hours.toFixed(1)} h
          </span>{' '}
          (ORS durations will replace defaults for road legs when integrated)
        </li>
        <li>
          Carbon tax cost:{' '}
          <span className="font-mono">
            {result.carbon_tax_cost.toFixed(2)}
          </span>
        </li>
        {result.within_carbon_budget != null ? (
          <li>
            Within carbon budget:{' '}
            {result.within_carbon_budget ? 'yes' : 'no'}
          </li>
        ) : null}
        {result.within_time_policy != null ? (
          <li>
            Within max transit time:{' '}
            {result.within_time_policy ? 'yes' : 'no'}
          </li>
        ) : null}
      </ul>
    </div>
  )
}
