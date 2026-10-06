import { formatLongDate, formatPct, formatPesoMillions, leadName } from '../format.ts'
import {
  agingRfis,
  approvedDocuments,
  cityFits,
  deliverySignal,
  elevatorMilestone,
  emergingSalesSignal,
  findLead,
  findProject,
  interactionsFor,
  issuesFor,
  mepDays,
  milestonesFor,
  noBudgetEscalation,
  projectSnapshot,
  projectSnapshots,
  punchListImprovement,
  rfiCount,
  rfiPhrase,
  suitableInventory,
  themeStats,
  updateText,
  waterPattern,
  type ProjectSnapshot,
  type SalesSignal,
} from '../data/metrics.ts'
import type { Dataset, InventoryUnit, Lead, SourceRef, WeeklyUpdate } from '../types.ts'

export interface GeneratedBase {
  sources: SourceRef[]
  tasks: string[]
  boundary: string
  reviewerRole: string
  reviewerName: string
}

export interface ProjectBrief extends GeneratedBase {
  projectId: string
  status: string
  actual: number
  planned: number
  behind: number
  risks: { title: string; detail: string }[]
  positive: string | null
  milestones: { name: string; when: string; status: string }[]
  attention: string
}

export interface ChangeReport extends GeneratedBase {
  fromLabel: string
  toLabel: string
  sections: { key: 'NEW' | 'WORSENED' | 'IMPROVED' | 'PERSISTING'; items: { title: string; detail: string }[] }[]
}

export interface ExecutiveUpdate extends GeneratedBase {
  paragraph: string
}

export interface BuyerBrief extends GeneratedBase {
  openWith: string
  alreadySaid: string[]
  matters: string[]
  questions: string[]
  talkingPoints: string[]
  doNotPromise: string[]
}

export interface PropertyMatch {
  unit: InventoryUnit
  reasons: string[]
}

export interface FollowUpDraft extends GeneratedBase {
  subject: string
  body: string
  checks: string[]
}

export interface OperationsBrief extends GeneratedBase {
  pattern: string
  evidence: string[]
  investigation: string[]
}

export interface PriorityCard {
  rank: number
  projectId: string
  title: string
  category: string
  status?: string
  reasons: string[]
  question: string
  evidenceTo: string
}

export interface ManagementAnswer extends GeneratedBase {
  question: string
  priorities: PriorityCard[]
  notes: { heading: string; body: string }[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function runStages(stages: string[], onStage: (stage: string) => void) {
  for (const stage of stages) {
    onStage(stage)
    await sleep(380)
  }
}

function documentSources(data: Dataset, projectId: string): SourceRef[] {
  return approvedDocuments(data, projectId).map((document) => ({
    id: document.Document_ID,
    label: document.Title,
    documentId: document.Document_ID,
  }))
}

function weekLabel(update: WeeklyUpdate) {
  const match = update.Update_ID.match(/W(\d+)/i)
  return match ? `Week ${match[1]}` : `Week ending ${formatLongDate(update.Week_Ending)}`
}

export function buildProjectBrief(data: Dataset, projectId: string): ProjectBrief {
  const project = findProject(data, projectId)
  if (!project) throw new Error('Project was not found in the portfolio')
  const snapshot = projectSnapshot(data, project)
  const milestones = milestonesFor(data, projectId)
  const issues = issuesFor(data, projectId)
  const latestText = snapshot.latest ? updateText(snapshot.latest) : ''
  const days = mepDays(latestText)
  const elevator = elevatorMilestone(milestones)
  const rfis = agingRfis(issues)
  const rfiLine = rfiPhrase(latestText)
  const punch = punchListImprovement(latestText)
  const risks: ProjectBrief['risks'] = []
  if (days != null) {
    risks.push({
      title: 'MEP installation',
      detail: `${days} days behind the approved look-ahead schedule.`,
    })
  }
  if (elevator && elevator.Forecast_Date !== elevator.Baseline_Date) {
    risks.push({
      title: 'Elevator delivery',
      detail: `Moved from ${formatLongDate(elevator.Baseline_Date)} to ${formatLongDate(elevator.Forecast_Date)}.`,
    })
  }
  if (rfis.length || rfiLine) {
    risks.push({
      title: 'Aging RFIs',
      detail: rfiLine
        ? `${rfiLine.replace(/\.$/, '')}.`
        : `${rfis.length} RFIs have remained open for more than 14 days.`,
    })
  }
  const upcoming = milestones.filter((milestone) => {
    if (/elevator equipment delivery/i.test(milestone.Milestone_Name)) return false
    if (/readiness/i.test(milestone.Milestone_Name)) return false
    return milestone.Status === 'Upcoming' || milestone.Status === 'At Risk'
  })
  const attentionParts = [snapshot.latest?.Management_Note].filter(Boolean)
  if (rfis.length && snapshot.latest && !/RFI/i.test(snapshot.latest.Management_Note)) {
    attentionParts.push(`Accelerate closure of the ${rfis.length} aging RFIs.`)
  }
  const behind = Math.round((project.Planned_Progress_Pct - project.Actual_Progress_Pct) * 10) / 10
  const issueDetail = issues
    .filter((issue) => issue.Status === 'Open' && (issue.Priority === 'High' || issue.Priority === 'Critical'))
    .map((issue) => `${issue.Issue_ID}: ${issue.Description}`)
    .join('\n')
  return {
    projectId,
    status: snapshot.latest?.Overall_Status ?? project.Overall_Status,
    actual: project.Actual_Progress_Pct,
    planned: project.Planned_Progress_Pct,
    behind,
    risks,
    positive: punch != null ? `Structural punch-list backlog decreased ${punch}% week on week.` : null,
    milestones: upcoming.map((milestone) => ({
      name: milestone.Milestone_Name,
      when: formatLongDate(milestone.Forecast_Date),
      status: milestone.Status,
    })),
    attention: attentionParts.join(' '),
    sources: [
      ...documentSources(data, projectId),
      { id: `issues-${projectId}`, label: 'Issues Register', detail: issueDetail || 'No open high-priority issues.' },
    ],
    tasks: ['Summarize', 'Extract', 'Analyze', 'Draft'],
    boundary: 'Do not infer root causes not supported by source information.',
    reviewerRole: 'Project Director',
    reviewerName: project.Project_Director,
  }
}

export function buildChangeReport(data: Dataset, projectId: string): ChangeReport {
  const project = findProject(data, projectId)
  if (!project) throw new Error('Project was not found in the portfolio')
  const snapshot = projectSnapshot(data, project)
  if (!snapshot.latest || !snapshot.previous) throw new Error('Two weekly updates are required to compare change')
  const previousText = updateText(snapshot.previous)
  const latestText = updateText(snapshot.latest)
  const sections: ChangeReport['sections'] = []
  const previousDays = mepDays(previousText)
  const latestDays = mepDays(latestText)
  const elevator = elevatorMilestone(milestonesFor(data, projectId))
  const moved = /moved from/i.test(latestText) && !/moved from/i.test(previousText)
  if (moved && elevator) {
    sections.push({
      key: 'NEW',
      items: [{
        title: 'Elevator delivery delay introduced.',
        detail: `${formatLongDate(elevator.Baseline_Date)} → ${formatLongDate(elevator.Forecast_Date)}`,
      }],
    })
  }
  if (previousDays != null && latestDays != null && latestDays > previousDays) {
    sections.push({
      key: 'WORSENED',
      items: [{ title: 'MEP variance', detail: `${previousDays} days → ${latestDays} days` }],
    })
  } else if (snapshot.latest.Actual_Progress_Pct - snapshot.latest.Planned_Progress_Pct < snapshot.previous.Actual_Progress_Pct - snapshot.previous.Planned_Progress_Pct) {
    sections.push({
      key: 'WORSENED',
      items: [{
        title: 'Progress versus plan',
        detail: `${formatPct(snapshot.previous.Actual_Progress_Pct)} actual → ${formatPct(snapshot.latest.Actual_Progress_Pct)} actual`,
      }],
    })
  }
  const punch = punchListImprovement(latestText)
  if (punch != null) {
    sections.push({
      key: 'IMPROVED',
      items: [{ title: 'Structural punch-list backlog', detail: `↓ ${punch}%` }],
    })
  }
  const latestRfis = rfiCount(latestText)
  if (latestRfis != null) {
    sections.push({
      key: 'PERSISTING',
      items: [{ title: `${latestRfis} aging RFIs remain unresolved.`, detail: rfiPhrase(latestText) ?? snapshot.latest.Blockers }],
    })
  } else if (snapshot.latest.Blockers && snapshot.previous.Blockers) {
    sections.push({
      key: 'PERSISTING',
      items: [{ title: 'Blocker still open', detail: snapshot.latest.Blockers }],
    })
  }
  const docs = approvedDocuments(data, projectId).filter((document) => /week 37|week 38|weekly/i.test(document.Title))
  return {
    sections,
    sources: docs.map((document) => ({ id: document.Document_ID, label: document.Title, documentId: document.Document_ID })),
    tasks: ['Compare', 'Extract', 'Analyze'],
    boundary: 'Only describe movement that appears in the two weekly updates or the milestone record.',
    reviewerRole: 'Project Director',
    reviewerName: project.Project_Director,
    fromLabel: weekLabel(snapshot.previous),
    toLabel: weekLabel(snapshot.latest),
  }
}

export function buildExecutiveUpdate(data: Dataset, projectId: string): ExecutiveUpdate {
  const brief = buildProjectBrief(data, projectId)
  const project = findProject(data, projectId)!
  const documents = approvedDocuments(data, projectId)
  const budget = noBudgetEscalation(documents)
  const hasMep = brief.risks.some((risk) => /MEP/i.test(risk.title))
  const hasElevator = brief.risks.some((risk) => /elevator/i.test(risk.title))
  const pressure = hasMep && hasElevator
    ? 'Primary schedule pressure comes from MEP installation and the revised elevator delivery date.'
    : brief.risks.length
      ? `Primary schedule pressure comes from ${brief.risks.map((risk) => risk.title).join(' and ')}.`
      : `${project.Project_Name} is ${brief.behind} percentage points ${brief.behind >= 0 ? 'behind' : 'ahead of'} plan.`
  const action = brief.attention
    ? budget
      ? `No immediate budget escalation is required, but alternative sequencing and closure of aging RFIs should be reviewed this week to protect the December milestone.`
      : brief.attention
    : ''
  const useComposedAction = Boolean(budget && hasMep && hasElevator && /December milestone/i.test(brief.attention))
  const paragraph = [
    `${project.Project_Name} remains ${brief.status}.`,
    `Physical completion is ${formatPct(brief.actual)} versus ${formatPct(brief.planned)} planned.`,
    pressure,
    useComposedAction ? action : [budget?.sentence, brief.attention].filter(Boolean).join(' '),
  ].filter(Boolean).join(' ')
  return {
    paragraph,
    sources: brief.sources,
    tasks: ['Summarize', 'Draft'],
    boundary: 'Do not add commitments, approvals, or causes that the sources do not state.',
    reviewerRole: 'Project Director',
    reviewerName: project.Project_Director,
  }
}

function turnoverOrder(value: string) {
  const match = value.match(/Q([1-4])\s*(\d{4})/i)
  if (!match) return Number.POSITIVE_INFINITY
  return Number(match[2]) * 4 + Number(match[1])
}

function matchReasons(lead: Lead, unit: InventoryUnit, matches: InventoryUnit[]) {
  const reasons = ['Within budget', `${unit.Unit_Type} configuration`]
  if (cityFits(lead.City_Preference, unit.City)) reasons.push(`Preferred ${lead.City_Preference} location`)
  if (unit.Parking_Available) reasons.push('Parking option available')
  const largest = Math.max(...matches.map((item) => item.Floor_Area_sqm))
  if (unit.Floor_Area_sqm === largest && matches.filter((item) => item.Floor_Area_sqm === largest).length === 1) {
    reasons.push('Larger floor area')
  }
  const earliest = Math.min(...matches.map((item) => turnoverOrder(item.Turnover_Window)))
  const earliestCount = matches.filter((item) => turnoverOrder(item.Turnover_Window) === earliest).length
  if (matches.length > 1 && earliestCount === 1 && turnoverOrder(unit.Turnover_Window) === earliest) {
    reasons.push('Earlier turnover window among these matches')
  }
  if (/vacation/i.test(unit.Rental_Profile)) reasons.push('Suitable investor / vacation profile')
  return reasons
}

export function buildPropertyMatches(data: Dataset, leadId: string): PropertyMatch[] {
  const lead = findLead(data, leadId)
  if (!lead) throw new Error('Lead was not found')
  const units = suitableInventory(data, lead)
  return units.map((unit) => ({ unit, reasons: matchReasons(lead, unit, units) }))
}

export function buildBuyerBrief(data: Dataset, leadId: string): BuyerBrief {
  const lead = findLead(data, leadId)
  if (!lead) throw new Error('Lead was not found')
  const interactions = interactionsFor(data, leadId)
  const matters: string[] = []
  if (/invest/i.test(lead.Purpose)) matters.push('Investment suitability')
  if (lead.Parking_Concern) matters.push('Parking availability')
  if (lead.Turnover_Concern) matters.push('Turnover timing')
  if (lead.Rental_Concern) matters.push('Rental attractiveness')
  if (/residence|end user|family/i.test(`${lead.Purpose} ${lead.Buyer_Type}`) && !matters.includes('Investment suitability')) {
    matters.push('Fit as a home')
  }
  const questions: string[] = []
  if (lead.Parking_Concern) questions.push(`Is the ${formatPesoMillions(lead.Budget_Max_PHP_M)} budget inclusive of parking?`)
  if (lead.Turnover_Concern) questions.push('How important is earlier turnover versus larger floor area?')
  if (lead.Rental_Concern && /invest/i.test(lead.Purpose)) {
    questions.push('Is rental income the primary objective or capital appreciation?')
  }
  const faqs = data.faqs.filter((faq) => faq.Project_ID === lead.Primary_Project_ID && /parking|turnover|inventory|property facts/i.test(faq.Category))
  const talkingPoints = [
    `Budget discussed: ${formatPesoMillions(lead.Budget_Min_PHP_M)}–${formatPesoMillions(lead.Budget_Max_PHP_M)}, ${lead.Unit_Preference}, ${lead.City_Preference}, purpose ${lead.Purpose}.`,
    ...faqs.slice(0, 3).map((faq) => faq.Approved_Answer),
  ]
  const latest = interactions.at(-1)
  return {
    openWith: latest?.Interaction_Text ?? lead.Needs_Summary,
    alreadySaid: interactions.slice(0, -1).map((item) => item.Interaction_Text),
    matters,
    questions,
    talkingPoints,
    doNotPromise: [
      'Do not quote a discount, incentive, or financial return.',
      'Do not promise that a unit is available until inventory is reconfirmed.',
      'Quote turnover only from the approved inventory record.',
    ],
    sources: [
      {
        id: `lead-${lead.Lead_ID}`,
        label: 'Lead profile',
        detail: `${leadName(lead)}\n${lead.Needs_Summary}`,
      },
      {
        id: `interactions-${lead.Lead_ID}`,
        label: 'Lead Interaction History',
        detail: interactions.map((item) => `${formatLongDate(item.Interaction_Date)} · ${item.Channel}\n${item.Interaction_Text}`).join('\n\n'),
      },
      ...faqs.map((faq) => ({
        id: faq.FAQ_ID,
        label: `Approved FAQ · ${faq.Category}`,
        detail: `${faq.Question}\n\n${faq.Approved_Answer}`,
      })),
    ],
    tasks: ['Extract', 'Analyze'],
    boundary: 'Use the buyer record and approved answers. Do not invent preferences that are not in the interactions.',
    reviewerRole: 'Account owner',
    reviewerName: interactions.at(-1)?.Agent ?? 'Sales team',
  }
}

export function buildFollowUp(data: Dataset, leadId: string): FollowUpDraft {
  const lead = findLead(data, leadId)
  if (!lead) throw new Error('Lead was not found')
  const matches = buildPropertyMatches(data, leadId)
  const interactions = interactionsFor(data, leadId)
  const lines = matches.map((match) => {
    const unit = match.unit
    const parking = unit.Parking_Available ? 'Parking available' : 'Parking not listed as available'
    return `${unit.Project_Name} — ${unit.Unit_Type}, ${unit.Floor_Area_sqm} sqm, ${formatPesoMillions(unit.List_Price_PHP_M)}. ${parking}. Approved turnover window: ${unit.Turnover_Window}. Available units on record: ${unit.Available_Units}.`
  })
  const body = [
    `Dear ${leadName(lead)},`,
    '',
    `Thank you for the earlier conversation. You are looking at a ${lead.Unit_Preference} in ${lead.City_Preference}, with a budget of ${formatPesoMillions(lead.Budget_Min_PHP_M)}–${formatPesoMillions(lead.Budget_Max_PHP_M)}, for ${lead.Purpose.toLowerCase()}.`,
    '',
    matches.length
      ? 'From the current approved inventory, these options match that brief:'
      : 'The current approved inventory does not show a unit that meets every stated preference. I will confirm before suggesting alternatives.',
    '',
    ...lines.flatMap((line) => [line, '']),
    'I have not included any discount or expected financial return. Price, availability, parking, and turnover should be reconfirmed before this note is sent or any commitment is made.',
    '',
    'Regards,',
    interactions.at(-1)?.Agent ?? 'Sales team',
  ].join('\n')
  const faqs = data.faqs.filter((faq) => matches.some((match) => match.unit.Project_ID === faq.Project_ID) && /inventory|parking|turnover/i.test(faq.Category))
  return {
    subject: `${lead.Unit_Preference} options for your ${lead.City_Preference} search`,
    body,
    checks: ['Price', 'Inventory', 'Parking availability', 'Turnover information'],
    sources: [
      {
        id: `inventory-${leadId}`,
        label: 'Property Inventory',
        detail: matches.map((match) => `${match.unit.Inventory_ID} ${match.unit.Project_Name} ${match.unit.Unit_Type} ${match.unit.List_Price_PHP_M}`).join('\n') || 'No matching inventory rows.',
      },
      {
        id: `faq-${leadId}`,
        label: 'Approved FAQ',
        detail: faqs.map((faq) => `${faq.Question}\n${faq.Approved_Answer}`).join('\n\n') || 'No related FAQ rows.',
      },
      {
        id: `history-${leadId}`,
        label: 'Lead Interaction History',
        detail: interactions.map((item) => item.Interaction_Text).join('\n\n'),
      },
    ],
    tasks: ['Find', 'Draft'],
    boundary: 'Do not invent discounts, returns, or availability beyond the inventory record.',
    reviewerRole: 'Account owner',
    reviewerName: interactions.at(-1)?.Agent ?? 'Sales team',
  }
}

export function buildOperationsBrief(data: Dataset): OperationsBrief {
  const pattern = waterPattern(data)
  const occupied = data.operations.find((row) => row.Project_ID === pattern.focusProjectId)
  const multiple = pattern.multiple.toFixed(1)
  return {
    pattern: `Water-related cases are disproportionately concentrated at ${pattern.focusName}.`,
    evidence: [
      `${pattern.focusCount} cases at ${pattern.focusName}.`,
      `${pattern.focusCount} are located between Floors ${pattern.floorMin}–${pattern.floorMax}.`,
      `The project's occupied-unit complaint rate is approximately ${multiple}× the portfolio rate.`,
    ],
    investigation: [
      'Review waterproofing inspection records.',
      'Compare affected unit locations.',
      'Review contractor rectification history.',
      'Determine whether cases share a common work package or installation batch.',
    ],
    sources: [
      {
        id: 'water-cases',
        label: 'Customer Cases',
        detail: pattern.cases.map((item) => `${item.Case_ID} · Floor ${item.Floor} · ${item.Subcategory} · ${item.Created_Date} · ${item.Status}`).join('\n'),
      },
      {
        id: 'operations',
        label: 'Property Operations',
        detail: `Occupied units at ${pattern.focusName}: ${occupied?.Occupied_Units ?? 0}. Portfolio occupied units: ${pattern.occupiedPortfolio}.`,
      },
    ],
    tasks: ['Classify', 'Analyze'],
    boundary: 'These are investigation questions, not confirmed causes. The pattern does not establish root cause.',
    reviewerRole: 'Property Operations',
    reviewerName: occupied?.Property_Manager ?? 'Property operations',
  }
}

function deliveryPriority(data: Dataset, snapshot: ProjectSnapshot, rank: number): PriorityCard {
  const previous = snapshot.previous ? mepDays(updateText(snapshot.previous)) : null
  const latest = snapshot.latest ? mepDays(updateText(snapshot.latest)) : null
  const elevator = elevatorMilestone(milestonesFor(data, snapshot.project.Project_ID))
  const rfis = rfiCount(snapshot.latest ? updateText(snapshot.latest) : '')
  const reasons = [
    `${formatPct(snapshot.project.Actual_Progress_Pct)} actual vs ${formatPct(snapshot.project.Planned_Progress_Pct)} planned.`,
  ]
  if (previous != null && latest != null) reasons.push(`MEP delay increased: ${previous} → ${latest} days.`)
  if (elevator && elevator.Baseline_Date !== elevator.Forecast_Date) {
    reasons.push(`Elevator delivery moved: ${formatLongDate(elevator.Baseline_Date)} → ${formatLongDate(elevator.Forecast_Date)}.`)
  }
  if (rfis) reasons.push(`${rfis} aging RFIs remain unresolved.`)
  const december = /December milestone/i.test(snapshot.latest?.Management_Note ?? '')
  return {
    rank,
    projectId: snapshot.project.Project_ID,
    title: snapshot.project.Project_Name,
    category: 'PROJECT DELIVERY',
    status: snapshot.project.Overall_Status,
    reasons,
    question: december
      ? 'Can alternative sequencing and faster RFI closure protect the December milestone?'
      : `What should be reviewed while the schedule status is ${snapshot.scheduleStatus}?`,
    evidenceTo: `/projects/${snapshot.project.Project_ID}`,
  }
}

function salesPriority(signal: SalesSignal, rank: number): PriorityCard {
  const previous = signal.previous!
  const current = signal.current!
  const change = Math.round((signal.inquiryChange ?? 0) * 100)
  return {
    rank,
    projectId: signal.projectId,
    title: signal.projectName,
    category: 'SALES PERFORMANCE',
    reasons: [
      `Inquiry volume: ${previous.Inquiries} → ${current.Inquiries}, approximately ${change >= 0 ? '+' : ''}${change}%.`,
      `Matured-lead conversion: ${formatPct(previous.Matured_Lead_Conversion_Rate_Pct)} → ${formatPct(current.Matured_Lead_Conversion_Rate_Pct)}.`,
      signal.parkingShare != null ? `Parking accounts for ${signal.parkingShare}% of ${current.Month} lost-lead reasons.` : 'Lost-lead reasons are available for the latest month.',
    ],
    question: 'Is parking availability, communication, or another factor contributing to lower conversion?',
    evidenceTo: '/sales/management',
  }
}

export function buildManagementAnswer(data: Dataset, questionId: string): ManagementAnswer {
  const delivery = deliverySignal(data)
  const sales = emergingSalesSignal(data)
  const water = waterPattern(data)
  const sources: SourceRef[] = [
    { id: 'mgmt-projects', label: 'Project weekly updates', detail: 'Progress, schedule status, and weekly narrative.' },
    { id: 'mgmt-sales', label: 'Sales performance and lost-lead reasons', detail: 'Inquiry, conversion, and reason mix.' },
    { id: 'mgmt-cases', label: 'Customer cases and occupied units', detail: 'Theme counts and water-related concentration.' },
  ]
  const base = {
    sources,
    tasks: ['Analyze', 'Summarize'],
    boundary: 'AI surfaces signals for judgment. It does not make the management decision or assign a cause.',
    reviewerRole: 'Executive team',
    reviewerName: 'Accountable managers',
  }
  if (questionId === 'focus') {
    const priorities: PriorityCard[] = []
    if (delivery) priorities.push(deliveryPriority(data, delivery, priorities.length + 1))
    if (sales?.previous && sales.current) priorities.push(salesPriority(sales, priorities.length + 1))
    priorities.push({
      rank: priorities.length + 1,
      projectId: water.focusProjectId,
      title: water.focusName,
      category: 'CUSTOMER EXPERIENCE',
      reasons: [
        `${water.focusCount} of ${water.total} portfolio water-related cases.`,
        `All ${water.focusCount} concentrated on Floors ${water.floorMin}–${water.floorMax}.`,
        `Approximate case rate: ${water.multiple.toFixed(1)}× portfolio level.`,
      ],
      question: 'Is there a common technical, location, contractor, or work-package factor that warrants investigation?',
      evidenceTo: '/customer/water',
    })
    return {
      ...base,
      question: 'Where should management focus this week?',
      priorities,
      notes: [],
    }
  }
  if (questionId === 'risk') {
    const risky = projectSnapshots(data).filter((snapshot) =>
      snapshot.project.Overall_Status !== 'GREEN' || snapshot.scheduleStatus === 'Behind' || snapshot.scheduleStatus === 'Watch',
    )
    return {
      ...base,
      question: 'Which projects show emerging risk?',
      priorities: risky.map((snapshot, index) => deliveryPriority(data, snapshot, index + 1)),
      notes: risky.length ? [] : [{ heading: 'Portfolio', body: 'No project is currently behind plan or outside green status.' }],
    }
  }
  if (questionId === 'cx') {
    const rising = themeStats(data).filter((theme) => theme.direction === 'up')
    return {
      ...base,
      question: 'What customer issues are increasing?',
      priorities: [],
      notes: rising.map((theme) => ({
        heading: theme.theme,
        body: `${theme.previous} in the previous 30 days → ${theme.current} in the current 30 days (${theme.total} total).`,
      })),
    }
  }
  const signal = sales
  return {
    ...base,
    question: 'Where are sales opportunities being lost?',
    priorities: signal?.previous && signal.current ? [salesPriority(signal, 1)] : [],
    notes: signal
      ? [{
          heading: 'How to read this',
          body: 'The lost-reason mix shows an association worth investigating. It does not show that parking is causing the conversion change.',
        }]
      : [],
  }
}

export const MANAGEMENT_QUESTIONS = [
  { id: 'focus', text: 'Where should management focus this week?' },
  { id: 'risk', text: 'Which projects show emerging risk?' },
  { id: 'cx', text: 'What customer issues are increasing?' },
  { id: 'sales', text: 'Where are sales opportunities being lost?' },
]
