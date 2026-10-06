import Papa from 'papaparse'
import type { Dataset } from '../types.ts'

function num(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function flag(value: string | undefined) {
  return value === '1' || value === 'true'
}

async function loadCsv(file: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`)
  if (!response.ok) throw new Error(`${file} could not be loaded (${response.status})`)
  const text = await response.text()
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy' })
  const fatal = parsed.errors.filter((error) => error.type === 'Quotes')
  if (fatal.length) throw new Error(`${file} could not be parsed: ${fatal[0]?.message ?? 'quote error'}`)
  return parsed.data.filter((row) => Object.values(row).some((value) => value && String(value).trim()))
}

export async function loadDataset(): Promise<Dataset> {
  const [
    projects,
    weeklyUpdates,
    milestones,
    issues,
    documents,
    inventory,
    leads,
    interactions,
    salesPerformance,
    lostReasons,
    faqs,
    operations,
    cases,
    finance,
    scenarioResponse,
  ] = await Promise.all([
    loadCsv('projects.csv'),
    loadCsv('project_weekly_updates.csv'),
    loadCsv('milestones.csv'),
    loadCsv('issues_register.csv'),
    loadCsv('project_documents.csv'),
    loadCsv('property_inventory.csv'),
    loadCsv('leads.csv'),
    loadCsv('lead_interactions.csv'),
    loadCsv('sales_monthly_performance.csv'),
    loadCsv('lost_lead_reasons.csv'),
    loadCsv('approved_faq.csv'),
    loadCsv('property_operations.csv'),
    loadCsv('customer_cases.csv'),
    loadCsv('finance_transactions.csv'),
    fetch(`${import.meta.env.BASE_URL}data/demo_scenarios.json`).then((response) => {
      if (!response.ok) throw new Error('demo_scenarios.json could not be loaded')
      return response.json() as Promise<Record<string, string>[]>
    }),
  ])

  return mapDataset({
    projects,
    weeklyUpdates,
    milestones,
    issues,
    documents,
    inventory,
    leads,
    interactions,
    salesPerformance,
    lostReasons,
    faqs,
    operations,
    cases,
    finance,
    scenarioResponse,
  })
}

export function mapDataset(input: {
  projects: Record<string, string>[]
  weeklyUpdates: Record<string, string>[]
  milestones: Record<string, string>[]
  issues: Record<string, string>[]
  documents: Record<string, string>[]
  inventory: Record<string, string>[]
  leads: Record<string, string>[]
  interactions: Record<string, string>[]
  salesPerformance: Record<string, string>[]
  lostReasons: Record<string, string>[]
  faqs: Record<string, string>[]
  operations: Record<string, string>[]
  cases: Record<string, string>[]
  finance: Record<string, string>[]
  scenarioResponse: Record<string, string>[]
}): Dataset {
  const {
    projects,
    weeklyUpdates,
    milestones,
    issues,
    documents,
    inventory,
    leads,
    interactions,
    salesPerformance,
    lostReasons,
    faqs,
    operations,
    cases,
    finance,
    scenarioResponse,
  } = input

  const dataset: Dataset = {
    projects: projects.map((row) => ({
      Project_ID: row.Project_ID,
      Project_Name: row.Project_Name,
      City: row.City,
      Project_Type: row.Project_Type,
      Segment: row.Segment,
      Stage: row.Stage,
      Start_Date: row.Start_Date,
      Target_Completion: row.Target_Completion,
      Overall_Status: row.Overall_Status,
      Planned_Progress_Pct: num(row.Planned_Progress_Pct),
      Actual_Progress_Pct: num(row.Actual_Progress_Pct),
      Budget_PHP_M: num(row.Budget_PHP_M),
      Committed_Cost_PHP_M: num(row.Committed_Cost_PHP_M),
      Forecast_Final_Cost_PHP_M: num(row.Forecast_Final_Cost_PHP_M),
      Units_Total: num(row.Units_Total),
      Units_Sold: num(row.Units_Sold),
      Project_Director: row.Project_Director,
      Data_As_Of: row.Data_As_Of,
    })),
    weeklyUpdates: weeklyUpdates.map((row) => ({
      Update_ID: row.Update_ID,
      Project_ID: row.Project_ID,
      Week_Ending: row.Week_Ending,
      Planned_Progress_Pct: num(row.Planned_Progress_Pct),
      Actual_Progress_Pct: num(row.Actual_Progress_Pct),
      Overall_Status: row.Overall_Status,
      Schedule_Status: row.Schedule_Status,
      Budget_Status: row.Budget_Status,
      Top_Update_1: row.Top_Update_1,
      Top_Update_2: row.Top_Update_2,
      Top_Update_3: row.Top_Update_3,
      Blockers: row.Blockers,
      Management_Note: row.Management_Note,
    })),
    milestones: milestones.map((row) => ({
      Milestone_ID: row.Milestone_ID,
      Project_ID: row.Project_ID,
      Milestone_Name: row.Milestone_Name,
      Baseline_Date: row.Baseline_Date,
      Forecast_Date: row.Forecast_Date,
      Variance_Days: num(row.Variance_Days),
      Status: row.Status,
      Owner: row.Owner,
    })),
    issues: issues.map((row) => ({
      Issue_ID: row.Issue_ID,
      Project_ID: row.Project_ID,
      Category: row.Category,
      Description: row.Description,
      Priority: row.Priority,
      Status: row.Status,
      Opened_Date: row.Opened_Date,
      Age_Days: num(row.Age_Days),
      Owner: row.Owner,
      Source_Document: row.Source_Document,
    })),
    documents: documents.map((row) => ({
      Document_ID: row.Document_ID,
      Project_ID: row.Project_ID,
      Document_Type: row.Document_Type,
      Title: row.Title,
      Version: row.Version,
      Document_Date: row.Document_Date,
      Approved_For_Demo_Use: flag(row.Approved_For_Demo_Use),
      Content_Text: row.Content_Text,
    })),
    inventory: inventory.map((row) => ({
      Inventory_ID: row.Inventory_ID,
      Project_ID: row.Project_ID,
      Project_Name: row.Project_Name,
      City: row.City,
      Unit_Type: row.Unit_Type,
      Floor_Area_sqm: num(row.Floor_Area_sqm),
      List_Price_PHP_M: num(row.List_Price_PHP_M),
      Parking_Available: flag(row.Parking_Available),
      Parking_Price_PHP_M: num(row.Parking_Price_PHP_M),
      Available_Units: num(row.Available_Units),
      Turnover_Window: row.Turnover_Window,
      Rental_Profile: row.Rental_Profile,
      Inventory_Status: row.Inventory_Status,
      As_Of: row.As_Of,
    })),
    leads: leads.map((row) => ({
      Lead_ID: row.Lead_ID,
      First_Name: row.First_Name,
      Last_Name: row.Last_Name,
      Primary_Project_ID: row.Primary_Project_ID,
      City_Preference: row.City_Preference,
      Buyer_Type: row.Buyer_Type,
      Budget_Min_PHP_M: num(row.Budget_Min_PHP_M),
      Budget_Max_PHP_M: num(row.Budget_Max_PHP_M),
      Unit_Preference: row.Unit_Preference,
      Purpose: row.Purpose,
      Lead_Score: row.Lead_Score,
      Lead_Status: row.Lead_Status,
      Source: row.Source,
      Created_Date: row.Created_Date,
      Last_Interaction_Date: row.Last_Interaction_Date,
      Parking_Concern: flag(row.Parking_Concern),
      Turnover_Concern: flag(row.Turnover_Concern),
      Rental_Concern: flag(row.Rental_Concern),
      Needs_Summary: row.Needs_Summary,
    })),
    interactions: interactions.map((row) => ({
      Interaction_ID: row.Interaction_ID,
      Lead_ID: row.Lead_ID,
      Interaction_Date: row.Interaction_Date,
      Channel: row.Channel,
      Agent: row.Agent,
      Interaction_Text: row.Interaction_Text,
    })),
    salesPerformance: salesPerformance.map((row) => ({
      Project_ID: row.Project_ID,
      Project_Name: row.Project_Name,
      Month: row.Month,
      Inquiries: num(row.Inquiries),
      Matured_Lead_Conversion_Rate_Pct: num(row.Matured_Lead_Conversion_Rate_Pct),
      Qualified_Lead_Pct: num(row.Qualified_Lead_Pct),
      Reservations: num(row.Reservations),
      Notes: row.Notes,
    })),
    lostReasons: lostReasons.map((row) => ({
      Project_ID: row.Project_ID,
      Month: row.Month,
      Reason: row.Reason,
      Share_of_Lost_Leads_Pct: num(row.Share_of_Lost_Leads_Pct),
    })),
    faqs: faqs.map((row) => ({
      FAQ_ID: row.FAQ_ID,
      Project_ID: row.Project_ID,
      Category: row.Category,
      Question: row.Question,
      Approved_Answer: row.Approved_Answer,
      Last_Reviewed: row.Last_Reviewed,
      Owner: row.Owner,
    })),
    operations: operations.map((row) => ({
      Project_ID: row.Project_ID,
      Project_Name: row.Project_Name,
      Turned_Over_Units: num(row.Turned_Over_Units),
      Occupied_Units: num(row.Occupied_Units),
      Property_Manager: row.Property_Manager,
      As_Of: row.As_Of,
    })),
    cases: cases.map((row) => ({
      Case_ID: row.Case_ID,
      Project_ID: row.Project_ID,
      Project_Name: row.Project_Name,
      Customer_Type: row.Customer_Type,
      Theme: row.Theme,
      Subcategory: row.Subcategory,
      Case_Text: row.Case_Text,
      Floor: row.Floor,
      Created_Date: row.Created_Date,
      Status: row.Status,
      Channel: row.Channel,
      Assigned_Team: row.Assigned_Team,
      Sentiment: row.Sentiment,
    })),
    finance: finance.map((row) => ({
      Transaction_ID: row.Transaction_ID,
      Project_ID: row.Project_ID,
      Transaction_Date: row.Transaction_Date,
      Vendor: row.Vendor,
      Expense_Category: row.Expense_Category,
      Amount_PHP: num(row.Amount_PHP),
      Approval_Status: row.Approval_Status,
      Potential_Anomaly: row.Potential_Anomaly,
      Anomaly_Note: row.Anomaly_Note,
    })),
    scenarios: scenarioResponse.map((row) => ({
      Scenario: row.Scenario,
      Record: row.Record,
      Expected_Demo_Signal: row['Expected Demo Signal'],
      Guardrail: row.Guardrail,
    })),
    diagnostics: [],
  }

  dataset.diagnostics = validateDataset(dataset)
  return dataset
}

function validateDataset(data: Dataset) {
  const notes: string[] = []
  const expect = (ok: boolean, message: string) => {
    if (!ok) notes.push(message)
  }
  const astra = data.projects.find((project) => project.Project_ID === 'PRJ-001')
  const highOpen = data.issues.filter(
    (issue) => issue.Status === 'Open' && (issue.Priority === 'High' || issue.Priority === 'Critical'),
  ).length
  expect(data.projects.length === 8, `Expected 8 projects, found ${data.projects.length}`)
  expect(data.leads.length === 1842, `Expected 1,842 leads, found ${data.leads.length}`)
  expect(data.cases.length === 427, `Expected 427 cases, found ${data.cases.length}`)
  expect(highOpen === 14, `Expected 14 open high/critical issues, found ${highOpen}`)
  expect(astra?.Actual_Progress_Pct === 68 && astra.Planned_Progress_Pct === 71, 'Astra Heights progress is not 68 vs 71')
  expect(data.leads.some((lead) => lead.Lead_ID === 'LEAD-0001'), 'LEAD-0001 Maria Santos is missing')
  expect(data.documents.some((doc) => doc.Document_ID === 'DOC-001' && doc.Content_Text.includes('12 days')), 'Week 38 source text is missing')
  return notes
}
