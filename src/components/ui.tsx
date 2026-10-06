import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatLongDate, statusTone, type StatusTone } from '../format.ts'
import { runStages } from '../services/ai.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import type { SourceRef } from '../types.ts'

const toneClass: Record<StatusTone, string> = {
  good: 'bg-good-soft text-good',
  amber: 'bg-amber-soft text-amber',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-mist text-muted',
}

export function StatusPill({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${toneClass[statusTone(value)]}`}>{value}</span>
}

export function PageIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-lg text-muted">{subtitle}</p>}
      <p className="mt-3 text-sm font-medium text-axiom">AI identifies patterns, options, and drafts. People decide causes, commitments, and actions.</p>
    </header>
  )
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-xl bg-axiom px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-axiom-2 disabled:cursor-not-allowed disabled:opacity-50">
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-xl border border-line bg-white px-4 py-3 text-base font-semibold text-ink transition hover:border-axiom disabled:cursor-not-allowed disabled:opacity-50">
      {children}
    </button>
  )
}

export function AnalysisButton({
  label,
  stages,
  onComplete,
}: {
  label: string
  stages?: string[]
  onComplete: () => void
}) {
  const navigate = useNavigate()
  const demo = useDemo()
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle')
  const [stage, setStage] = useState('')

  async function run() {
    setStatus('running')
    try {
      await runStages(stages ?? ['Retrieving approved information…', 'Analyzing patterns…', 'Preparing response…'], setStage)
      onComplete()
      setStatus('idle')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  if (status === 'running') {
    return (
      <div className="rounded-2xl border border-line bg-white p-5" aria-live="polite">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-mist">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-axiom" />
        </div>
        <p className="text-lg font-medium text-ink">{stage}</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-bad/30 bg-bad-soft p-5">
        <h3 className="text-lg font-semibold">Unable to complete analysis</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <PrimaryButton onClick={() => void run()}>Try Again</PrimaryButton>
          <SecondaryButton onClick={() => { demo.reset(); navigate('/') }}>Reset Demo</SecondaryButton>
        </div>
      </div>
    )
  }

  return <PrimaryButton onClick={() => void run()}>{label}</PrimaryButton>
}

export function HowGenerated({ tasks, sourceCount, boundary, reviewer }: { tasks: string[]; sourceCount: string; boundary: string; reviewer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 border-t border-line pt-3">
      <button type="button" className="text-sm font-semibold text-axiom" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        How was this generated?
      </button>
      {open && (
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="font-semibold">AI tasks</dt><dd>{tasks.join(' · ')}</dd></div>
          <div><dt className="font-semibold">Sources</dt><dd>{sourceCount}</dd></div>
          <div><dt className="font-semibold">Boundary</dt><dd>{boundary}</dd></div>
          <div><dt className="font-semibold">Human reviewer</dt><dd>{reviewer}</dd></div>
        </dl>
      )}
    </div>
  )
}

export function HumanReview({ id, role, name, text }: { id: string; role: string; name: string; text: string }) {
  const demo = useDemo()
  const [editing, setEditing] = useState(false)
  const draft = demo.state.artifacts.drafts[id] ?? text
  const reviewed = Boolean(demo.state.artifacts.reviewed[id])
  return (
    <section className="mt-5 rounded-2xl bg-gold-soft p-5">
      <h3 className="text-lg font-semibold">Human Review</h3>
      <p className="mt-1 text-sm text-muted">Suggested reviewer</p>
      <p className="font-semibold">{role}{name ? ` · ${name}` : ''}</p>
      <p className="mt-3 text-sm font-semibold">{reviewed ? 'Marked reviewed' : 'Pending human review'}</p>
      {editing ? (
        <textarea className="mt-3 min-h-36 w-full rounded-xl border border-line bg-white p-3 text-base" value={draft} onChange={(event) => demo.setDraft(id, event.target.value)} />
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-base leading-7">{draft}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <SecondaryButton onClick={() => demo.markReviewed(id)}>Mark Reviewed</SecondaryButton>
        <SecondaryButton onClick={() => setEditing((value) => !value)}>{editing ? 'Close editor' : 'Edit Draft'}</SecondaryButton>
      </div>
    </section>
  )
}

export function SourceList({ sources }: { sources: SourceRef[] }) {
  const { openSource } = useSourceModal()
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Sources Used</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {sources.map((source) => (
          <button key={source.id} type="button" className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-axiom hover:border-axiom" onClick={() => openSource(source)}>
            {source.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SourceApi {
  openSource: (source: SourceRef) => void
}

const SourceModalContext = createContext<SourceApi | null>(null)

export function SourceProvider({ children }: { children: ReactNode }) {
  const data = useData()
  const [source, setSource] = useState<SourceRef | null>(null)
  const document = data.documents.find((item) => item.Document_ID === source?.documentId)
  return (
    <SourceModalContext.Provider value={{ openSource: setSource }}>
      {children}
      {source && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-deep/50 p-4" role="dialog" aria-modal="true" aria-label={source.label}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-axiom">{document?.Document_Type ?? 'Source'}</p>
                <h2 className="mt-1 text-2xl font-semibold">{document?.Title ?? source.label}</h2>
                {document && <p className="mt-1 text-sm text-muted">{formatLongDate(document.Document_Date)} · {document.Version}</p>}
              </div>
              <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-mist" onClick={() => setSource(null)}>Close</button>
            </div>
            {document && <p className="mt-4 inline-flex rounded-full bg-good-soft px-3 py-1 text-sm font-semibold text-good">Approved Source</p>}
            <pre className="mt-4 whitespace-pre-wrap font-sans text-base leading-7 text-ink">{document?.Content_Text || source.detail || 'No source text is available.'}</pre>
          </div>
        </div>
      )}
    </SourceModalContext.Provider>
  )
}

export function useSourceModal() {
  const value = useContext(SourceModalContext)
  if (!value) throw new Error('Source viewer is unavailable')
  return value
}

export function OutputFrame({ children }: { children: ReactNode }) {
  return <article className="rounded-2xl border border-line bg-white p-6 shadow-sm">{children}</article>
}
