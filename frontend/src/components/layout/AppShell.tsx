import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900 z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">CW</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">ChainWise</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Carbon-aware logistics</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
            Multimodal routes · Emissions intelligence · Budget corridors
          </p>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
