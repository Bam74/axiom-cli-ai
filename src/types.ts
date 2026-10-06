export interface Project {
  Project_ID: string
  Project_Name: string
  City: string
  Project_Type: string
  Segment: string
  Stage: string
  Start_Date: string
  Target_Completion: string
  Overall_Status: string
  Planned_Progress_Pct: number
  Actual_Progress_Pct: number
  Budget_PHP_M: number
  Committed_Cost_PHP_M: number
  Forecast_Final_Cost_PHP_M: number
  Units_Total: number
  Units_Sold: number
  Project_Director: string
  Data_As_Of: string
}

export interface WeeklyUpdate {
  Update_ID: string
  Project_ID: string
  Week_Ending: string
  Planned_Progress_Pct: number
  Actual_Progress_Pct: number
  Overall_Status: string
  Schedule_Status: string
  Budget_Status: string
  Top_Update_1: string
  Top_Update_2: string
  Top_Update_3: string
  Blockers: string
  Management_Note: string
}

export interface Milestone {
  Milestone_ID: string
  Project_ID: string
  Milestone_Name: string
  Baseline_Date: string
  Forecast_Date: string
  Variance_Days: number
  Status: string
  Owner: string
}

export interface Issue {
  Issue_ID: string
  Project_ID: string
  Category: string
  Description: string
  Priority: string
  Status: string
  Opened_Date: string
  Age_Days: number
  Owner: string
  Source_Document: string
}

export interface ProjectDocument {
  Document_ID: string
  Project_ID: string
  Document_Type: string
  Title: string
  Version: string
  Document_Date: string
  Approved_For_Demo_Use: boolean
  Content_Text: string
}

export interface InventoryUnit {
  Inventory_ID: string
  Project_ID: string
  Project_Name: string
  City: string
  Unit_Type: string
  Floor_Area_sqm: number
  List_Price_PHP_M: number
  Parking_Available: boolean
  Parking_Price_PHP_M: number
  Available_Units: number
  Turnover_Window: string
  Rental_Profile: string
  Inventory_Status: string
  As_Of: string
}

export interface Lead {
  Lead_ID: string
  First_Name: string
  Last_Name: string
  Primary_Project_ID: string
  City_Preference: string
  Buyer_Type: string
  Budget_Min_PHP_M: number
  Budget_Max_PHP_M: number
  Unit_Preference: string
  Purpose: string
  Lead_Score: string
  Lead_Status: string
  Source: string
  Created_Date: string
  Last_Interaction_Date: string
  Parking_Concern: boolean
  Turnover_Concern: boolean
  Rental_Concern: boolean
  Needs_Summary: string
}

export interface Interaction {
  Interaction_ID: string
  Lead_ID: string
  Interaction_Date: string
  Channel: string
  Agent: string
  Interaction_Text: string
}

export interface SalesMonth {
  Project_ID: string
  Project_Name: string
  Month: string
  Inquiries: number
  Matured_Lead_Conversion_Rate_Pct: number
  Qualified_Lead_Pct: number
  Reservations: number
  Notes: string
}

export interface LostReason {
  Project_ID: string
  Month: string
  Reason: string
  Share_of_Lost_Leads_Pct: number
}

export interface Faq {
  FAQ_ID: string
  Project_ID: string
  Category: string
  Question: string
  Approved_Answer: string
  Last_Reviewed: string
  Owner: string
}

export interface PropertyOperation {
  Project_ID: string
  Project_Name: string
  Turned_Over_Units: number
  Occupied_Units: number
  Property_Manager: string
  As_Of: string
}

export interface CustomerCase {
  Case_ID: string
  Project_ID: string
  Project_Name: string
  Customer_Type: string
  Theme: string
  Subcategory: string
  Case_Text: string
  Floor: string
  Created_Date: string
  Status: string
  Channel: string
  Assigned_Team: string
  Sentiment: string
}

export interface FinanceTransaction {
  Transaction_ID: string
  Project_ID: string
  Transaction_Date: string
  Vendor: string
  Expense_Category: string
  Amount_PHP: number
  Approval_Status: string
  Potential_Anomaly: string
  Anomaly_Note: string
}

export interface DemoScenario {
  Scenario: string
  Record: string
  Expected_Demo_Signal: string
  Guardrail: string
}

export interface Dataset {
  projects: Project[]
  weeklyUpdates: WeeklyUpdate[]
  milestones: Milestone[]
  issues: Issue[]
  documents: ProjectDocument[]
  inventory: InventoryUnit[]
  leads: Lead[]
  interactions: Interaction[]
  salesPerformance: SalesMonth[]
  lostReasons: LostReason[]
  faqs: Faq[]
  operations: PropertyOperation[]
  cases: CustomerCase[]
  finance: FinanceTransaction[]
  scenarios: DemoScenario[]
  diagnostics: string[]
}

export interface SourceRef {
  id: string
  label: string
  documentId?: string
  detail?: string
}
