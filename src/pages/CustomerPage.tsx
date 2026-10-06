import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GroupedBars } from '../components/charts.tsx'
import { CURRENT_WINDOW, PREVIOUS_WINDOW, casesForTheme, customersForThemeProject, emergingSalesSignal, findCustomer, projectContributions, subcategoryCounts, themeFocus, themeRecommendation, themeStats, waterPattern } from '../data/metrics.ts'
import { formatNumber, formatShortDate, shortName } from '../format.ts'
import type { CustomerCase } from '../types.ts'
import { buildOperationsBrief } from '../services/ai.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import { AnalysisButton, HowGenerated, OutputFrame, PageIntro, PrimaryButton, SourceList } from '../components/ui.tsx'

const arrow: Record<string, string> = { up: '↑', down: '↓', flat: '→' }

function PropertySplit({ cases, theme }: { cases: CustomerCase[]; theme?: string }) {
  const rows = projectContributions(cases)
  const total = cases.length || 1
  return (
    <div>
    <h3 className="mb-2 text-sm font-semibold">By property</h3>
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.projectId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {theme ? (
              <Link to={`/customer/property/${row.projectId}/${encodeURIComponent(theme)}`} className="font-semibold text-axiom">{shortName(row.projectName)}</Link>
            ) : (
              <span>{shortName(row.projectName)}</span>
            )}
            <span className="font-semibold">{row.total} <span className="font-normal text-muted">· {row.previous} → {row.current}</span></span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-fill">
            <div className="h-1.5 rounded-full bg-axiom" style={{ width: `${(row.total / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
    </div>
  )
}

export function CustomerPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const themes = themeStats(data)
  const rising = themes.filter((theme) => theme.direction === 'up')
  const defects = themes.find((theme) => theme.theme === 'Unit Defects')
  const water = waterPattern(data)
  function openTheme(theme: string) {
    demo.selectTheme(theme)
    navigate(`/customer/theme/${encodeURIComponent(theme)}`)
  }
  return (
    <div>
      <PageIntro title="Customer Experience Intelligence" subtitle="Cases grouped from the customer case file." />
      <p className="text-5xl font-semibold tracking-tight">{formatNumber(data.cases.length)}</p>
      <p className="text-lg text-muted">Customer Cases</p>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Cases by theme, previous window and current window</h2>
        <GroupedBars
          data={themes.map((theme) => ({ name: theme.theme, Previous: theme.previous, Current: theme.current }))}
          series={[{ key: 'Previous', color: '#c4b5e0' }, { key: 'Current', color: '#5b35c5' }]}
        />
        <p className="mt-3 text-sm text-muted">Previous window {formatShortDate(PREVIOUS_WINDOW.start)}–{formatShortDate(PREVIOUS_WINDOW.end)}. Current window {formatShortDate(CURRENT_WINDOW.start)}–{formatShortDate(CURRENT_WINDOW.end)}. A change under 5% is shown as steady.</p>
      </section>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">What to open next</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {rising.map((theme) => (
            <article key={theme.theme} className="rounded-2xl bg-canvas p-4">
              <h3 className="font-semibold">{theme.theme}</h3>
              <p className="mt-1 text-sm text-muted">{theme.previous} previous → {theme.current} current</p>
              <p className="mt-2 text-sm">This theme rose. Open it to see which subcategory grew and which project holds the most cases.</p>
              <button type="button" className="mt-3 text-sm font-semibold text-axiom" onClick={() => openTheme(theme.theme)}>Open {theme.theme}</button>
            </article>
          ))}
        </div>
        {defects && defects.current < defects.previous && (
          <article className="mt-4 rounded-2xl bg-[#fff3e0] p-4">
            <h3 className="font-semibold">Unit Defects</h3>
            <p className="mt-2">Volume fell from {defects.previous} to {defects.current}. Water-related cases are concentrated at {water.focusName}.</p>
            <button type="button" className="mt-3 text-sm font-semibold text-axiom" onClick={() => openTheme('Unit Defects')}>Open Unit Defects</button>
          </article>
        )}
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => (
          <article key={theme.theme} className="rounded-2xl bg-white p-5 text-left shadow-sm">
            <button type="button" className="w-full text-left" onClick={() => openTheme(theme.theme)}>
              <p className="text-4xl font-semibold">{theme.total}</p>
              <h2 className="mt-1 text-lg font-semibold">{theme.theme}</h2>
              <p className="mt-2 text-2xl" aria-label={theme.direction}>{arrow[theme.direction]}</p>
              <p className="text-sm text-muted">{theme.previous} previous → {theme.current} current</p>
            </button>
            <div className="mt-4">
              <PropertySplit cases={casesForTheme(data, theme.theme)} />
            </div>
            <p className="mt-4 text-sm leading-6"><span className="font-semibold">Recommendation. </span>{themeRecommendation(theme.theme, casesForTheme(data, theme.theme), theme.direction)}</p>
          </article>
        ))}
      </div>
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
  const focus = themeFocus(cases)
  const direction = themeStats(data).find((item) => item.theme === name)?.direction ?? 'flat'
  const sales = emergingSalesSignal(data)
  const isDefects = name === 'Unit Defects'
  const isParking = name === 'Parking'
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
        {focus.subcategory && focus.projectName && (
          <p className="mt-4 text-base leading-7">
            {focus.subcategory} is the largest subcategory, with {focus.subcategoryCount} of {cases.length} cases. {focus.projectName} holds the most, with {focus.projectCount}.
          </p>
        )}
      </div>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Which property is contributing</h2>
        <div className="mt-4">
          <PropertySplit cases={cases} theme={name} />
        </div>
        <div className="mt-5 rounded-2xl bg-gold-soft p-4">
          <h3 className="font-semibold">Recommendation</h3>
          <p className="mt-2 leading-7">{themeRecommendation(name, cases, direction)}</p>
        </div>
      </section>
      {isDefects && (
        <div className="mt-5 rounded-2xl bg-[#fff3e0] p-5">
          <p>The largest subcategory is {focus.subcategory}. The next step is the water-related cases.</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => navigate('/customer/water')}>Explore Water-Related Cases</PrimaryButton>
          </div>
        </div>
      )}
      {isParking && (
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <p>
            Customer cases mention parking.
            {sales?.parkingShare != null && <> In the latest month, {sales.parkingShare}% of {sales.projectName} lost leads also cite parking.</>}
            {' '}Review both records together.
          </p>
          <Link to="/sales/management" className="mt-3 inline-block text-sm font-semibold text-axiom">See parking in Sales management</Link>
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

export function PropertyCustomersPage() {
  const { projectId = '', theme = '' } = useParams()
  const name = decodeURIComponent(theme)
  const data = useData()
  const customers = customersForThemeProject(data, name, projectId)
  const projectName = customers[0]?.projectName ?? data.projects.find((project) => project.Project_ID === projectId)?.Project_Name ?? projectId
  return (
    <div>
      <Link to={`/customer/theme/${encodeURIComponent(name)}`} className="text-sm font-semibold text-axiom">{name}</Link>
      <PageIntro title={projectName} subtitle={`Customers with a ${name} case. Names are assigned for this demonstration.`} />
      <ul className="space-y-3">
        {customers.map((customer) => {
          const themeCases = customer.cases.filter((item) => item.Theme === name)
          return (
            <li key={customer.id}>
              <Link to={`/customer/person/${customer.id}?theme=${encodeURIComponent(name)}`} className="block rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold">{customer.firstName} {customer.lastName}</p>
                <p className="text-sm text-muted">{customer.customerType}{customer.floor ? ` · Floor ${customer.floor}` : ''}</p>
                <p className="mt-2 text-sm">{themeCases.length} {name} {themeCases.length === 1 ? 'case' : 'cases'} · {customer.cases.length} on record</p>
              </Link>
            </li>
          )
        })}
      </ul>
      {customers.length === 0 && <p>No demonstration customer at this property has a {name} case.</p>}
    </div>
  )
}

export function CustomerRecordPage() {
  const { customerId = '' } = useParams()
  const [params] = useSearchParams()
  const theme = params.get('theme') ?? ''
  const data = useData()
  const customer = findCustomer(data, customerId)
  if (!customer) {
    return <p>This customer is not in the demonstration directory. <Link to="/customer" className="font-semibold text-axiom">Return to customer themes.</Link></p>
  }
  const back = theme
    ? `/customer/property/${customer.projectId}/${encodeURIComponent(theme)}`
    : '/customer'
  return (
    <div>
      <Link to={back} className="text-sm font-semibold text-axiom">{theme ? `${theme} at ${customer.projectName}` : 'All themes'}</Link>
      <PageIntro title={`${customer.firstName} ${customer.lastName}`} subtitle={`${customer.customerType} · ${customer.projectName}${customer.floor ? ` · Floor ${customer.floor}` : ''}`} />
      <p className="mb-5 rounded-2xl bg-gold-soft p-4 text-sm leading-6">Name assigned for this demonstration. The case file records the complaint, not the person.</p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Issues on record</h2>
        <ul className="mt-4 divide-y divide-line">
          {customer.cases.map((item) => (
            <li key={item.Case_ID} className="py-3 first:pt-0 last:pb-0">
              <p className="font-semibold">{item.Theme}</p>
              <p className="text-sm text-muted">{item.Subcategory} · {item.Case_ID} · {formatShortDate(item.Created_Date)}</p>
              <p className="mt-1">{item.Case_Text}</p>
              <p className="mt-1 text-sm text-muted">{item.Status} · {item.Channel} · {item.Assigned_Team}{item.Floor ? ` · Floor ${item.Floor}` : ''}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
