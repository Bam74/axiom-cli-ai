import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, formatShortDate } from '../format.ts'
import { CURRENT_WINDOW, PREVIOUS_WINDOW, casesForTheme, subcategoryCounts, themeStats, waterPattern } from '../data/metrics.ts'
import { buildOperationsBrief } from '../services/ai.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import { AnalysisButton, HowGenerated, OutputFrame, PageIntro, PrimaryButton, SourceList } from '../components/ui.tsx'

const arrow: Record<string, string> = { up: '↑', down: '↓', flat: '→' }

export function CustomerPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const themes = themeStats(data)
  return (
    <div>
      <PageIntro title="Customer Experience Intelligence" subtitle="Cases grouped from the customer case file." />
      <p className="text-5xl font-semibold tracking-tight">{formatNumber(data.cases.length)}</p>
      <p className="text-lg text-muted">Customer Cases</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => (
          <button key={theme.theme} type="button" className="rounded-2xl bg-white p-5 text-left shadow-sm" onClick={() => { demo.selectTheme(theme.theme); navigate(`/customer/theme/${encodeURIComponent(theme.theme)}`) }}>
            <p className="text-4xl font-semibold">{theme.total}</p>
            <h2 className="mt-1 text-lg font-semibold">{theme.theme}</h2>
            <p className="mt-2 text-2xl" aria-label={theme.direction}>{arrow[theme.direction]}</p>
            <p className="text-sm text-muted">{theme.previous} previous → {theme.current} current</p>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">Previous window {formatShortDate(PREVIOUS_WINDOW.start)}–{formatShortDate(PREVIOUS_WINDOW.end)}. Current window {formatShortDate(CURRENT_WINDOW.start)}–{formatShortDate(CURRENT_WINDOW.end)}. A change under 5% is shown as steady.</p>
    </div>
  )
}

export function ThemePage() {
  const { theme = '' } = useParams()
  const name = decodeURIComponent(theme)
  const data = useData()
  const navigate = useNavigate()
  const cases = casesForTheme(data, name)
  const breakdown = subcategoryCounts(cases)
  const isDefects = name === 'Unit Defects'
  return (
    <div>
      <Link to="/customer" className="text-sm font-semibold text-axiom">All themes</Link>
      <PageIntro title={name} subtitle={`${cases.length} total cases`} />
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown} layout="vertical" margin={{ left: 24, right: 16 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={160} />
              <Tooltip />
              <Bar dataKey="count" fill="#5b35c5" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {breakdown.map((item) => (
            <li key={item.name} className="flex justify-between rounded-xl bg-lavender px-4 py-3"><span>{item.name}</span><strong>{item.count}</strong></li>
          ))}
        </ul>
      </div>
      {isDefects && (
        <div className="mt-5">
          <PrimaryButton onClick={() => navigate('/customer/water')}>Explore Water-Related Cases</PrimaryButton>
        </div>
      )}
    </div>
  )
}

export function WaterPage() {
  const data = useData()
  const demo = useDemo()
  const pattern = waterPattern(data)
  const brief = demo.state.artifacts.opsBrief
  const [showCases, setShowCases] = useState(false)
  return (
    <div>
      <Link to="/customer/theme/Unit%20Defects" className="text-sm font-semibold text-axiom">Unit Defects</Link>
      <PageIntro title={pattern.focusName} subtitle="Pattern detected from water-related cases." />
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-lg"><strong>{pattern.focusCount} of the portfolio's {pattern.total} water-related cases</strong> occur at {pattern.focusName}.</p>
        <p className="mt-2">All {pattern.focusCount} are concentrated on Floors {pattern.floorMin}–{pattern.floorMax}.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div><p className="text-sm text-muted">Water-related case rate</p><p className="text-lg font-semibold">{pattern.focusName}</p><p className="text-3xl font-semibold">{(pattern.focusRate * 100).toFixed(1)}%</p></div>
          <div><p className="text-sm text-muted">Portfolio</p><p className="text-3xl font-semibold">approximately {(pattern.portfolioRate * 100).toFixed(1)}%</p></div>
          <div><p className="text-sm text-muted">Relative rate</p><p className="text-3xl font-semibold">Approximately {pattern.multiple.toFixed(1)}× portfolio rate</p></div>
        </div>
        <p className="mt-5 rounded-xl bg-gold-soft p-4">This concentration warrants technical investigation. The available data identifies a pattern but does not establish root cause.</p>
        <div className="mt-4">
          <PrimaryButton onClick={() => setShowCases(true)}>View Cases</PrimaryButton>
        </div>
      </section>
      {showCases && (
        <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist"><tr>{['Case', 'Floor', 'Subcategory', 'Date', 'Status', 'Channel', 'Assigned Team'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead>
            <tbody>
              {pattern.cases.map((item) => (
                <tr key={item.Case_ID} className="border-t border-line">
                  <td className="px-3 py-2">{item.Case_ID}</td>
                  <td className="px-3 py-2">{item.Floor}</td>
                  <td className="px-3 py-2">{item.Subcategory}</td>
                  <td className="px-3 py-2">{formatShortDate(item.Created_Date)}</td>
                  <td className="px-3 py-2">{item.Status}</td>
                  <td className="px-3 py-2">{item.Channel}</td>
                  <td className="px-3 py-2">{item.Assigned_Team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-5">
        <AnalysisButton label="Prepare Operations Brief" onComplete={() => demo.saveOps(buildOperationsBrief(data))} />
      </div>
      {brief && (
        <div className="mt-5">
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Operations Brief</h2>
            <h3 className="mt-4 font-semibold">Observed Pattern</h3>
            <p>{brief.pattern}</p>
            <h3 className="mt-4 font-semibold">Evidence</h3>
            <ul className="mt-2 list-disc pl-5">{brief.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3 className="mt-4 font-semibold">Recommended Investigation</h3>
            <ul className="mt-2 list-disc pl-5">{brief.investigation.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="mt-4 font-semibold">Important</p>
            <p>{brief.boundary}</p>
            <SourceList sources={brief.sources} />
            <HowGenerated tasks={brief.tasks} sourceCount="Customer cases and occupied-unit records" boundary={brief.boundary} reviewer={`${brief.reviewerRole} · ${brief.reviewerName}`} />
          </OutputFrame>
        </div>
      )}
    </div>
  )
}
