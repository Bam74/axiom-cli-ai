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

export function pipelineCounts(data: Dataset) {
  const counts = new Map<string, number>()
  for (const lead of data.leads) counts.set(lead.Lead_Status, (counts.get(lead.Lead_Status) ?? 0) + 1)
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
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
