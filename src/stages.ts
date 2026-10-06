export interface StageLook {
  ink: string
  wash: string
  bar: string
  soft: string
}

const STAGES: Record<string, StageLook> = {
  New: { ink: '#0058b0', wash: '#e8f2ff', bar: '#007aff', soft: '#d6e8ff' },
  Contacted: { ink: '#0f766e', wash: '#e6f7f5', bar: '#0f766e', soft: '#c8f4f1' },
  Qualified: { ink: '#5b35c5', wash: '#f3eeff', bar: '#6d28d9', soft: '#e4d9ff' },
  Viewing: { ink: '#9a3412', wash: '#fff3e0', bar: '#c2410c', soft: '#ffe0b8' },
  Proposal: { ink: '#166534', wash: '#e8f8ee', bar: '#15803d', soft: '#c8f0d6' },
}

const FALLBACK: StageLook = { ink: '#3a3a3c', wash: '#f2f2f7', bar: '#8e8e93', soft: '#e5e5ea' }

export function stageLook(status: string): StageLook {
  return STAGES[status] ?? FALLBACK
}
