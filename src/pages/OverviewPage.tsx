import { useNavigate } from 'react-router-dom'
import { formatNumber, formatPct } from '../format.ts'
import { attentionCount, deliverySignal, emergingSalesSignal, waterPattern } from '../data/metrics.ts'
import { useDemo } from '../state/demo.tsx'
import { useData } from '../state/data.tsx'
import { StatusPill } from '../components/ui.tsx'

export function OverviewPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const delivery = deliverySignal(data)
  const sales = emergingSalesSignal(data)
  const water = waterPattern(data)
  const cards = [
    { value: formatNumber(data.projects.length), label: 'Active Projects' },
    { value: formatNumber(data.leads.length), label: 'Active Leads' },
    { value: formatNumber(data.cases.length), label: 'Customer Cases' },
    { value: formatNumber(attentionCount(data)), label: 'Items Requiring Attention' },
  ]

  function startDemo() {
    demo.reset()
    demo.setGuideOpen(true)
    navigate('/projects')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-axiom">Enterprise Overview</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">Today's operating picture</h1>
        </div>
        <button type="button" className="rounded-xl bg-gold px-5 py-3 text-base font-semibold text-deep" onClick={startDemo}>Start Guided Demo</button>
      </div>
      <ol className="mb-6 flex flex-wrap gap-2 text-sm font-semibold text-muted">
        {['Information', 'Insight', 'Action', 'Management Intelligence'].map((item, index) => (
          <li key={item} className="rounded-full bg-white px-3 py-1.5">{index + 1}. {item}</li>
        ))}
      </ol>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-4xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-2 text-base text-muted">{card.label}</p>
          </article>
        ))}
      </section>
      <p className="mt-2 text-sm text-muted">Items requiring attention are open High and Critical project issues.</p>
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Today's Enterprise Signals</h2>
      <section className="grid gap-4 lg:grid-cols-3">
        {delivery && (
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Project Delivery</p>
            <h3 className="mt-2 text-xl font-semibold">{delivery.project.Project_Name}</h3>
            <div className="mt-3"><StatusPill value={delivery.project.Overall_Status} /></div>
            <p className="mt-4 text-lg">Progress: <strong>{formatPct(delivery.project.Actual_Progress_Pct)} vs {formatPct(delivery.project.Planned_Progress_Pct)} planned</strong></p>
            <p className="mt-2 font-medium">Schedule pressure is increasing</p>
            <button type="button" className="mt-5 font-semibold text-axiom" onClick={() => navigate('/projects')}>Investigate Project</button>
          </article>
        )}
        {sales?.previous && sales.current && (
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Sales</p>
            <h3 className="mt-2 text-xl font-semibold">{sales.projectName}</h3>
            <p className="mt-4 font-medium">Inquiry growth is not translating into conversion</p>
            <button type="button" className="mt-5 font-semibold text-axiom" onClick={() => navigate('/sales')}>Investigate Sales</button>
          </article>
        )}
        <article className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">Customer Experience</p>
          <h3 className="mt-2 text-xl font-semibold">{water.focusName}</h3>
          <p className="mt-4 font-medium">Water-related complaints show an unusual concentration</p>
          <button type="button" className="mt-5 font-semibold text-axiom" onClick={() => navigate('/customer')}>Investigate Customer Pattern</button>
        </article>
      </section>
    </div>
  )
}
