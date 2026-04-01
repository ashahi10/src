import type { EvidenceRef, Timestamp } from './common.js'
import type { ConfidenceScore } from './verification.js'

export type ContractId = string & { readonly __brand: 'ContractId' }

export type TimeoutPolicy = {
  maxDurationMs: number
  gracePeriodMs: number
  onTimeout: 'abort' | 'escalate' | 'extend'
}

export type AcceptanceTest = {
  testId: string
  description: string
  testType: 'schema_match' | 'assertion' | 'semantic' | 'custom'
  testDefinition: Record<string, unknown>
}

export type SubagentContract = {
  contractId: ContractId
  agentType: string
  objectiveScope: string
  inputSchemaRef: string
  outputSchemaRef: string
  toolAllowlist: string[]
  budgetPolicy: {
    maxCostUsd: number
    maxDurationMs: number
  }
  acceptanceTests: AcceptanceTest[]
  riskPolicyRef?: string
  timeoutPolicy: TimeoutPolicy
  createdAt: Timestamp
}

export type AcceptanceResult = {
  testId: string
  status: 'pass' | 'fail' | 'skipped' | 'error'
  details?: string
  durationMs: number
}

export type ExecutionResult = {
  contractId: ContractId
  executionStatus: 'completed' | 'failed' | 'timeout' | 'aborted'
  outputPayload: Record<string, unknown>
  validationStatus: 'valid' | 'invalid' | 'partial'
  acceptanceResults: AcceptanceResult[]
  confidenceSummary: ConfidenceScore
  uncertaintySummary: string[]
  evidenceRefs: EvidenceRef[]
  timestamp: Timestamp
}

export type MergeDecision = {
  contractId: ContractId
  eligible: boolean
  reasons: string[]
  mergedAt?: Timestamp
}

export const ARBITRATION_WEIGHTS = [
  'verification_strength',
  'confidence_quality',
  'recency_relevance',
] as const
export type ArbitrationWeight = (typeof ARBITRATION_WEIGHTS)[number]

export type ArbitrationInput = {
  conflictingResults: ExecutionResult[]
  weightPriority: ArbitrationWeight[]
}

export type ArbitrationOutput = {
  selectedResultIndex: number | null
  rationale: string
  escalateToHuman: boolean
  evidenceRefs: EvidenceRef[]
  timestamp: Timestamp
}
