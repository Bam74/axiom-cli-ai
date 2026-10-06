import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'data', 'source')
const outDir = path.join(root, 'public', 'data')
const bundled = path.join(sourceDir, 'CLI_AI_Workbench_Synthetic_Data.xlsx')
const download = 'C:\\Users\\Bamdee\\Downloads\\CLI_AI_Workbench_Synthetic_Data.xlsx'

const SHEETS = {
  3: 'projects.csv',
  4: 'project_weekly_updates.csv',
  5: 'milestones.csv',
  6: 'issues_register.csv',
  7: 'project_documents.csv',
  8: 'property_inventory.csv',
  9: 'leads.csv',
  10: 'lead_interactions.csv',
  11: 'sales_monthly_performance.csv',
  12: 'lost_lead_reasons.csv',
  13: 'approved_faq.csv',
  14: 'property_operations.csv',
  15: 'customer_cases.csv',
  16: 'finance_transactions.csv',
}

const DATE_COLUMNS = new Set([
  'Start_Date',
  'Target_Completion',
  'Data_As_Of',
  'Week_Ending',
  'Baseline_Date',
  'Forecast_Date',
  'Opened_Date',
  'Document_Date',
  'As_Of',
  'Created_Date',
  'Last_Interaction_Date',
  'Interaction_Date',
  'Last_Reviewed',
  'Transaction_Date',
])

function excelToISO(serial) {
  const ms = Date.UTC(1899, 11, 30) + Math.round(Number(serial)) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '')
}

function rowsOf(xml) {
  const rows = new Map()
  for (const part of xml.split('<x:c ').slice(1)) {
    const ref = part.match(/^r="([A-Z]+)(\d+)"/)
    if (!ref) continue
    const end = part.indexOf('</x:c>')
    const chunk = end >= 0 ? part.slice(0, end) : ''
    const match = chunk.match(/<x:v>([\s\S]*?)<\/x:v>/)
    if (!match) continue
    const row = Number(ref[2])
    if (!rows.has(row)) rows.set(row, {})
    rows.get(row)[ref[1]] = decodeXml(match[1])
  }
  return rows
}

function columnRank(label) {
  let n = 0
  for (const ch of label) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

function recordsFromSheet(xml) {
  const rows = rowsOf(xml)
  const nums = [...rows.keys()].sort((a, b) => a - b)
  let headerRow = null
  for (const n of nums) {
    const values = Object.values(rows.get(n))
    if (values.includes('Project_ID') || values.includes('Lead_ID') || values.includes('FAQ_ID') || values.includes('Theme') || values.includes('Scenario') || values.includes('Transaction_ID') || values.includes('Txn_ID')) {
      headerRow = n
      break
    }
  }
  if (headerRow == null) {
    for (const n of nums) {
      if (Object.values(rows.get(n)).filter(Boolean).length >= 4) {
        headerRow = n
        break
      }
    }
  }
  if (headerRow == null) return []
  const header = rows.get(headerRow)
  const cols = Object.keys(header).sort((a, b) => columnRank(a) - columnRank(b))
  const records = []
  for (const n of nums) {
    if (n <= headerRow) continue
    const row = rows.get(n)
    const record = {}
    let any = false
    for (const col of cols) {
      const key = header[col]
      if (!key) continue
      let value = row[col] ?? ''
      if (value && DATE_COLUMNS.has(key) && /^\d+(\.\d+)?$/.test(value)) value = excelToISO(value)
      if (value !== '') any = true
      record[key] = value
    }
    if (any) records.push(record)
  }
  return records
}

function csvEscape(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsv(records) {
  if (!records.length) return ''
  const headers = Object.keys(records[0])
  const lines = [headers.join(',')]
  for (const record of records) {
    lines.push(headers.map((header) => csvEscape(record[header] ?? '')).join(','))
  }
  return lines.join('\n') + '\n'
}

fs.mkdirSync(sourceDir, { recursive: true })
fs.mkdirSync(outDir, { recursive: true })
if (!fs.existsSync(bundled)) {
  if (!fs.existsSync(download)) throw new Error('Synthetic workbook not found')
  fs.copyFileSync(download, bundled)
}

const extractDir = path.join(root, 'data', '.xlsx-extract')
fs.rmSync(extractDir, { recursive: true, force: true })
fs.mkdirSync(extractDir, { recursive: true })
execFileSync('tar', ['-xf', bundled, '-C', extractDir], { stdio: 'inherit' })

const workbook = fs.readFileSync(path.join(extractDir, 'xl', 'workbook.xml'), 'utf8')
const sheetNames = [...workbook.matchAll(/name="([^"]+)"/g)].map((match) => match[1])

for (const [index, filename] of Object.entries(SHEETS)) {
  const xml = fs.readFileSync(path.join(extractDir, 'xl', 'worksheets', `sheet${index}.xml`), 'utf8')
  const records = recordsFromSheet(xml)
  fs.writeFileSync(path.join(outDir, filename), toCsv(records))
  console.log(`${filename}: ${records.length} rows (${sheetNames[Number(index) - 1]})`)
}

const scenarioXml = fs.readFileSync(path.join(extractDir, 'xl', 'worksheets', 'sheet17.xml'), 'utf8')
const scenarios = recordsFromSheet(scenarioXml)
fs.mkdirSync(path.join(root, 'knowledge_base', 'demo'), { recursive: true })
fs.writeFileSync(path.join(root, 'knowledge_base', 'demo', 'demo_scenarios.json'), JSON.stringify(scenarios, null, 2) + '\n')
fs.writeFileSync(path.join(outDir, 'demo_scenarios.json'), JSON.stringify(scenarios, null, 2) + '\n')
console.log(`demo_scenarios.json: ${scenarios.length} rows`)

fs.rmSync(extractDir, { recursive: true, force: true })
