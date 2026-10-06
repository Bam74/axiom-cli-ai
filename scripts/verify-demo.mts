import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import { mapDataset } from '../src/data/loadData.ts'
import { attentionCount, emergingSalesSignal, pipelineCounts, waterPattern, workingLeads } from '../src/data/metrics.ts'
import {
  buildBuyerBrief,
  buildChangeReport,
  buildExecutiveUpdate,
  buildFollowUp,
  buildManagementAnswer,
  buildProjectBrief,
  buildPropertyMatches,
} from '../src/services/ai.ts'

const dir = path.resolve('public/data')

function readCsv(file: string) {
  const parsed = Papa.parse<Record<string, string>>(fs.readFileSync(path.join(dir, file), 'utf8'), {
    header: true,
    skipEmptyLines: 'greedy',
  })
  return parsed.data.filter((row) => Object.values(row).some(Boolean))
}

const data = mapDataset({
  projects: readCsv('projects.csv'),
  weeklyUpdates: readCsv('project_weekly_updates.csv'),
  milestones: readCsv('milestones.csv'),
  issues: readCsv('issues_register.csv'),
  documents: readCsv('project_documents.csv'),
  inventory: readCsv('property_inventory.csv'),
  leads: readCsv('leads.csv'),
  interactions: readCsv('lead_interactions.csv'),
  salesPerformance: readCsv('sales_monthly_performance.csv'),
  lostReasons: readCsv('lost_lead_reasons.csv'),
  faqs: readCsv('approved_faq.csv'),
  operations: readCsv('property_operations.csv'),
  cases: readCsv('customer_cases.csv'),
  finance: readCsv('finance_transactions.csv'),
  scenarioResponse: JSON.parse(fs.readFileSync(path.join(dir, 'demo_scenarios.json'), 'utf8')),
})

const failures: string[] = []
function expect(ok: boolean, message: string) {
  if (!ok) failures.push(message)
}

expect(data.diagnostics.length === 0, `diagnostics: ${data.diagnostics.join('; ')}`)
expect(data.projects.length === 8, 'projects')
expect(data.leads.length === 1842, 'leads')
expect(data.cases.length === 427, 'cases')
expect(attentionCount(data) === 14, 'attention')

const brief = buildProjectBrief(data, 'PRJ-001')
expect(brief.actual === 68 && brief.planned === 71, 'brief progress')
expect(brief.risks.some((risk) => /12 days behind/.test(risk.detail)), 'mep 12')
expect(brief.risks.some((risk) => /14 October 2026/.test(risk.detail) && /3 November 2026/.test(risk.detail)), 'elevator dates')
expect(brief.positive?.includes('18%') ?? false, 'punch list')
expect(brief.sources.length >= 6, 'sources')

const change = buildChangeReport(data, 'PRJ-001')
const changeText = JSON.stringify(change.sections)
expect(changeText.includes('7 days → 12 days'), 'mep change')
expect(changeText.includes('14 October 2026') && changeText.includes('3 November 2026'), 'elevator change')

const update = buildExecutiveUpdate(data, 'PRJ-001')
expect(update.paragraph.includes('AMBER'), 'exec status')
expect(update.paragraph.includes('No immediate budget escalation is required'), 'budget')
expect(/Project Director/.test(update.reviewerRole), 'reviewer')

const matches = buildPropertyMatches(data, 'LEAD-0001')
expect(matches.map((match) => match.unit.Project_Name).join('|') === 'Astra Heights Tower 2|South Coast Residences|Harborview Residences', `matches ${matches.map((match) => match.unit.Project_Name).join('|')}`)
expect(matches[1]?.reasons.some((reason) => /Earlier turnover/.test(reason)) ?? false, 'south coast earlier turnover')
expect(matches[2]?.reasons.some((reason) => /Larger floor area/.test(reason)) ?? false, 'harborview area')
expect(!JSON.stringify(matches).toLowerCase().includes('best'), 'no best label')

const follow = buildFollowUp(data, 'LEAD-0001')
expect(!/discount of|% return|yield/i.test(follow.body), 'no invented returns')
expect(follow.checks.includes('Parking availability'), 'verify checklist')

const water = waterPattern(data)
expect(water.total === 22 && water.focusCount === 17, 'water counts')
expect(water.focusName === 'Central Park Tower', 'central park')
expect(water.floorMin === 11 && water.floorMax === 16, 'floors')
expect(water.multiple.toFixed(1) === '2.4', `multiple ${water.multiple}`)

const management = buildManagementAnswer(data, 'focus')
expect(management.priorities.map((item) => item.category).join('|') === 'PROJECT DELIVERY|SALES PERFORMANCE|CUSTOMER EXPERIENCE', 'priority order')
expect(management.priorities[0]?.title === 'Astra Heights Tower 2', 'priority 1')
expect(management.priorities[1]?.title === 'South Coast Residences', 'priority 2')
expect(management.priorities[1]?.reasons.some((reason) => reason.includes('31%')) ?? false, 'parking share')
expect(management.priorities[2]?.title === 'Central Park Tower', 'priority 3')
expect(management.priorities[1]?.evidenceTo === '/sales/management', 'sales evidence route')
expect(management.priorities[0]?.evidenceTo === '/projects/PRJ-001', 'project evidence route')
expect(!/waterproofing failure|causing the decline|parking caused/i.test(JSON.stringify(management)), 'guardrail')

const board = workingLeads(data)
expect(board.map((item) => item.lead.Lead_ID).join('|') === 'LEAD-0001|LEAD-0002|LEAD-0003', 'working leads')
expect(board[0]?.nextAction === 'Send the requested 2BR shortlist', 'maria next action')
expect(board[1]?.nextAction === 'Answer parking and payment terms', 'john next action')
expect(board[2]?.nextAction === 'Confirm the turnover window', 'carla next action')
expect(board[0]?.lead.Lead_Status === 'Qualified' && board[1]?.lead.Lead_Status === 'Contacted' && board[2]?.lead.Lead_Status === 'Viewing', 'lead stages')

const stages = pipelineCounts(data)
expect(stages.map((stage) => `${stage.status}:${stage.count}`).join('|') === 'New:393|Contacted:381|Qualified:359|Viewing:354|Proposal:355', `stages ${stages.map((stage) => stage.count).join(',')}`)

const sales = emergingSalesSignal(data)
expect(sales?.projectName === 'South Coast Residences', 'sales focus')
expect(sales?.previous?.Inquiries === 250 && sales.current?.Inquiries === 295, 'inquiries')
expect(sales?.previous?.Matured_Lead_Conversion_Rate_Pct === 12.4 && sales.current?.Matured_Lead_Conversion_Rate_Pct === 8.9, 'conversion')
expect(sales?.parkingShare === 31, 'parking share value')

const buyer = buildBuyerBrief(data, 'LEAD-0001')
expect(buyer.reviewerRole === 'Account owner', 'account owner reviews the brief')
expect(buyer.doNotPromise.length === 3, 'do not promise')
expect(buyer.openWith.length > 0, 'open with')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('Demo acceptance checks passed')
