import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { GuideModule } from '../demo/guides.ts'
import type {
  BuyerBrief,
  ChangeReport,
  ExecutiveUpdate,
  FollowUpDraft,
  ManagementAnswer,
  OperationsBrief,
  ProjectBrief,
  PropertyMatch,
} from '../services/ai.ts'

const MODULES: GuideModule[] = ['overview', 'projects', 'sales', 'customer', 'management', 'sources']

function emptySteps() {
  return Object.fromEntries(MODULES.map((module) => [module, 0])) as Record<GuideModule, number>
}

function emptyCompleted() {
  return Object.fromEntries(MODULES.map((module) => [module, [] as number[]])) as Record<GuideModule, number[]>
}

interface Artifacts {
  briefs: Record<string, ProjectBrief>
  changes: Record<string, ChangeReport>
  updates: Record<string, ExecutiveUpdate>
  buyerBriefs: Record<string, BuyerBrief>
  matches: Record<string, PropertyMatch[]>
  compared: Record<string, boolean>
  followUps: Record<string, FollowUpDraft>
  opsBrief: OperationsBrief | null
  management: Record<string, ManagementAnswer>
  drafts: Record<string, string>
  reviewed: Record<string, boolean>
}

interface DemoState {
  guideOpen: boolean
  stepIndex: Record<GuideModule, number>
  completed: Record<GuideModule, number[]>
  selectedProjectId: string | null
  selectedLeadId: string | null
  selectedTheme: string | null
  managementQuestion: string | null
  artifacts: Artifacts
}

function emptyArtifacts(): Artifacts {
  return {
    briefs: {},
    changes: {},
    updates: {},
    buyerBriefs: {},
    matches: {},
    compared: {},
    followUps: {},
    opsBrief: null,
    management: {},
    drafts: {},
    reviewed: {},
  }
}

function initialState(): DemoState {
  return {
    guideOpen: true,
    stepIndex: emptySteps(),
    completed: emptyCompleted(),
    selectedProjectId: null,
    selectedLeadId: null,
    selectedTheme: null,
    managementQuestion: null,
    artifacts: emptyArtifacts(),
  }
}

type Action =
  | { type: 'reset' }
  | { type: 'guide'; open: boolean }
  | { type: 'step'; module: GuideModule; index: number }
  | { type: 'complete'; module: GuideModule; index: number }
  | { type: 'project'; id: string | null }
  | { type: 'lead'; id: string | null }
  | { type: 'theme'; id: string | null }
  | { type: 'question'; id: string | null }
  | { type: 'artifact'; key: keyof Artifacts; id: string; value: unknown }
  | { type: 'ops'; value: OperationsBrief }
  | { type: 'compare'; id: string }
  | { type: 'draft'; id: string; text: string }
  | { type: 'clear-draft'; id: string }
  | { type: 'reviewed'; id: string }

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'reset':
      return { ...initialState(), guideOpen: state.guideOpen }
    case 'guide':
      return { ...state, guideOpen: action.open }
    case 'step':
      return { ...state, stepIndex: { ...state.stepIndex, [action.module]: action.index } }
    case 'complete': {
      const current = state.completed[action.module]
      if (current.includes(action.index)) return state
      return { ...state, completed: { ...state.completed, [action.module]: [...current, action.index] } }
    }
    case 'project':
      return state.selectedProjectId === action.id ? state : { ...state, selectedProjectId: action.id }
    case 'lead':
      return state.selectedLeadId === action.id ? state : { ...state, selectedLeadId: action.id }
    case 'theme':
      return state.selectedTheme === action.id ? state : { ...state, selectedTheme: action.id }
    case 'question':
      return state.managementQuestion === action.id ? state : { ...state, managementQuestion: action.id }
    case 'artifact':
      return {
        ...state,
        artifacts: {
          ...state.artifacts,
          [action.key]: { ...(state.artifacts[action.key] as Record<string, unknown>), [action.id]: action.value },
        },
      }
    case 'ops':
      return { ...state, artifacts: { ...state.artifacts, opsBrief: action.value } }
    case 'compare':
      return { ...state, artifacts: { ...state.artifacts, compared: { ...state.artifacts.compared, [action.id]: true } } }
    case 'draft':
      return { ...state, artifacts: { ...state.artifacts, drafts: { ...state.artifacts.drafts, [action.id]: action.text } } }
    case 'clear-draft': {
      const drafts = { ...state.artifacts.drafts }
      delete drafts[action.id]
      return { ...state, artifacts: { ...state.artifacts, drafts } }
    }
    case 'reviewed':
      return { ...state, artifacts: { ...state.artifacts, reviewed: { ...state.artifacts.reviewed, [action.id]: true } } }
    default:
      return state
  }
}

interface DemoApi {
  state: DemoState
  setGuideOpen: (open: boolean) => void
  setStep: (module: GuideModule, index: number) => void
  markDone: (module: GuideModule, index: number) => void
  reset: () => void
  selectProject: (id: string | null) => void
  selectLead: (id: string | null) => void
  selectTheme: (id: string | null) => void
  selectQuestion: (id: string | null) => void
  saveBrief: (id: string, value: ProjectBrief) => void
  saveChange: (id: string, value: ChangeReport) => void
  saveUpdate: (id: string, value: ExecutiveUpdate) => void
  saveBuyer: (id: string, value: BuyerBrief) => void
  saveMatches: (id: string, value: PropertyMatch[]) => void
  showCompare: (id: string) => void
  saveFollowUp: (id: string, value: FollowUpDraft) => void
  saveOps: (value: OperationsBrief) => void
  saveManagement: (id: string, value: ManagementAnswer) => void
  setDraft: (id: string, text: string) => void
  clearDraft: (id: string) => void
  markReviewed: (id: string) => void
}

const DemoContext = createContext<DemoApi | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const api = useMemo<DemoApi>(() => ({
    state,
    setGuideOpen: (open) => dispatch({ type: 'guide', open }),
    setStep: (module, index) => dispatch({ type: 'step', module, index }),
    markDone: (module, index) => dispatch({ type: 'complete', module, index }),
    reset: () => dispatch({ type: 'reset' }),
    selectProject: (id) => dispatch({ type: 'project', id }),
    selectLead: (id) => dispatch({ type: 'lead', id }),
    selectTheme: (id) => dispatch({ type: 'theme', id }),
    selectQuestion: (id) => dispatch({ type: 'question', id }),
    saveBrief: (id, value) => dispatch({ type: 'artifact', key: 'briefs', id, value }),
    saveChange: (id, value) => dispatch({ type: 'artifact', key: 'changes', id, value }),
    saveUpdate: (id, value) => dispatch({ type: 'artifact', key: 'updates', id, value }),
    saveBuyer: (id, value) => dispatch({ type: 'artifact', key: 'buyerBriefs', id, value }),
    saveMatches: (id, value) => dispatch({ type: 'artifact', key: 'matches', id, value }),
    showCompare: (id) => dispatch({ type: 'compare', id }),
    saveFollowUp: (id, value) => dispatch({ type: 'artifact', key: 'followUps', id, value }),
    saveOps: (value) => dispatch({ type: 'ops', value }),
    saveManagement: (id, value) => dispatch({ type: 'artifact', key: 'management', id, value }),
    setDraft: (id, text) => dispatch({ type: 'draft', id, text }),
    clearDraft: (id) => dispatch({ type: 'clear-draft', id }),
    markReviewed: (id) => dispatch({ type: 'reviewed', id }),
  }), [state])
  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const value = useContext(DemoContext)
  if (!value) throw new Error('Demo state is unavailable')
  return value
}
