import type { EvidenceRef, SessionId, Timestamp } from './common.js'
import type { ConfidenceSummary, VerificationSummary } from './verification.js'

export type MissionId = string & { readonly __brand: 'MissionId' }
export type MissionStepId = string & { readonly __brand: 'MissionStepId' }

export const MISSION_STATES = [
  'created',
  'planned',
  'executing',
  'verifying',
  'completed',
  'aborted',
  'failed',
  'rolled_back',
] as const
export type MissionState = (typeof MISSION_STATES)[number]

export type MissionBudgetPolicy = {
  maxCostUsd?: number
  costBand: 'cheap' | 'balanced' | 'thorough'
  maxDurationMs?: number
}

export type MissionRollbackStrategy = {
  type: 'git_revert' | 'file_restore' | 'manual' | 'none'
  checkpointRef?: string
}

export type MissionSuccessCriterion = {
  criterionId: string
  description: string
  checkType: 'test' | 'lint' | 'typecheck' | 'semantic' | 'manual' | 'custom'
  checkCommand?: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
  evidenceRef?: string
}

export type MissionStep = {
  stepId: MissionStepId
  intent: string
  actionType: 'tool' | 'command' | 'subagent' | 'manual_boundary'
  actionRef?: string
  expectedOutcome: string
  actualOutcome?: string
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped'
  evidenceRefs: EvidenceRef[]
  riskClass?: 'R1' | 'R2' | 'R3'
  startedAt?: Timestamp
  endedAt?: Timestamp
}

export type Mission = {
  missionId: MissionId
  sessionId: SessionId
  parentMissionId?: MissionId
  objective: string
  constraints: string[]
  budgetPolicy: MissionBudgetPolicy
  riskPolicyRef?: string
  successCriteria: MissionSuccessCriterion[]
  rollbackStrategy: MissionRollbackStrategy
  state: MissionState
  steps: MissionStep[]
  verificationSummary?: VerificationSummary
  confidenceSummary?: ConfidenceSummary
  createdAt: Timestamp
  updatedAt: Timestamp
  checkpointIndex: number
}

export type MissionTransitionEvent = {
  missionId: MissionId
  fromState: MissionState
  toState: MissionState
  timestamp: Timestamp
  correlationId: string
  reason?: string
}
