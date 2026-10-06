import type {
  CustomerCase,
  Dataset,
  InventoryUnit,
  Issue,
  Lead,
  LostReason,
  Milestone,
  Project,
  ProjectDocument,
  SalesMonth,
  WeeklyUpdate,
} from '../types.ts'

export const PREVIOUS_WINDOW = { start: '2026-08-08', end: '2026-09-06' }
export const CURRENT_WINDOW = { start: '2026-09-07', end: '2026-10-06' }
export const FEATURED_LEAD_IDS = ['LEAD-0001', 'LEAD-0002', 'LEAD-0003']

export interface ProjectSnapshot {
  project: Project
  latest?: WeeklyUpdate
  previous?: WeeklyUpdate
  openIssues: number
  highOpenIssues: number
  scheduleStatus: string
  budgetStatus: string
}

export interface ThemeStat {
  theme: string
  previous: number
  current: number
  total: number
  direction: 'up' | 'down' | 'flat'
}

export interface WaterPattern {
  total: number
  byProject: { projectId: string; name: string; count: number }[]
  focusProjectId: string
  focusName: string
  focusCount: number
  floorMin: number
  floorMax: number
  focusRate: number
  portfolioRate: number
  multiple: number
  occupiedFocus: number
  occupiedPortfolio: number
  cases: CustomerCase[]
}

export interface SalesSignal {
  projectId: string
  projectName: string
  previous?: SalesMonth
  current?: SalesMonth
  inquiryChange: number | null
  parkingShare: number | null
  currentReasons: LostReason[]
}

export function updatesFor(data: Dataset, projectId: string) {
  return data.weeklyUpdates
    .filter((update) => update.Project_ID === projectId)
    .sort((a, b) => a.Week_Ending.localeCompare(b.Week_Ending))
}

export function projectSnapshot(data: Dataset, project: Project): ProjectSnapshot {
  const updates = updatesFor(data, project.Project_ID)
  const latest = updates.at(-1)
  const previous = updates.length > 1 ? updates.at(-2) : undefined
  const open = data.issues.filter((issue) => issue.Project_ID === project.Project_ID && issue.Status === 'Open')
  return {
    project,
    latest,
    previous,
    openIssues: open.length,
    highOpenIssues: open.filter((issue) => issue.Priority === 'High' || issue.Priority === 'Critical').length,
    scheduleStatus: latest?.Schedule_Status ?? project.Overall_Status,
    budgetStatus: latest?.Budget_Status ?? 'Not reported',
  }
}

export function projectSnapshots(data: Dataset) {
  return data.projects.map((project) => projectSnapshot(data, project))
}

export function attentionCount(data: Dataset) {
  return data.issues.filter(
    (issue) => issue.Status === 'Open' && (issue.Priority === 'High' || issue.Priority === 'Critical'),
  ).length
}

export function approvedDocuments(data: Dataset, projectId: string) {
  return data.documents
    .filter((document) => document.Project_ID === projectId && document.Approved_For_Demo_Use)
    .sort((a, b) => a.Document_ID.localeCompare(b.Document_ID))
}

export function issuesFor(data: Dataset, projectId: string) {
  return data.issues
    .filter((issue) => issue.Project_ID === projectId)
    .sort((a, b) => b.Age_Days - a.Age_Days)
}

export function milestonesFor(data: Dataset, projectId: string) {
  return data.milestones
    .filter((milestone) => milestone.Project_ID === projectId)
    .sort((a, b) => a.Forecast_Date.localeCompare(b.Forecast_Date))
}

export function findProject(data: Dataset, projectId: string) {
  return data.projects.find((project) => project.Project_ID === projectId)
}

export function findLead(data: Dataset, leadId: string) {
  return data.leads.find((lead) => lead.Lead_ID === leadId)
}

export function interactionsFor(data: Dataset, leadId: string) {
  return data.interactions
    .filter((interaction) => interaction.Lead_ID === leadId)
    .sort((a, b) => a.Interaction_Date.localeCompare(b.Interaction_Date))
}

export function updateText(update: WeeklyUpdate) {
  return [update.Top_Update_1, update.Top_Update_2, update.Top_Update_3, update.Blockers, update.Management_Note]
    .filter(Boolean)
    .join('\n')
}

export function mepDays(text: string) {
  const match = text.match(/(\d+)\s+days?\s+behind/i)
  return match ? Number(match[1]) : null
}

export function punchListImprovement(text: string) {
  const match = text.match(/punch-list backlog decreased by (\d+)%/i)
  return match ? Number(match[1]) : null
}

export function rfiPhrase(text: string) {
  const match = text.match(/((?:one|two|three|four|\d+)\s+RFIs?\s+have\s+(?:been|remained)\s+open[^.]+)/i)
  return match ? match[1] : null
}

export function rfiCount(text: string) {
  const match = text.match(/(one|two|three|four|\d+)\s+RFIs?/i)
  if (!match) return null
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
  return words[match[1].toLowerCase()] ?? Number(match[1])
}

export function elevatorMilestone(milestones: Milestone[]) {
  return milestones.find((milestone) => /elevator/i.test(milestone.Milestone_Name))
}

export function deliverySignal(data: Dataset): ProjectSnapshot | undefined {
  return projectSnapshots(data)
    .filter((snapshot) => snapshot.project.Overall_Status === 'AMBER' || snapshot.scheduleStatus === 'Behind')
    .sort((a, b) => {
      const gap = (item: ProjectSnapshot) => item.project.Planned_Progress_Pct - item.project.Actual_Progress_Pct
      return gap(b) - gap(a)
    })[0]
}

function inWindow(date: string, start: string, end: string) {
  return date >= start && date <= end
}

export function themeStats(data: Dataset): ThemeStat[] {
  const themes = [...new Set(data.cases.map((item) => item.Theme).filter(Boolean))]
  return themes
    .map((theme) => {
      const rows = data.cases.filter((item) => item.Theme === theme)
      const previous = rows.filter((item) => inWindow(item.Created_Date, PREVIOUS_WINDOW.start, PREVIOUS_WINDOW.end)).length
      const current = rows.filter((item) => inWindow(item.Created_Date, CURRENT_WINDOW.start, CURRENT_WINDOW.end)).length
      const change = previous === 0 ? (current === 0 ? 0 : 1) : current / previous - 1
      const direction: ThemeStat['direction'] = Math.abs(change) < 0.05 ? 'flat' : change > 0 ? 'up' : 'down'
      return { theme, previous, current, total: previous + current, direction }
    })
    .sort((a, b) => b.total - a.total)
}

export function subcategoryCounts(cases: CustomerCase[]) {
  const counts = new Map<string, number>()
  for (const item of cases) counts.set(item.Subcategory, (counts.get(item.Subcategory) ?? 0) + 1)
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export interface ProjectContribution {
  projectId: string
  projectName: string
  total: number
  previous: number
  current: number
}

export function projectContributions(cases: CustomerCase[]): ProjectContribution[] {
  const counts = new Map<string, ProjectContribution>()
  for (const item of cases) {
    const row = counts.get(item.Project_ID) ?? {
      projectId: item.Project_ID,
      projectName: item.Project_Name,
      total: 0,
      previous: 0,
      current: 0,
    }
    row.total += 1
    if (inWindow(item.Created_Date, PREVIOUS_WINDOW.start, PREVIOUS_WINDOW.end)) row.previous += 1
    if (inWindow(item.Created_Date, CURRENT_WINDOW.start, CURRENT_WINDOW.end)) row.current += 1
    counts.set(item.Project_ID, row)
  }
  return [...counts.values()].sort((a, b) => b.total - a.total || a.projectName.localeCompare(b.projectName))
}

function movement(row: ProjectContribution) {
  return row.current - row.previous
}

export function themeRecommendation(theme: string, cases: CustomerCase[], direction: ThemeStat['direction']) {
  const projects = projectContributions(cases)
  const top = projects[0]
  if (!top) return 'No cases are available for a recommendation.'
  const tiedLeaders = projects.filter((row) => row.total === top.total)
  const growers = [...projects].filter((row) => movement(row) > 0).sort((a, b) => movement(b) - movement(a) || a.projectName.localeCompare(b.projectName))
  const leadGrowth = growers[0]
  const tiedGrowth = leadGrowth ? growers.filter((row) => movement(row) === movement(leadGrowth)) : []
  const leaderLabel = tiedLeaders.length > 1
    ? `${tiedLeaders.map((row) => row.projectName).join(' and ')} each hold ${top.total} of ${cases.length} cases`
    : `${top.projectName} holds ${top.total} of ${cases.length} cases`
  const growthLabel = tiedGrowth.length > 1
    ? `${tiedGrowth.map((row) => `${row.projectName} (${row.previous} → ${row.current})`).join(' and ')}`
    : leadGrowth
      ? `${leadGrowth.projectName} (${leadGrowth.previous} → ${leadGrowth.current})`
      : ''

  if (theme === 'Unit Defects') {
    return `${leaderLabel}. Open the water-related cases at ${top.projectName} and prepare an investigation from the case file.`
  }
  if (theme === 'Parking') {
    const growth = growthLabel ? ` This window added the most at ${growthLabel}.` : ''
    return `${leaderLabel}.${growth} Review those parking cases together with the sales lost-lead file.`
  }
  if (direction === 'up' && leadGrowth) {
    const samePlace = tiedGrowth.length === 1 && leadGrowth.projectId === top.projectId && tiedLeaders.length === 1
    if (samePlace) {
      return `Start with ${top.projectName}. It holds ${top.total} of ${cases.length} cases and added the most this window, ${leadGrowth.previous} → ${leadGrowth.current}.`
    }
    return `${leaderLabel}. This window grew most at ${growthLabel}. ${tiedGrowth.length > 1 ? 'Start with those properties.' : 'Start the review there.'}`
  }
  if (direction === 'down') {
    return `${leaderLabel}. Volume fell, and this share is still the place to review.`
  }
  const share = cases.length ? top.total / cases.length : 0
  if (share < 0.22) {
    const growth = leadGrowth ? ` The largest increase this window is ${growthLabel}.` : ''
    return `Cases are spread across the portfolio. ${leaderLabel}.${growth} Review the largest subcategory before focusing on one property.`
  }
  return `Start with ${tiedLeaders.length > 1 ? 'these properties' : top.projectName}. ${leaderLabel}.`
}

const CUSTOMER_FIRST_NAMES = [
  'Elena', 'Marco', 'Bianca', 'Paolo', 'Rachel', 'Nathan', 'Isabel', 'Luis', 'Carmen', 'Andres',
  'Teresa', 'Miguel', 'Rosa', 'Javier', 'Lucia', 'Ramon', 'Patricia', 'Emilio', 'Clara', 'Hector',
  'Nina', 'Oscar', 'Beatriz', 'Felipe', 'Diana', 'Cesar', 'Lorna', 'Victor', 'Grace', 'Antonio',
  'Melissa', 'Ricardo', 'Joyce', 'Eduardo', 'Camille', 'Fernando', 'Alyssa', 'Inigo', 'Marisol', 'Mateo',
]

const CUSTOMER_LAST_NAMES = [
  'Bautista', 'Gonzales', 'Ramos', 'Torres', 'Flores', 'Castillo', 'Navarro', 'Aquino', 'Domingo', 'Fernandez',
  'Gutierrez', 'Hernandez', 'Morales', 'Pascual', 'Ramirez', 'Salazar', 'Valdez', 'Santiago', 'De Leon', 'Cabrera',
  'Del Rosario', 'Evangelista', 'Francisco', 'Ignacio', 'Jimenez', 'Lopez', 'Marquez', 'Nunez', 'Ortega', 'Pineda',
  'Quiambao', 'Rivera', 'Sarmiento', 'Tolentino', 'Umali', 'Vergara', 'Yap', 'Zamora', 'Abad', 'Bernardo',
]

export interface CustomerRecord {
  id: string
  firstName: string
  lastName: string
  customerType: string
  projectId: string
  projectName: string
  floor: string
  cases: CustomerCase[]
}

function chunkCases(cases: CustomerCase[], size: number) {
  const packs: CustomerCase[][] = []
  for (let index = 0; index < cases.length; index += size) packs.push(cases.slice(index, index + size))
  return packs
}

function customerName(index: number, taken: Set<string>, used: Set<string>) {
  const total = CUSTOMER_FIRST_NAMES.length * CUSTOMER_LAST_NAMES.length
  for (let step = 0; step < total; step += 1) {
    const slot = (index + step) % total
    const firstName = CUSTOMER_FIRST_NAMES[slot % CUSTOMER_FIRST_NAMES.length]
    const lastName = CUSTOMER_LAST_NAMES[Math.floor(slot / CUSTOMER_FIRST_NAMES.length) % CUSTOMER_LAST_NAMES.length]
    const full = `${firstName} ${lastName}`.toLowerCase()
    if (taken.has(full) || used.has(full)) continue
    used.add(full)
    return { firstName, lastName }
  }
  return { firstName: 'Customer', lastName: String(index + 1) }
}

export function customerDirectory(data: Dataset): CustomerRecord[] {
  const taken = new Set(data.leads.map((lead) => `${lead.First_Name} ${lead.Last_Name}`.toLowerCase()))
  const groups = new Map<string, CustomerCase[]>()
  for (const item of data.cases) {
    const floor = item.Floor.trim()
    const key = `${item.Project_ID}|${item.Customer_Type}|${floor || 'none'}`
    const list = groups.get(key) ?? []
    list.push(item)
    groups.set(key, list)
  }
  const packs = [...groups.values()].flatMap((cases) => chunkCases([...cases].sort((a, b) => a.Case_ID.localeCompare(b.Case_ID)), 3))
  packs.sort((a, b) => a[0].Case_ID.localeCompare(b[0].Case_ID))
  const used = new Set<string>()
  return packs.map((cases, index) => {
    const name = customerName(index, taken, used)
    const first = cases[0]
    return {
      id: `CUS-${String(index + 1).padStart(4, '0')}`,
      firstName: name.firstName,
      lastName: name.lastName,
      customerType: first.Customer_Type,
      projectId: first.Project_ID,
      projectName: first.Project_Name,
      floor: first.Floor.trim(),
      cases: [...cases].sort((a, b) => b.Created_Date.localeCompare(a.Created_Date) || a.Case_ID.localeCompare(b.Case_ID)),
    }
  })
}

export function customersForThemeProject(data: Dataset, theme: string, projectId: string) {
  return customerDirectory(data)
    .filter((customer) => customer.projectId === projectId && customer.cases.some((item) => item.Theme === theme))
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
}

export function findCustomer(data: Dataset, customerId: string) {
  return customerDirectory(data).find((customer) => customer.id === customerId)
}

export function themeFocus(cases: CustomerCase[]) {
  const projects = new Map<string, number>()
  for (const item of cases) projects.set(item.Project_Name, (projects.get(item.Project_Name) ?? 0) + 1)
  const project = [...projects.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const subcategory = subcategoryCounts(cases)[0]
  return {
    projectName: project?.[0] ?? '',
    projectCount: project?.[1] ?? 0,
    subcategory: subcategory?.name ?? '',
    subcategoryCount: subcategory?.count ?? 0,
  }
}

export function isWaterCase(item: CustomerCase) {
  return /water|seepage|moisture/i.test(item.Subcategory)
}

export function waterPattern(data: Dataset): WaterPattern {
  const water = data.cases.filter(isWaterCase)
  const counts = new Map<string, { name: string; count: number }>()
  for (const item of water) {
    const current = counts.get(item.Project_ID) ?? { name: item.Project_Name, count: 0 }
    current.count += 1
    counts.set(item.Project_ID, current)
  }
  const byProject = [...counts.entries()]
    .map(([projectId, value]) => ({ projectId, name: value.name, count: value.count }))
    .sort((a, b) => b.count - a.count)
  const focus = byProject[0]
  const focusCases = water.filter((item) => item.Project_ID === focus?.projectId)
  const floors = focusCases.map((item) => Number(item.Floor)).filter((floor) => Number.isFinite(floor))
  const occupiedPortfolio = data.operations.reduce((sum, row) => sum + row.Occupied_Units, 0)
  const occupiedFocus = data.operations.find((row) => row.Project_ID === focus?.projectId)?.Occupied_Units ?? 0
  const focusRate = occupiedFocus ? (focus?.count ?? 0) / occupiedFocus : 0
  const portfolioRate = occupiedPortfolio ? water.length / occupiedPortfolio : 0
  return {
    total: water.length,
    byProject,
    focusProjectId: focus?.projectId ?? '',
    focusName: focus?.name ?? '',
    focusCount: focus?.count ?? 0,
    floorMin: floors.length ? Math.min(...floors) : 0,
    floorMax: floors.length ? Math.max(...floors) : 0,
    focusRate,
    portfolioRate,
    multiple: portfolioRate ? focusRate / portfolioRate : 0,
    occupiedFocus,
    occupiedPortfolio,
    cases: focusCases.sort((a, b) => Number(a.Floor) - Number(b.Floor) || a.Case_ID.localeCompare(b.Case_ID)),
  }
}

export function salesHistory(data: Dataset, projectId: string) {
  return data.salesPerformance
    .filter((row) => row.Project_ID === projectId)
    .sort((a, b) => a.Month.localeCompare(b.Month))
}

export function salesSignalFor(data: Dataset, projectId: string): SalesSignal | undefined {
  const rows = salesHistory(data, projectId)
  if (!rows.length) return undefined
  const current = rows.at(-1)
  const previous = rows.length > 1 ? rows.at(-2) : undefined
  const inquiryChange = previous && current && previous.Inquiries ? current.Inquiries / previous.Inquiries - 1 : null
  const reasons = data.lostReasons.filter((reason) => reason.Project_ID === projectId && reason.Month === current?.Month)
  const parking = reasons.find((reason) => /parking/i.test(reason.Reason))
  return {
    projectId,
    projectName: current?.Project_Name ?? previous?.Project_Name ?? '',
    previous,
    current,
    inquiryChange,
    parkingShare: parking ? parking.Share_of_Lost_Leads_Pct : null,
    currentReasons: reasons.sort((a, b) => b.Share_of_Lost_Leads_Pct - a.Share_of_Lost_Leads_Pct),
  }
}

export function emergingSalesSignal(data: Dataset) {
  const signals = data.projects
    .map((project) => salesSignalFor(data, project.Project_ID))
    .filter((signal): signal is SalesSignal => Boolean(signal?.previous && signal.current))
  return signals.sort((a, b) => {
    const drop = (signal: SalesSignal) =>
      (signal.previous?.Matured_Lead_Conversion_Rate_Pct ?? 0) - (signal.current?.Matured_Lead_Conversion_Rate_Pct ?? 0)
    const growth = (signal: SalesSignal) => signal.inquiryChange ?? 0
    return drop(b) - drop(a) || growth(b) - growth(a)
  })[0]
}

export function cityFits(preference: string, city: string) {
  const pref = preference.toLowerCase()
  const value = city.toLowerCase()
  if (pref === 'cebu' || pref.includes('cebu')) return /cebu|mandaue|lapu-lapu/.test(value)
  return value.includes(pref)
}

export function suitableInventory(data: Dataset, lead: Lead) {
  return data.inventory.filter((unit) => {
    if (unit.Inventory_Status !== 'Available') return false
    if (unit.Unit_Type !== lead.Unit_Preference) return false
    if (unit.List_Price_PHP_M < lead.Budget_Min_PHP_M || unit.List_Price_PHP_M > lead.Budget_Max_PHP_M) return false
    if (lead.Parking_Concern && !unit.Parking_Available) return false
    if (lead.City_Preference && !cityFits(lead.City_Preference, unit.City)) return false
    return true
  })
}

export const STAGE_ORDER = ['New', 'Contacted', 'Qualified', 'Viewing', 'Proposal']

export function pipelineCounts(data: Dataset) {
  const counts = new Map<string, number>()
  for (const lead of data.leads) counts.set(lead.Lead_Status, (counts.get(lead.Lead_Status) ?? 0) + 1)
  const known = STAGE_ORDER.map((status) => ({ status, count: counts.get(status) ?? 0 }))
  const extra = [...counts.entries()]
    .filter(([status]) => !STAGE_ORDER.includes(status))
    .map(([status, count]) => ({ status, count }))
  return [...known, ...extra]
}

export interface WorkingLead {
  lead: Lead
  owner: string
  lastChannel: string
  lastDate: string
  lastRequest: string
  nextAction: string
}

function nextActionFrom(text: string) {
  if (/shortlist/i.test(text)) return 'Send the requested 2BR shortlist'
  if (/payment terms/i.test(text)) return 'Answer parking and payment terms'
  if (/turnover window/i.test(text)) return 'Confirm the turnover window'
  return 'Review the latest interaction and prepare the next step'
}

export function workingLeads(data: Dataset): WorkingLead[] {
  return FEATURED_LEAD_IDS.flatMap((id) => {
    const lead = findLead(data, id)
    if (!lead) return []
    const history = interactionsFor(data, id)
    const latest = history.at(-1)
    const text = latest?.Interaction_Text ?? lead.Needs_Summary
    return [{
      lead,
      owner: latest?.Agent ?? 'Unassigned',
      lastChannel: latest?.Channel ?? lead.Source,
      lastDate: latest?.Interaction_Date ?? lead.Last_Interaction_Date,
      lastRequest: text,
      nextAction: nextActionFrom(text),
    }]
  })
}

export function agingRfis(issues: Issue[]) {
  return issues.filter((issue) => issue.Category === 'RFI' && issue.Status === 'Open' && issue.Age_Days > 14)
}

export function budgetDocument(documents: ProjectDocument[]) {
  return documents.find((document) => /budget/i.test(document.Document_Type) || /budget/i.test(document.Title))
}

export function noBudgetEscalation(documents: ProjectDocument[]) {
  const document = budgetDocument(documents)
  if (!document) return null
  const match = document.Content_Text.match(/No immediate budget escalation is required[^.]*\./i)
  return match ? { sentence: match[0], document } : null
}

export function casesForTheme(data: Dataset, theme: string) {
  return data.cases.filter((item) => item.Theme === theme)
}

export function projectName(data: Dataset, projectId: string) {
  return findProject(data, projectId)?.Project_Name ?? projectId
}

export type { InventoryUnit }
