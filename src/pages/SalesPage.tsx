import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatLongDate, formatPct, formatPesoMillions, leadName } from '../format.ts'
import { FEATURED_LEAD_IDS, findLead, interactionsFor, pipelineCounts, salesSignalFor } from '../data/metrics.ts'
import { buildBuyerBrief, buildFollowUp, buildPropertyMatches } from '../services/ai.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import { AnalysisButton, HowGenerated, HumanReview, OutputFrame, PageIntro, SecondaryButton, SourceList, StatusPill } from '../components/ui.tsx'

export function SalesPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const featured = FEATURED_LEAD_IDS.map((id) => findLead(data, id)).filter((lead) => lead != null)
  const pipeline = pipelineCounts(data)
  return (
    <div>
      <PageIntro title="Sales & Buyer Intelligence" subtitle={`${data.leads.length.toLocaleString('en-US')} leads in the synthetic pipeline. The walkthrough uses three buyer records.`} />
      <div className="mb-6 flex flex-wrap gap-2">
        {pipeline.map((item) => (
          <span key={item.status} className="rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-sm">{item.status} · {item.count}</span>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {featured.map((lead) => (
          <button key={lead.Lead_ID} type="button" className="rounded-2xl bg-white p-5 text-left shadow-sm" onClick={() => { demo.selectLead(lead.Lead_ID); navigate(`/sales/${lead.Lead_ID}`) }}>
            <h2 className="text-2xl font-semibold">{leadName(lead)}</h2>
            <p className="mt-1 text-muted">{lead.Buyer_Type}</p>
            <div className="mt-3"><StatusPill value={lead.Lead_Score} /></div>
            <p className="mt-3 text-sm">{lead.Unit_Preference} · {lead.City_Preference} · {lead.Lead_Status}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export function LeadPage() {
  const { leadId = '' } = useParams()
  const data = useData()
  const demo = useDemo()
  const lead = findLead(data, leadId)
  if (!lead) return <p>This lead is not in the file. <Link to="/sales" className="font-semibold text-axiom">Return to the pipeline.</Link></p>
  const interactions = interactionsFor(data, lead.Lead_ID)
  const brief = demo.state.artifacts.buyerBriefs[lead.Lead_ID]
  const matches = demo.state.artifacts.matches[lead.Lead_ID]
  const compared = demo.state.artifacts.compared[lead.Lead_ID]
  const followUp = demo.state.artifacts.followUps[lead.Lead_ID]
  const interests = [
    lead.Parking_Concern ? 'Parking' : '',
    lead.Rental_Concern ? 'Rental attractiveness' : '',
    lead.Turnover_Concern ? 'Turnover timing' : '',
  ].filter(Boolean)

  return (
    <div>
      <Link to="/sales" className="text-sm font-semibold text-axiom">Lead pipeline</Link>
      <PageIntro title={leadName(lead)} subtitle={`${lead.Buyer_Type} · ${lead.Lead_Score}`} />
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Buyer profile</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Budget</dt><dd className="text-lg font-semibold">{formatPesoMillions(lead.Budget_Min_PHP_M)}–{formatPesoMillions(lead.Budget_Max_PHP_M)}</dd></div>
          <div><dt className="text-sm text-muted">Preferred location</dt><dd className="text-lg font-semibold">{lead.City_Preference}</dd></div>
          <div><dt className="text-sm text-muted">Unit</dt><dd className="text-lg font-semibold">{lead.Unit_Preference}</dd></div>
          <div><dt className="text-sm text-muted">Purpose</dt><dd className="text-lg font-semibold">{lead.Purpose}</dd></div>
          <div><dt className="text-sm text-muted">Lead status</dt><dd className="text-lg font-semibold">{lead.Lead_Status}</dd></div>
        </dl>
        <h3 className="mt-5 font-semibold">Key interests identified from previous interactions</h3>
        <ul className="mt-2 list-disc pl-5">{interests.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Interaction History</h2>
        <ol className="mt-3 space-y-3">
          {interactions.map((item) => (
            <li key={item.Interaction_ID} className="rounded-xl bg-lavender p-4">
              <p className="text-sm font-semibold text-muted">{formatLongDate(item.Interaction_Date)} · {item.Channel} · {item.Agent}</p>
              <p className="mt-1">{item.Interaction_Text}</p>
            </li>
          ))}
        </ol>
      </section>
      <div className="mt-5 flex flex-wrap gap-3">
        <AnalysisButton label="Prepare for Buyer Conversation" onComplete={() => demo.saveBuyer(lead.Lead_ID, buildBuyerBrief(data, lead.Lead_ID))} />
        <AnalysisButton label="Find Suitable Properties" onComplete={() => demo.saveMatches(lead.Lead_ID, buildPropertyMatches(data, lead.Lead_ID))} />
        <SecondaryButton disabled={!matches?.length} onClick={() => demo.showCompare(lead.Lead_ID)}>Compare Options</SecondaryButton>
        <AnalysisButton label="Draft Follow-Up" onComplete={() => { demo.clearDraft(`follow-${lead.Lead_ID}`); demo.saveFollowUp(lead.Lead_ID, buildFollowUp(data, lead.Lead_ID)) }} />
      </div>
      <div className="mt-5 space-y-5">
        {brief && (
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Prepare for the conversation</h2>
            <h3 className="mt-4 font-semibold">What matters most</h3>
            <ol className="mt-2 list-decimal pl-5">{brief.matters.map((item) => <li key={item}>{item}</li>)}</ol>
            <h3 className="mt-4 font-semibold">Questions worth clarifying</h3>
            <ul className="mt-2 list-disc pl-5">{brief.questions.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3 className="mt-4 font-semibold">Recommended talking points</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5">{brief.talkingPoints.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="mt-3 text-sm text-muted">Use approved property facts only.</p>
            <SourceList sources={brief.sources} />
            <HowGenerated tasks={brief.tasks} sourceCount="Lead record, interactions, and approved FAQ" boundary={brief.boundary} reviewer={`${brief.reviewerRole} · ${brief.reviewerName}`} />
          </OutputFrame>
        )}
        {matches && (
          <OutputFrame>
            <h2 className="text-2xl font-semibold">Suitable properties</h2>
            <p className="mt-1 text-sm text-muted">Strong matches from the approved inventory. None is ranked as best.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {matches.map((match) => (
                <article key={match.unit.Inventory_ID} className="rounded-xl border border-line p-4">
                  <h3 className="text-lg font-semibold">{match.unit.Project_Name}</h3>
                  <p className="mt-2 font-medium">{match.unit.Unit_Type} · {match.unit.Floor_Area_sqm} sqm · {formatPesoMillions(match.unit.List_Price_PHP_M)}</p>
                  <p>{match.unit.Parking_Available ? 'Parking available' : 'Parking not listed'}</p>
                  <p className="text-sm text-muted">Turnover {match.unit.Turnover_Window}</p>
                  <h4 className="mt-3 text-sm font-semibold">Strong match because…</h4>
                  <ul className="mt-1 list-disc pl-5 text-sm">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                </article>
              ))}
            </div>
            {!matches.length && <p className="mt-3">No approved inventory row meets this buyer's stated unit, budget, location, and parking requirements.</p>}
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
            <h2 className="text-2xl font-semibold">Suggested buyer follow-up</h2>
            <p className="mt-2 text-sm font-semibold text-muted">Subject</p>
            <p>{followUp.subject}</p>
            <HumanReview id={`follow-${lead.Lead_ID}`} role={followUp.reviewerRole} name={followUp.reviewerName} text={followUp.body} />
            <h3 className="mt-4 font-semibold">Verify Before Sending</h3>
            <ul className="mt-2 list-disc pl-5">{followUp.checks.map((item) => <li key={item}>{item}</li>)}</ul>
            <SourceList sources={followUp.sources} />
            <HowGenerated tasks={followUp.tasks} sourceCount="Inventory, approved FAQ, and interaction history" boundary={followUp.boundary} reviewer={`${followUp.reviewerRole} · ${followUp.reviewerName}`} />
          </OutputFrame>
        )}
      </div>
    </div>
  )
}

export function SalesSignalPage() {
  const { projectId = '' } = useParams()
  const data = useData()
  const signal = salesSignalFor(data, projectId)
  if (!signal?.current || !signal.previous) return <p>Sales history for this project is unavailable.</p>
  return (
    <div>
      <Link to="/management" className="text-sm font-semibold text-axiom">Back to Management Intelligence</Link>
      <PageIntro title={signal.projectName} subtitle="Sales evidence behind the management signal." />
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{signal.previous.Month}</h2>
          <p className="mt-2 text-3xl font-semibold">{signal.previous.Inquiries}</p>
          <p>Inquiries</p>
          <p className="mt-3">Matured-lead conversion {formatPct(signal.previous.Matured_Lead_Conversion_Rate_Pct)}</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{signal.current.Month}</h2>
          <p className="mt-2 text-3xl font-semibold">{signal.current.Inquiries}</p>
          <p>Inquiries</p>
          <p className="mt-3">Matured-lead conversion {formatPct(signal.current.Matured_Lead_Conversion_Rate_Pct)}</p>
        </article>
      </div>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Lost-lead reasons · {signal.current.Month}</h2>
        <p className="mt-2 text-sm text-muted">This is an association in the lost-lead file. It does not show that one reason caused the conversion change.</p>
        <ul className="mt-4 space-y-2">
          {signal.currentReasons.map((reason) => (
            <li key={reason.Reason} className="flex items-center justify-between gap-4">
              <span>{reason.Reason}</span>
              <strong>{reason.Share_of_Lost_Leads_Pct}%</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
