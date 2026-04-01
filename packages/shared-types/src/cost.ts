import type { Timestamp } from './common.js'

export const COST_BANDS = ['cheap', 'balanced', 'thorough'] as const
export type CostBand = (typeof COST_BANDS)[number]

export const EXECUTION_PHASES = ['discovery', 'synthesis', 'critical_verification'] as const
export type ExecutionPhase = (typeof EXECUTION_PHASES)[number]

export type BudgetEnvelope = {
  min: number
  expected: number
  max: number
  currency: 'USD'
}

export type PreflightInput = {
  objectiveDescription: string
  complexityIndicators: string[]
  expectedToolProfile: string[]
  riskClassBaseline?: 'R1' | 'R2' | 'R3'
  historicalCostRef?: string
  policyProfile?: string
}

export type BandOption = {
  band: CostBand
  budgetEnvelope: BudgetEnvelope
  qualityProfile: string
  riskProfile: string
  verificationDepth: 'minimal' | 'standard' | 'comprehensive'
  estimateConfidence: number
  uncertaintyReasons: string[]
}

export type PreflightOutput = {
  recommendedBand: CostBand
  selectedBand?: CostBand
  bandOptions: BandOption[]
  phaseStrategy: Array<{
    phase: ExecutionPhase
    estimatedCost: BudgetEnvelope
    keyActions: string[]
  }>
  totalBudgetEnvelope: BudgetEnvelope
}

export type AdaptationRecord = {
  adaptationId: string
  phase: ExecutionPhase
  trigger: string
  previousStrategy: string
  newStrategy: string
  rationale: string
  costImpact: BudgetEnvelope
  timestamp: Timestamp
}

export type ReusableArtifact = {
  artifactId: string
  semanticKey: string
  verified: boolean
  freshnessScore: number
  createdAt: Timestamp
  lastUsedAt: Timestamp
  compatibilityVersion: string
  evidenceRef?: string
}
