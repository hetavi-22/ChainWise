import { PlannerForm } from '../components/input/PlannerForm'
import { RouteMap } from '../components/map/RouteMap'

export function HomePage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
      <PlannerForm />
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Route map
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Leaflet basemap — wire GeoJSON legs and hubs from the backend next.
        </p>
        <div className="h-[min(420px,55vh)] min-h-[220px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <RouteMap />
        </div>
      </section>
    </div>
  )
}
