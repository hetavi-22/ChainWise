export function PlannerForm() {
  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      onSubmit={(e) => e.preventDefault()}
    >
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Plan inputs
      </h2>
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
          min={0}
          step={1}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Carbon budget (kg CO₂e)
        <input
          type="number"
          name="carbonBudget"
          min={0}
          step={1}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        Run planner (stub)
      </button>
    </form>
  )
}
