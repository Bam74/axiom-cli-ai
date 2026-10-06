import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { GUIDES, NAV_ITEMS, moduleForPath, type GuideModule } from '../demo/guides.ts'
import { useDemo } from '../state/demo.tsx'
import { useData } from '../state/data.tsx'

const SYNTHETIC_TOOLTIP = 'All information in this environment is synthetic and created for the Axiom AI at Work demonstration. It is not actual Cebu Landmasters data.'

function Mark({ className = '' }: { className?: string }) {
  return (
    <span className={`grid h-10 w-10 place-items-center rounded-xl bg-axiom text-lg font-semibold text-white ${className}`}>A</span>
  )
}

export function AppShell() {
  const data = useData()
  const location = useLocation()
  const module = moduleForPath(location.pathname)
  const demo = useDemo()
  return (
    <div className="flex h-screen flex-col bg-lavender text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <p className="text-xl font-semibold leading-tight">CLI AI Workbench</p>
            <p className="text-sm text-muted">AI-assisted intelligence across the property development lifecycle</p>
          </div>
        </div>
        <div className="group relative">
          <span className="inline-flex rounded-full bg-gold px-3 py-1.5 text-xs font-bold tracking-wide text-deep" tabIndex={0}>SYNTHETIC DEMO</span>
          <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-72 rounded-xl bg-deep p-3 text-sm leading-5 text-white shadow-lg group-hover:block group-focus-within:block">
            {SYNTHETIC_TOOLTIP}
          </span>
        </div>
      </header>
      {import.meta.env.DEV && data.diagnostics.length > 0 && (
        <div className="bg-bad-soft px-6 py-2 text-sm text-bad">
          Data check: {data.diagnostics.join(' · ')}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-deep p-4 text-white lg:flex">
          <div className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `rounded-xl px-3 py-3 text-sm font-semibold leading-5 ${isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <NavLink to="/sources" className={({ isActive }) => `mt-4 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? 'bg-white/15' : 'text-white/75 hover:bg-white/10'}`}>
            Data & Sources
          </NavLink>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-2 overflow-x-auto border-b border-line bg-white px-3 py-2 lg:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${isActive ? 'bg-axiom text-white' : 'bg-mist text-ink'}`}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/sources" className={({ isActive }) => `shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${isActive ? 'bg-axiom text-white' : 'bg-mist text-ink'}`}>Data & Sources</NavLink>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl p-5 md:p-8">
              <Outlet />
            </div>
          </main>
        </div>
        <DemoGuide module={module} open={demo.state.guideOpen} />
      </div>
    </div>
  )
}

function DemoGuide({ module, open }: { module: GuideModule; open: boolean }) {
  const demo = useDemo()
  const navigate = useNavigate()
  const script = GUIDES[module]
  const index = Math.min(demo.state.stepIndex[module], script.steps.length - 1)
  const step = script.steps[index]
  const numbered = script.steps.length > 1

  if (!open) {
    return (
      <button type="button" className="fixed right-0 top-1/3 z-30 rounded-l-xl bg-deep px-3 py-4 text-sm font-semibold text-white shadow-lg" onClick={() => demo.setGuideOpen(true)}>
        Guide ›
      </button>
    )
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[320px] flex-col border-l border-line bg-white shadow-xl lg:static lg:z-0 lg:shrink-0 lg:shadow-none">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-bold uppercase tracking-wide text-axiom">Demo Guide</p>
        <button type="button" className="text-sm font-semibold text-muted" onClick={() => demo.setGuideOpen(false)}>Hide Guide</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <h2 className="text-xl font-semibold">{script.title}</h2>
        {numbered && <p className="mt-2 text-sm font-semibold text-muted">{index + 1} / {script.steps.length}</p>}
        <div className="mt-4 rounded-2xl bg-lavender p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">What to click</p>
          <p className="mt-1 text-base font-semibold leading-6">{step.click}</p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">What to notice</p>
          <p className="mt-1 text-base leading-6">{step.notice}</p>
        </div>
        {step.complete && <p className="mt-4 rounded-xl bg-good-soft px-3 py-2 text-sm font-semibold text-good">{step.complete}</p>}
        {numbered && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-axiom px-3 py-2 text-sm font-semibold text-white" onClick={() => demo.markDone(module, index)}>Mark Done</button>
            <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={index === 0} onClick={() => demo.setStep(module, index - 1)}>Previous</button>
            <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={index >= script.steps.length - 1} onClick={() => { demo.markDone(module, index); demo.setStep(module, index + 1) }}>Next</button>
          </div>
        )}
        {step.next && (
          <button type="button" className="mt-4 w-full rounded-xl bg-deep px-3 py-3 text-left text-sm font-semibold text-white" onClick={() => navigate(step.next!.to)}>
            Next Module · {step.next.label} →
          </button>
        )}
      </div>
      <div className="border-t border-line p-4">
        <button type="button" className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold" onClick={() => { demo.reset(); navigate('/') }}>Reset Demo</button>
      </div>
    </aside>
  )
}
