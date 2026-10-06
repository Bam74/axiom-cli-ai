import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MANAGEMENT_QUESTIONS, buildManagementAnswer, runStages } from '../services/ai.ts'
import { useData } from '../state/data.tsx'
import { useDemo } from '../state/demo.tsx'
import { HowGenerated, OutputFrame, PageIntro, PrimaryButton, SecondaryButton, SourceList, StatusPill } from '../components/ui.tsx'

export function ManagementPage() {
  const data = useData()
  const demo = useDemo()
  const navigate = useNavigate()
  const [stage, setStage] = useState('')
  const [error, setError] = useState(false)
  const answer = demo.state.managementQuestion ? demo.state.artifacts.management[demo.state.managementQuestion] : undefined

  async function ask(questionId: string) {
    demo.selectQuestion(questionId)
    setError(false)
    try {
      await runStages(
        questionId === 'focus'
          ? ['Retrieving approved information…', 'Analyzing project, sales and customer signals…', 'Preparing response…']
          : ['Retrieving approved information…', 'Analyzing patterns…', 'Preparing response…'],
        setStage,
      )
      demo.saveManagement(questionId, buildManagementAnswer(data, questionId))
      setStage('')
    } catch (reason) {
      console.error(reason)
      setStage('')
      setError(true)
    }
  }
  return (
    <div>
      <PageIntro title="Management Intelligence" subtitle="Connect signals across projects, sales and customer experience." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Projects" value={String(data.projects.length)} />
        <Summary label="Sales" value={data.leads.length.toLocaleString('en-US')} />
        <Summary label="Customers" value={String(data.cases.length)} />
        <Summary label="Business Signals" value="3" />
      </section>
      <section className="mt-8 rounded-2xl bg-deep p-6 text-white">
        <h2 className="text-3xl font-semibold">Ask CLI Intelligence</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {MANAGEMENT_QUESTIONS.map((question) => (
            <button
              key={question.id}
              type="button"
              className={`rounded-full px-4 py-2 text-left text-sm font-semibold ${demo.state.managementQuestion === question.id ? 'bg-gold text-deep' : 'bg-white/10 text-white'}`}
              onClick={() => void ask(question.id)}
            >
              {question.text}
            </button>
          ))}
        </div>
        {stage && <p className="mt-5 text-lg" aria-live="polite">{stage}</p>}
        {error && (
          <div className="mt-5 rounded-xl bg-white p-4 text-ink">
            <h3 className="font-semibold">Unable to complete analysis</h3>
            <div className="mt-3 flex gap-3">
              <PrimaryButton onClick={() => demo.state.managementQuestion && void ask(demo.state.managementQuestion)}>Try Again</PrimaryButton>
              <SecondaryButton onClick={() => { demo.reset(); navigate('/') }}>Reset Demo</SecondaryButton>
            </div>
          </div>
        )}
      </section>
      {answer && (
        <div className="mt-6 space-y-4">
          <OutputFrame>
            <h2 className="text-2xl font-semibold">{answer.question}</h2>
            <div className="mt-4 space-y-4">
              {answer.priorities.map((priority) => (
                <article key={`${priority.rank}-${priority.projectId}`} className="rounded-2xl border border-line p-5">
                  <p className="text-sm font-semibold text-muted">{priority.rank}</p>
                  <h3 className="text-2xl font-semibold">{priority.title}</h3>
                  <p className="mt-1 text-sm font-bold tracking-wide text-axiom">{priority.category}</p>
                  {priority.status && <div className="mt-2"><StatusPill value={priority.status} /></div>}
                  <h4 className="mt-4 font-semibold">Why this was flagged</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{priority.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <h4 className="mt-4 font-semibold">Management Question</h4>
                  <p className="mt-1">{priority.question}</p>
                  <Link to={priority.evidenceTo} className="mt-4 inline-flex rounded-xl bg-axiom px-4 py-2 font-semibold text-white" onClick={() => demo.selectProject(priority.projectId)}>View Evidence</Link>
                </article>
              ))}
              {answer.notes.map((note) => (
                <article key={note.heading} className="rounded-2xl bg-lavender p-4">
                  <h3 className="font-semibold">{note.heading}</h3>
                  <p className="mt-1">{note.body}</p>
                </article>
              ))}
            </div>
            <SourceList sources={answer.sources} />
            <HowGenerated tasks={answer.tasks} sourceCount="Project, sales, and customer records" boundary={answer.boundary} reviewer={answer.reviewerRole} />
          </OutputFrame>
        </div>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </article>
  )
}
