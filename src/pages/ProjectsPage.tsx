import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GroupedBars } from '../components/charts.tsx'
import { approvedDocuments, attentionCount, issuesFor, milestonesFor, projectSnapshots } from '../data/metrics.ts'
import { formatLongDate, formatNumber, formatPct, shortName } from '../format.ts'
import { buildChangeReport, buildExecutiveUpdate, buildProjectBrief } from '../services/ai.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import { useSourceModal } from '../components/ui.tsx'
import { AnalysisButton, HowGenerated, HumanReview, OutputFrame, PageIntro, SourceList, StatusPill } from '../components/ui.tsx'

export function ProjectsPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const snapshots = projectSnapshots(data)
  const behind = snapshots.filter((item) => item.project.Actual_Progress_Pct < item.project.Planned_Progress_Pct).length
  const amber = snapshots.filter((item) => item.project.Overall_Status === 'AMBER').length
  const chart = snapshots.map((item) => ({
    name: shortName(item.project.Project_Name),
    Planned: item.project.Planned_Progress_Pct,
    Actual: item.project.Actual_Progress_Pct,
  }))
  return (
    <div>
      <PageIntro title="Project Intelligence" subtitle="Portfolio status with the records behind each project." />
      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-muted">Active projects</p><p className="mt-1 text-3xl font-semibold">{formatNumber(snapshots.length)}</p></article>
        <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-muted">Behind plan</p><p className="mt-1 text-3xl font-semibold">{formatNumber(behind)}</p></article>
        <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-muted">Amber status</p><p className="mt-1 text-3xl font-semibold">{formatNumber(amber)}</p></article>
        <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-muted">Open high and critical issues</p><p className="mt-1 text-3xl font-semibold">{formatNumber(attentionCount(data))}</p></article>
      </section>
      <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Actual progress against plan</h2>
        <GroupedBars data={chart} series={[{ key: 'Planned', color: '#c4b5e0' }, { key: 'Actual', color: '#5b35c5' }]} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {snapshots.map((snapshot) => {
          const project = snapshot.project
          const selected = demo.state.selectedProjectId === project.Project_ID
          return (
            <button
              key={project.Project_ID}
              type="button"
              onClick={() => { demo.selectProject(project.Project_ID); navigate(`/projects/${project.Project_ID}`) }}
              className={`rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ${selected || project.Project_ID === 'PRJ-001' ? 'ring-amber' : 'ring-transparent'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{project.Project_Name}</h2>
                  <p className="text-sm text-muted">{project.City} · {project.Stage}</p>
                </div>
                <StatusPill value={project.Overall_Status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted">Actual progress</dt><dd className="text-lg font-semibold">{formatPct(project.Actual_Progress_Pct)}</dd></div>
                <div><dt className="text-muted">Planned progress</dt><dd className="text-lg font-semibold">{formatPct(project.Planned_Progress_Pct)}</dd></div>
                <div><dt className="text-muted">Schedule status</dt><dd className="mt-1"><StatusPill value={snapshot.scheduleStatus} /></dd></div>
                <div><dt className="text-muted">Budget status</dt><dd className="mt-1"><StatusPill value={snapshot.budgetStatus} /></dd></div>
                <div><dt className="text-muted">Open issues</dt><dd className="text-lg font-semibold">{snapshot.openIssues}</dd></div>
              </dl>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ProjectWorkspacePage() {
  const { projectId = '' } = useParams()
  const data = useData()
  const demo = useDemo()
  const { openSource } = useSourceModal()
  const [tab, setTab] = useState<'Overview' | 'Documents' | 'Milestones' | 'Issues'>('Overview')
  const snapshot = projectSnapshots(data).find((item) => item.project.Project_ID === projectId)
  useEffect(() => {
    if (projectId) demo.selectProject(projectId)
  }, [demo, projectId])
  if (!snapshot) return <p>This project is not in the synthetic portfolio. <Link to="/projects" className="font-semibold text-axiom">Return to the portfolio.</Link></p>
  const project = snapshot.project
  const documents = approvedDocuments(data, project.Project_ID)
  const milestones = milestonesFor(data, project.Project_ID)
  const issues = issuesFor(data, project.Project_ID)
  const brief = demo.state.artifacts.briefs[project.Project_ID]
  const change = demo.state.artifacts.changes[project.Project_ID]
  const update = demo.state.artifacts.updates[project.Project_ID]
  const behind = Math.round((project.Planned_Progress_Pct - project.Actual_Progress_Pct) * 10) / 10

  return (
    <div>
      <Link to="/projects" className="text-sm font-semibold text-axiom">All projects</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <PageIntro title={project.Project_Name} subtitle={`${project.City} · ${project.Stage} · ${project.Project_Director}`} />
      </div>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Actual Progress" value={formatPct(project.Actual_Progress_Pct)} />
        <Metric label="Planned Progress" value={formatPct(project.Planned_Progress_Pct)} />
        <Metric label={behind > 0 ? 'Behind Plan' : behind < 0 ? 'Ahead of Plan' : 'Versus Plan'} value={`${Math.abs(behind)} pts`} />
        <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-muted">Overall Status</p><div className="mt-2"><StatusPill value={project.Overall_Status} /></div></div>
        <Metric label="High-Priority Open Issues" value={String(snapshot.highOpenIssues)} />
      </section>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['Overview', 'Documents', 'Milestones', 'Issues'] as const).map((item) => (
          <button key={item} type="button" className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === item ? 'bg-axiom text-white' : 'bg-white text-ink'}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === 'Overview' && (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Available Business Information</h2>
            <div className="mt-4 grid gap-3">
              {documents.map((document) => (
                <button key={document.Document_ID} type="button" className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-axiom" onClick={() => openSource({ id: document.Document_ID, label: document.Title, documentId: document.Document_ID })}>
                  <span>
                    <span className="block font-semibold">{document.Title}</span>
                    <span className="text-sm text-muted">{document.Document_Type} · {formatLongDate(document.Document_Date)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-good-soft px-3 py-1 text-xs font-semibold text-good">Approved Source</span>
                </button>
              ))}
            </div>
          </section>
          <div className="flex flex-wrap gap-3">
            <AnalysisButton
              label="Generate Project Brief"
              stages={['Retrieving approved information…', `Analyzing ${documents.length} approved sources…`, 'Preparing response…']}
              onComplete={() => { demo.clearDraft(`exec-${project.Project_ID}`); demo.saveBrief(project.Project_ID, buildProjectBrief(data, project.Project_ID)) }}
            />
            <AnalysisButton label="Show What Changed" onComplete={() => demo.saveChange(project.Project_ID, buildChangeReport(data, project.Project_ID))} />
            <AnalysisButton label="Prepare Executive Update" onComplete={() => { demo.clearDraft(`exec-${project.Project_ID}`); demo.saveUpdate(project.Project_ID, buildExecutiveUpdate(data, project.Project_ID)) }} />
          </div>
          {brief && (
            <OutputFrame>
              <h2 className="text-2xl font-semibold">Project Brief</h2>
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Overall Status</h3>
              <div className="mt-2"><StatusPill value={brief.status} /></div>
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Progress</h3>
              <p className="mt-1 text-lg">{formatPct(brief.actual)} actual vs {formatPct(brief.planned)} planned</p>
              <p>{brief.behind > 0 ? `${brief.behind} percentage points behind plan` : brief.behind < 0 ? `${Math.abs(brief.behind)} percentage points ahead of plan` : 'In line with plan'}</p>
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Key Risks</h3>
              <ul className="mt-2 space-y-2">
                {brief.risks.map((risk) => <li key={risk.title}><strong>{risk.title}.</strong> {risk.detail}</li>)}
              </ul>
              {brief.positive && <><h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Positive Movement</h3><p className="mt-1">{brief.positive}</p></>}
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Upcoming Milestones</h3>
              <ul className="mt-2 space-y-1">{brief.milestones.map((milestone) => <li key={milestone.name}>{milestone.name} · {milestone.when} · {milestone.status}</li>)}</ul>
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Management Attention</h3>
              <p className="mt-1">{brief.attention}</p>
              <SourceList sources={brief.sources} />
              <HowGenerated tasks={brief.tasks} sourceCount={`${documents.length} approved documents`} boundary={brief.boundary} reviewer={`${brief.reviewerRole} · ${brief.reviewerName}`} />
            </OutputFrame>
          )}
          {change && (
            <OutputFrame>
              <h2 className="text-2xl font-semibold">What Changed</h2>
              <p className="mt-1 text-muted">{change.fromLabel} compared with {change.toLabel}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {change.sections.map((section) => (
                  <section key={section.key} className="rounded-xl bg-lavender p-4">
                    <h3 className="text-sm font-bold tracking-wide">{section.key}</h3>
                    {section.items.map((item) => (
                      <p key={item.title} className="mt-2"><span className="font-semibold">{item.title}</span><span className="mt-1 block text-lg">{item.detail}</span></p>
                    ))}
                  </section>
                ))}
              </div>
              <SourceList sources={change.sources} />
              <HowGenerated tasks={change.tasks} sourceCount="Weekly updates" boundary={change.boundary} reviewer={`${change.reviewerRole} · ${change.reviewerName}`} />
            </OutputFrame>
          )}
          {update && (
            <OutputFrame>
              <h2 className="text-2xl font-semibold">Executive Update</h2>
              <HumanReview id={`exec-${project.Project_ID}`} role={update.reviewerRole} name={update.reviewerName} text={update.paragraph} />
              <SourceList sources={update.sources} />
              <HowGenerated tasks={update.tasks} sourceCount={`${documents.length} approved documents`} boundary={update.boundary} reviewer={`${update.reviewerRole} · ${update.reviewerName}`} />
            </OutputFrame>
          )}
        </div>
      )}
      {tab === 'Documents' && (
        <div className="grid gap-3">
          {documents.map((document) => (
            <button key={document.Document_ID} type="button" className="rounded-2xl bg-white p-4 text-left shadow-sm" onClick={() => openSource({ id: document.Document_ID, label: document.Title, documentId: document.Document_ID })}>
              <span className="font-semibold">{document.Title}</span>
              <span className="mt-1 block text-sm text-muted">{document.Document_Type} · {formatLongDate(document.Document_Date)} · Approved Source</span>
            </button>
          ))}
        </div>
      )}
      {tab === 'Milestones' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist"><tr>{['Milestone', 'Baseline', 'Forecast', 'Variance', 'Status'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>
              {milestones.map((milestone) => (
                <tr key={milestone.Milestone_ID} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{milestone.Milestone_Name}</td>
                  <td className="px-4 py-3">{formatLongDate(milestone.Baseline_Date)}</td>
                  <td className="px-4 py-3">{formatLongDate(milestone.Forecast_Date)}</td>
                  <td className="px-4 py-3">{milestone.Variance_Days} days</td>
                  <td className="px-4 py-3"><StatusPill value={milestone.Status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'Issues' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist"><tr>{['Issue', 'Priority', 'Status', 'Age', 'Description'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.Issue_ID} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{issue.Issue_ID}</td>
                  <td className="px-4 py-3"><StatusPill value={issue.Priority} /></td>
                  <td className="px-4 py-3">{issue.Status}</td>
                  <td className="px-4 py-3">{issue.Age_Days} days</td>
                  <td className="px-4 py-3">{issue.Description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
