import type { ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { GroupedBars } from '../components/charts.tsx'
import { AnalysisButton, HowGenerated, HumanReview, OutputFrame, PageIntro, SecondaryButton, SourceList, StageChip } from '../components/ui.tsx'
import {
  emergingSalesSignal,
  interactionsFor,
  pipelineCounts,
  salesSignalFor,
  workingLeads,
  type SalesSignal,
  type WorkingLead,
} from '../data/metrics.ts'
import { formatLongDate, formatNumber, formatPct, formatPesoMillions, leadName, shortName } from '../format.ts'
import { buildBuyerBrief, buildFollowUp, buildPropertyMatches } from '../services/ai.ts'
import { stageLook } from '../stages.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import type { Dataset } from '../types.ts'

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(monthNumber) - 1] ?? month} ${year ?? ''}`
}

function SalesFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const onRecord = /^\/sales\/LEAD-/.test(pathname)
  const management = pathname.startsWith('/sales/management')
  const pipeline = pathname === '/sales' || onRecord
  const tab = (active: boolean) => `rounded-lg px-4 py-2 text-sm font-semibold ${active ? 'bg-white text-ink shadow-sm' : 'text-muted'}`
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">Sales & Buyer Intelligence</p>
        <div className="flex rounded-xl bg-fill p-1">
          <Link to="/sales" className={tab(pipeline && !management)}>Pipeline</Link>
          <Link to="/sales/management" className={tab(management)}>Sales management</Link>
        </div>
      </div>
      {children}
    </div>
  )
}

export function SalesPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const stages = pipelineCounts(data)
  const records = workingLeads(data)
  return (
    <SalesFrame>
      <PageIntro title="Pipeline" subtitle="The salesperson’s working board. Stage counts include every lead in the file." />
      <ProjectMovement data={data} />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const look = stageLook(stage.status)
          const cards = records.filter((record) => record.lead.Lead_Status === stage.status)
          return (
            <section key={stage.status} className="w-72 shrink-0 rounded-2xl p-3" style={{ background: look.wash }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold" style={{ color: look.ink }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: look.bar }} />
                  {stage.status}
                </h2>
                <span className="rounded-full px-2.5 py-0.5 text-sm font-semibold text-white" style={{ background: look.bar }}>{formatNumber(stage.count)}</span>
              </div>
              <div className="space-y-3">
                {cards.map((record) => (
                  <button
                    key={record.lead.Lead_ID}
                    type="button"
                    className="w-full rounded-2xl bg-white p-4 text-left shadow-sm"
                    style={{ borderLeft: `4px solid ${look.bar}` }}
                    onClick={() => { demo.selectLead(record.lead.Lead_ID); navigate(`/sales/${record.lead.Lead_ID}`) }}
                  >
                    <p className="text-lg font-semibold">{leadName(record.lead)}</p>
                    <p className="mt-1 text-sm text-muted">{record.lead.Buyer_Type}</p>
                    <span className="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: look.soft, color: look.ink }}>{record.lead.Lead_Score}</span>
                    <p className="mt-3 text-sm">{record.owner}</p>
                    <p className="text-sm text-muted">{record.lastChannel} · {formatLongDate(record.lastDate)}</p>
                    <p className="mt-3 text-sm font-semibold" style={{ color: look.ink }}>Next: {record.nextAction}</p>
                  </button>
                ))}
                {cards.length === 0 && <p className="px-1 text-sm" style={{ color: look.ink }}>No open demo record in this stage.</p>}
              </div>
            </section>
          )
        })}
      </div>
    </SalesFrame>
  )
}

export function SalesManagementPage() {
  const data = useData()
  const focus = emergingSalesSignal(data)
  const records = workingLeads(data)
  const inquiryChange = Math.round((focus?.inquiryChange ?? 0) * 100)
  return (
    <SalesFrame>
      <PageIntro title="Sales management" subtitle="The book across projects, reasons buyers give, and the conversations each team still owns." />
      {focus?.previous && focus.current && (
        <section className="mb-5 grid gap-4 md:grid-cols-3">
          <MetricTile tint="#007aff" label={`${focus.projectName} inquiries`} value={`${focus.previous.Inquiries} → ${focus.current.Inquiries}`} note={`approximately ${inquiryChange >= 0 ? '+' : ''}${inquiryChange}%`} />
          <MetricTile tint="#c2410c" label="Matured-lead conversion" value={`${formatPct(focus.previous.Matured_Lead_Conversion_Rate_Pct)} → ${formatPct(focus.current.Matured_Lead_Conversion_Rate_Pct)}`} />
          <MetricTile tint="#0f766e" label={`Parking in ${monthLabel(focus.current.Month)} lost leads`} value={`${focus.parkingShare ?? 0}%`} />
        </section>
      )}
      <section className="rounded-2xl bg-gold-soft p-5">
        <h2 className="text-lg font-semibold">Question for the sales manager</h2>
        <p className="mt-2 text-base leading-7">Buyers are raising parking. Is parking availability, communication, or another factor contributing to lower conversion? The lost-lead mix shows an association. It does not establish the cause.</p>
        <Link to="/management" className="mt-3 inline-block text-sm font-semibold text-axiom">This signal also sits in Management Intelligence</Link>
      </section>
      <div className="mt-5">
        <ProjectMovementCharts data={data} />
      </div>
      {focus && (
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{focus.projectName} lost-lead reasons · {focus.current ? monthLabel(focus.current.Month) : ''}</h2>
          <ul className="mt-4 space-y-3">
            {focus.currentReasons.map((reason, index) => {
              const color = /parking/i.test(reason.Reason) ? '#ff9500' : ['#007aff', '#0f766e', '#6d28d9', '#15803d', '#5856d6'][index % 5]
              return (
                <li key={reason.Reason}>
                  <div className="mb-1 flex justify-between text-sm"><span>{reason.Reason}</span><strong>{reason.Share_of_Lost_Leads_Pct}%</strong></div>
                  <div className="h-2 rounded-full bg-fill"><div className="h-2 rounded-full" style={{ width: `${reason.Share_of_Lost_Leads_Pct}%`, background: color }} /></div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <section className="mt-5">
        <h2 className="mb-3 text-xl font-semibold">Open owner actions</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {records.map((record) => <OwnerCard key={record.lead.Lead_ID} record={record} />)}
        </div>
      </section>
    </SalesFrame>
  )
}

function movementSeries(data: Dataset) {
  const rows = data.projects
    .map((project) => salesSignalFor(data, project.Project_ID))
    .filter((signal): signal is SalesSignal => Boolean(signal?.previous && signal.current))
  const previousKey = rows[0]?.previous ? monthLabel(rows[0].previous.Month) : 'Previous'
  const currentKey = rows[0]?.current ? monthLabel(rows[0].current.Month) : 'Current'
  const inquiryChart = rows.map((signal) => ({
    name: shortName(signal.projectName),
    [previousKey]: signal.previous?.Inquiries ?? 0,
    [currentKey]: signal.current?.Inquiries ?? 0,
  }))
  const conversionChart = rows.map((signal) => ({
    name: shortName(signal.projectName),
    [previousKey]: signal.previous?.Matured_Lead_Conversion_Rate_Pct ?? 0,
    [currentKey]: signal.current?.Matured_Lead_Conversion_Rate_Pct ?? 0,
  }))
  return { previousKey, currentKey, inquiryChart, conversionChart }
}

function ProjectMovementCharts({ data }: { data: Dataset }) {
  const { previousKey, currentKey, inquiryChart, conversionChart } = movementSeries(data)
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Inquiries by project</h2>
        <GroupedBars data={inquiryChart} series={[{ key: previousKey, color: '#d1d1d6' }, { key: currentKey, color: '#007aff' }]} />
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Matured-lead conversion %</h2>
        <GroupedBars data={conversionChart} series={[{ key: previousKey, color: '#d1d1d6' }, { key: currentKey, color: '#c2410c' }]} />
      </section>
    </div>
  )
}

function ProjectMovement({ data }: { data: Dataset }) {
  const focus = emergingSalesSignal(data)
  const previous = focus?.previous
  const current = focus?.current
  return (
    <section className="mb-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Where the book is uneven</h2>
        <Link to="/sales/management" className="text-sm font-semibold text-axiom">Open the sales management dashboard</Link>
      </div>
      {previous && current && (
        <p className="mb-4 max-w-3xl text-base leading-7">
          {focus?.projectName} inquiries moved from {previous.Inquiries} to {current.Inquiries}, while matured-lead conversion moved from {formatPct(previous.Matured_Lead_Conversion_Rate_Pct)} to {formatPct(current.Matured_Lead_Conversion_Rate_Pct)}.
        </p>
      )}
      <ProjectMovementCharts data={data} />
    </section>
  )
}

function MetricTile({ tint, label, value, note }: { tint: string; label: string; value: string; note?: string }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-1.5" style={{ background: tint }} />
      <div className="p-5">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-3xl font-semibold">{value}</p>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
    </article>
  )
}

function OwnerCard({ record }: { record: WorkingLead }) {
  const look = stageLook(record.lead.Lead_Status)
  return (
    <Link to={`/sales/${record.lead.Lead_ID}`} className="rounded-2xl bg-white p-5 shadow-sm" style={{ borderTop: `4px solid ${look.bar}` }}>
      <p className="text-sm font-semibold" style={{ color: look.ink }}>{record.owner}</p>
      <h3 className="mt-1 text-xl font-semibold">{leadName(record.lead)}</h3>
      <div className="mt-2"><StageChip value={record.lead.Lead_Status} /></div>
      <p className="mt-2 text-sm text-muted">{record.lead.Buyer_Type}</p>
      <p className="mt-3 text-sm font-semibold" style={{ color: look.ink }}>Next: {record.nextAction}</p>
    </Link>
  )
}

export function LeadPage() {
  const { leadId = '' } = useParams()
  const data = useData()
  const demo = useDemo()
  const record = workingLeads(data).find((item) => item.lead.Lead_ID === leadId)
  const lead = record?.lead
  if (!lead || !record) {
    return <p>This lead is not on the working board. <Link to="/sales" className="font-semibold text-axiom">Return to the pipeline.</Link></p>
  }
  const interactions = [...interactionsFor(data, lead.Lead_ID)].reverse()
  const brief = demo.state.artifacts.buyerBriefs[lead.Lead_ID]
  const matches = demo.state.artifacts.matches[lead.Lead_ID]
  const compared = demo.state.artifacts.compared[lead.Lead_ID]
  const followUp = demo.state.artifacts.followUps[lead.Lead_ID]
  const look = stageLook(lead.Lead_Status)
  const interests = [
    lead.Parking_Concern ? 'Parking' : '',
    lead.Rental_Concern ? 'Rental attractiveness' : '',
    lead.Turnover_Concern ? 'Turnover timing' : '',
  ].filter(Boolean)

  return (
    <SalesFrame>
      <PageIntro title={leadName(lead)} subtitle={`${record.owner} · ${lead.Lead_Score}`} />
      <div className="mb-4"><StageChip value={lead.Lead_Status} /></div>
      <section className="rounded-2xl p-5 text-white" style={{ background: look.bar }}>
        <p className="text-sm font-medium text-white/80">Next action</p>
        <p className="mt-1 text-2xl font-semibold">{record.nextAction}</p>
        <p className="mt-2 text-white/80">Last activity {formatLongDate(record.lastDate)} · {record.lastChannel}</p>
      </section>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Buyer</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div><dt className="text-sm text-muted">Budget</dt><dd className="font-semibold">{formatPesoMillions(lead.Budget_Min_PHP_M)}–{formatPesoMillions(lead.Budget_Max_PHP_M)}</dd></div>
            <div><dt className="text-sm text-muted">Location</dt><dd className="font-semibold">{lead.City_Preference}</dd></div>
            <div><dt className="text-sm text-muted">Unit</dt><dd className="font-semibold">{lead.Unit_Preference}</dd></div>
            <div><dt className="text-sm text-muted">Purpose</dt><dd className="font-semibold">{lead.Purpose}</dd></div>
            <div><dt className="text-sm text-muted">Source</dt><dd className="font-semibold">{lead.Source}</dd></div>
            <div><dt className="text-sm text-muted">Stage</dt><dd className="mt-1"><StageChip value={lead.Lead_Status} /></dd></div>
          </dl>
          <h3 className="mt-4 font-semibold">Interests from previous interactions</h3>
          <ul className="mt-2 list-disc pl-5">{interests.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Activity</h2>
          <ol className="mt-3 divide-y divide-line">
            {interactions.map((item) => (
              <li key={item.Interaction_ID} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: look.bar }} />
                <div>
                  <p className="text-sm font-medium text-muted">{formatLongDate(item.Interaction_Date)} · {item.Channel} · {item.Agent}</p>
                  <p className="mt-1">{item.Interaction_Text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <AnalysisButton label="Prepare for Buyer Conversation" onComplete={() => demo.saveBuyer(lead.Lead_ID, buildBuyerBrief(data, lead.Lead_ID))} />
        <AnalysisButton label="Find Suitable Properties" onComplete={() => demo.saveMatches(lead.Lead_ID, buildPropertyMatches(data, lead.Lead_ID))} />
        <SecondaryButton disabled={!matches?.length} onClick={() => demo.showCompare(lead.Lead_ID)}>Compare Options</SecondaryButton>
        <AnalysisButton label="Draft Follow-Up" onComplete={() => { demo.clearDraft(`follow-${lead.Lead_ID}`); demo.saveFollowUp(lead.Lead_ID, buildFollowUp(data, lead.Lead_ID)) }} />
      </div>
      <div className="mt-5 space-y-5">
        {brief && (
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Call preparation</h2>
            <h3 className="mt-4 font-semibold">Open with</h3>
            <p className="mt-1">{brief.openWith}</p>
            {brief.alreadySaid.length > 0 && (
              <>
                <h3 className="mt-4 font-semibold">Already said</h3>
                <ul className="mt-2 list-disc pl-5">{brief.alreadySaid.map((item) => <li key={item}>{item}</li>)}</ul>
              </>
            )}
            <h3 className="mt-4 font-semibold">What matters most</h3>
            <ol className="mt-2 list-decimal pl-5">{brief.matters.map((item) => <li key={item}>{item}</li>)}</ol>
            <h3 className="mt-4 font-semibold">Questions worth clarifying</h3>
            <ul className="mt-2 list-disc pl-5">{brief.questions.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3 className="mt-4 font-semibold">Recommended talking points</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5">{brief.talkingPoints.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3 className="mt-4 font-semibold">Do not promise</h3>
            <ul className="mt-2 list-disc pl-5">{brief.doNotPromise.map((item) => <li key={item}>{item}</li>)}</ul>
            <SourceList sources={brief.sources} />
            <HowGenerated tasks={brief.tasks} sourceCount="Lead record, interactions, and approved FAQ" boundary={brief.boundary} reviewer={`${brief.reviewerRole} · ${brief.reviewerName}`} />
          </OutputFrame>
        )}
        {matches && (
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Suitable properties</h2>
            <p className="mt-1 text-sm text-muted">Strong matches from the approved inventory.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {matches.map((match, index) => (
                <article key={match.unit.Inventory_ID} className="rounded-2xl bg-canvas p-4" style={{ borderTop: `4px solid ${['#007aff', '#0f766e', '#c2410c'][index % 3]}` }}>
                  <h3 className="text-lg font-semibold">{match.unit.Project_Name}</h3>
                  <p className="mt-2 font-medium">{match.unit.Unit_Type} · {match.unit.Floor_Area_sqm} sqm · {formatPesoMillions(match.unit.List_Price_PHP_M)}</p>
                  <p>{match.unit.Parking_Available ? 'Parking available' : 'Parking not listed'}</p>
                  <p className="text-sm text-muted">Turnover {match.unit.Turnover_Window}</p>
                  <h4 className="mt-3 text-sm font-semibold">Strong match because…</h4>
                  <ul className="mt-1 list-disc pl-5 text-sm">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                </article>
              ))}
            </div>
          </OutputFrame>
        )}
        {compared && matches && matches.length > 0 && (
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Compare Options</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2"> </th>
                    {matches.map((match) => <th key={match.unit.Inventory_ID} className="px-3 py-2">{match.unit.Project_Name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Price', (match: typeof matches[number]) => formatPesoMillions(match.unit.List_Price_PHP_M)],
                    ['Unit type', (match: typeof matches[number]) => match.unit.Unit_Type],
                    ['Floor area', (match: typeof matches[number]) => `${match.unit.Floor_Area_sqm} sqm`],
                    ['Parking', (match: typeof matches[number]) => match.unit.Parking_Available ? 'Available' : 'Not listed'],
                    ['Turnover window', (match: typeof matches[number]) => match.unit.Turnover_Window],
                    ['Buyer profile', (match: typeof matches[number]) => match.unit.Rental_Profile],
                    ['Availability', (match: typeof matches[number]) => `${match.unit.Available_Units} units · ${match.unit.Inventory_Status}`],
                  ].map(([label, render]) => (
                    <tr key={String(label)} className="border-t border-line">
                      <th className="px-3 py-2 font-semibold">{label as string}</th>
                      {matches.map((match) => <td key={match.unit.Inventory_ID} className="px-3 py-2">{(render as (item: typeof match) => string)(match)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted">Source: property inventory records.</p>
          </OutputFrame>
        )}
        {followUp && (
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Unsent follow-up</h2>
            <p className="mt-1 text-sm text-muted">This stays a draft on the lead record until the account owner verifies it.</p>
            <p className="mt-3 text-sm font-semibold text-muted">Subject</p>
            <p>{followUp.subject}</p>
            <HumanReview id={`follow-${lead.Lead_ID}`} role={followUp.reviewerRole} name={followUp.reviewerName} text={followUp.body} />
            <h3 className="mt-4 font-semibold">Verify Before Sending</h3>
            <ul className="mt-2 list-disc pl-5">{followUp.checks.map((item) => <li key={item}>{item}</li>)}</ul>
            <SourceList sources={followUp.sources} />
            <HowGenerated tasks={followUp.tasks} sourceCount="Inventory, approved FAQ, and interaction history" boundary={followUp.boundary} reviewer={`${followUp.reviewerRole} · ${followUp.reviewerName}`} />
          </OutputFrame>
        )}
      </div>
    </SalesFrame>
  )
}

export function SalesSignalPage() {
  return <Navigate to="/sales/management" replace />
}
