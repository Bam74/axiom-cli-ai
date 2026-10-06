import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadDataset } from '../data/loadData.ts'
import type { Dataset } from '../types.ts'

const DataContext = createContext<Dataset | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadDataset()
      .then((dataset) => {
        if (active) setData(dataset)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'The datasets could not be loaded')
      })
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-lavender p-8">
        <div className="max-w-xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Unable to load the synthetic datasets</h1>
          <p className="mt-3 text-muted">{error}</p>
          <p className="mt-3 text-sm text-muted">Confirm that public/data contains the exported CSV files, then refresh.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-lavender">
        <p className="text-lg text-muted">Loading enterprise data…</p>
      </div>
    )
  }

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('Enterprise data is unavailable')
  return value
}
