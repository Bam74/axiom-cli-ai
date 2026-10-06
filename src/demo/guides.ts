export type GuideModule = 'overview' | 'projects' | 'sales' | 'customer' | 'management' | 'sources'

export interface GuideStep {
  click: string
  notice: string
  next?: { label: string; to: string }
  complete?: string
}

export interface GuideScript {
  title: string
  steps: GuideStep[]
}

export const GUIDES: Record<GuideModule, GuideScript> = {
  overview: {
    title: 'Enterprise Overview',
    steps: [
      {
        click: 'Use Start Guided Demo when you want a clean recovery.',
        notice: 'The home screen shows four figures and three signals. The investigation happens inside the modules.',
      },
    ],
  },
  projects: {
    title: 'Project Intelligence',
    steps: [
      {
        click: 'Select Astra Heights Tower 2.',
        notice: 'Projects show both business status and supporting metrics.',
      },
      {
        click: 'Click Generate Project Brief.',
        notice: 'AI combines several documents into one management view.',
      },
      {
        click: 'Open Sources Used.',
        notice: 'Every important statement can be traced back to business information.',
      },
      {
        click: 'Click Show What Changed.',
        notice: 'Look for 7 days → 12 days and 14 Oct → 3 Nov.',
      },
      {
        click: 'Click Prepare Executive Update.',
        notice: 'AI prepares the work, while the Project Director remains the reviewer.',
        next: { label: 'Sales & Buyer Intelligence', to: '/sales' },
      },
    ],
  },
  sales: {
    title: 'Sales & Buyer Intelligence',
    steps: [
      {
        click: 'Open Maria Santos.',
        notice: 'AI has access to the buyer context and previous interactions.',
      },
      {
        click: 'Click Prepare for Buyer Conversation.',
        notice: 'This is a context-aware briefing, not a generic sales script.',
      },
      {
        click: 'Click Find Suitable Properties.',
        notice: 'Recommendations come from the approved inventory.',
      },
      {
        click: 'Click Compare Options.',
        notice: 'The system explains why each property may fit.',
      },
      {
        click: 'Click Draft Follow-Up.',
        notice: 'There is a verification checklist before the message can be used.',
        next: { label: 'Customer & Property Intelligence', to: '/customer' },
      },
    ],
  },
  customer: {
    title: 'Customer & Property Intelligence',
    steps: [
      {
        click: 'Start with the 427 customer cases.',
        notice: 'AI can classify a high volume of text into useful themes.',
      },
      {
        click: 'Open Unit Defects.',
        notice: 'Look at the issue breakdown.',
      },
      {
        click: 'Open Water-Related Cases.',
        notice: 'The system finds an unusual project concentration.',
      },
      {
        click: 'Inspect Central Park Tower.',
        notice: 'Look for 17 cases, Floors 11–16, and 2.4× the portfolio rate.',
      },
      {
        click: 'Click Prepare Operations Brief.',
        notice: 'AI recommends investigation rather than declaring a root cause.',
        next: { label: 'Management Intelligence', to: '/management' },
      },
    ],
  },
  management: {
    title: 'Management Intelligence',
    steps: [
      {
        click: 'Click Where should management focus this week?',
        notice: 'The question pulls signals from projects, sales, and customer experience.',
      },
      {
        click: 'Review the three priorities.',
        notice: 'AI is combining signals from different functions.',
      },
      {
        click: 'Open View Evidence for one priority.',
        notice: 'The recommendation can be traced back to underlying data.',
      },
      {
        click: 'Return to Management Intelligence.',
        notice: 'AI does not replace management judgment. It changes how quickly leaders can find the issues that deserve judgment.',
        complete: 'Demo Complete',
      },
    ],
  },
  sources: {
    title: 'Data & Sources',
    steps: [
      {
        click: 'Open a file if someone asks where a figure came from.',
        notice: 'Everything in this environment is synthetic training data.',
      },
    ],
  },
}

export function moduleForPath(pathname: string): GuideModule {
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/sales')) return 'sales'
  if (pathname.startsWith('/customer')) return 'customer'
  if (pathname.startsWith('/management')) return 'management'
  if (pathname.startsWith('/sources')) return 'sources'
  return 'overview'
}

export const NAV_ITEMS = [
  { to: '/', label: 'Enterprise Overview', module: 'overview' as const },
  { to: '/projects', label: 'Project Intelligence', module: 'projects' as const },
  { to: '/sales', label: 'Sales & Buyer Intelligence', module: 'sales' as const },
  { to: '/customer', label: 'Customer & Property Intelligence', module: 'customer' as const },
  { to: '/management', label: 'Management Intelligence', module: 'management' as const },
]
