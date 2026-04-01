import type { AuditRecord, Timestamp } from './common.js'

export const RISK_CLASSES = ['R1', 'R2', 'R3'] as const
export type RiskClass = (typeof RISK_CLASSES)[number]

export const DECISION_MODES = ['auto', 'scoped_ask', 'explicit_ask'] as const
export type DecisionMode = (typeof DECISION_MODES)[number]

export type RiskScoringDimension = {
  name: 'data_sensitivity' | 'blast_radius' | 'reversibility' | 'environment_criticality'
  score: number
  weight: number
  reasoning: string
}

export type RiskEvaluationInput = {
  actionDescriptor: string
  actionType: 'tool' | 'command' | 'file_operation' | 'network' | 'system' | 'delegation'
  targetScope?: string
  parsedInputs: Record<string, unknown>
  executionContext: {
    mode: 'interactive' | 'headless' | 'remote' | 'bridge'
    environment: string
    sessionFlags: Record<string, boolean>
  }
  historicalContext?: {
    recentDenials: number
    recentFailures: number
  }
}

export type RiskEvaluationOutput = {
  riskClass: RiskClass
  decisionMode: DecisionMode
  policyReasons: string[]
  requiredApprovers: string[]
  auditRecordRef: string
  dimensions: RiskScoringDimension[]
  policyVersion: string
}

export type RiskPolicyProfile = {
  profileId: string
  version: string
  name: string
  description: string
  dimensionWeights: Record<RiskScoringDimension['name'], number>
  classThresholds: {
    r2MinScore: number
    r3MinScore: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type RiskAuditRecord = AuditRecord & {
  riskClass: RiskClass
  decisionMode: DecisionMode
  dimensions: RiskScoringDimension[]
  policyVersion: string
  outcome: 'approved' | 'denied' | 'escalated' | 'fallback'
}
