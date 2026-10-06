import { useState } from 'react'
import Papa from 'papaparse'
import { PageIntro } from '../components/ui.tsx'

const FILES = [
  { group: 'Project Data', file: 'projects.csv' },
  { group: 'Project Data', file: 'project_weekly_updates.csv' },
  { group: 'Project Data', file: 'milestones.csv' },
  { group: 'Project Data', file: 'issues_register.csv' },
  { group: 'Project Data', file: 'project_documents.csv' },
  { group: 'Sales Data', file: 'leads.csv' },
  { group: 'Sales Data', file: 'lead_interactions.csv' },
  { group: 'Sales Data', file: 'sales_monthly_performance.csv' },
  { group: 'Sales Data', file: 'lost_lead_reasons.csv' },
  { group: 'Sales Data', file: 'property_inventory.csv' },
  { group: 'Customer Data', file: 'customer_cases.csv' },
  { group: 'Customer Data', file: 'property_operations.csv' },
  { group: 'Customer Data', file: 'finance_transactions.csv' },
  { group: 'Approved Knowledge Sources', file: 'approved_faq.csv' },
  { group: 'Approved Knowledge Sources', file: 'demo_scenarios.json' },
]

export function SourcesPage() {
  const [preview, setPreview] = useState<{ file: string; headers: string[]; rows: string[][] } | null>(null)
  const [error, setError] = useState('')
  const groups = [...new Set(FILES.map((item) => item.group))]

  async function openFile(file: string) {
    setError('')
    const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`)
    if (!response.ok) {
      setError(`${file} could not be opened`)
      return
    }
    if (file.endsWith('.json')) {
      const json = await response.json() as Record<string, string>[]
      const headers = Object.keys(json[0] ?? {})
      setPreview({ file, headers, rows: json.slice(0, 12).map((row) => headers.map((header) => row[header] ?? '')) })
      return
    }
    const parsed = Papa.parse<string[]>(await response.text(), { skipEmptyLines: 'greedy' })
    const [headers = [], ...rows] = parsed.data
    setPreview({ file, headers, rows: rows.slice(0, 12) })
  }

  return (
    <div>
      <PageIntro title="Data & Sources" subtitle="The files behind this workbench." />
      <section className="rounded-2xl bg-gold-soft p-5">
        <h2 className="text-xl font-semibold">Synthetic Training Environment</h2>
        <p className="mt-2 text-base leading-7">All information in this application was created for demonstration purposes. No actual Cebu Landmasters customer, employee, financial, project or confidential data is contained here.</p>
      </section>
      {groups.map((group) => (
        <section key={group} className="mt-6">
          <h2 className="text-lg font-semibold">{group}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILES.filter((item) => item.group === group).map((item) => (
              <button key={item.file} type="button" className="rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold shadow-sm" onClick={() => void openFile(item.file)}>{item.file}</button>
            ))}
          </div>
        </section>
      ))}
      {error && <p className="mt-4 text-bad">{error}</p>}
      {preview && (
        <section className="mt-6 overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">{preview.file}</h2>
          <p className="text-sm text-muted">Showing the first {preview.rows.length} rows.</p>
          <table className="mt-3 w-full text-left text-xs">
            <thead><tr>{preview.headers.map((header) => <th key={header} className="px-2 py-2">{header}</th>)}</tr></thead>
            <tbody>
              {preview.rows.map((row, index) => (
                <tr key={index} className="border-t border-line">
                  {preview.headers.map((header, cell) => <td key={header} className="max-w-64 truncate px-2 py-2">{row[cell]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
