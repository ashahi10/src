import type { Timestamp } from './common.js'
import type { MissionId, MissionStepId } from './mission.js'

export type VerificationId = string & { readonly __brand: 'VerificationId' }

export type CheckStatus = 'pass' | 'fail' | 'skipped' | 'timeout' | 'error'

export type VerificationCheckResult = {
  checkId: string
  checkType: 'test' | 'lint' | 'typecheck' | 'policy' | 'semantic' | 'custom'
  status: CheckStatus
  evidenceRef?: string
  durationMs: number
  errorSummary?: string
}

export type VerificationWaiver = {
  waiverId: string
  scope: string
  owner: string
  justification: string
  riskClass: 'R1' | 'R2' | 'R3'
  expiresAt: Timestamp
  decisionId: string
}

export type VerificationPolicy = {
  policyId: string
  objectiveClass: string
  requiredChecks: Array<{
    checkType: VerificationCheckResult['checkType']
    required: boolean
    timeoutMs?: number
  }>
  passCriteria: 'all_required_pass' | 'percentage_threshold'
  passThreshold?: number
  allowWaivers: boolean
}

export type ConfidenceReason = {
  category:
    | 'missing_evidence'
    | 'bounded_risk'
    | 'partial_validation'
    | 'waived_failure'
    | 'environment_mismatch'
    | 'stale_context'
    | 'full_coverage'
  description: string
  severity: 'info' | 'warning' | 'critical'
}

export type ConfidenceScore = {
  value: number
  reasons: ConfidenceReason[]
}

export type ProofArtifact = {
  verificationId: VerificationId
  missionId?: MissionId
  stepId?: MissionStepId
  checks: VerificationCheckResult[]
  waivers: VerificationWaiver[]
  unresolved: string[]
  verdict: 'pass' | 'fail' | 'waived_pass'
  confidence: ConfidenceScore
  timestamp: Timestamp
}

export type ConfidenceSummary = {
  overall: ConfidenceScore
  perStep: Array<{ stepId: MissionStepId; confidence: ConfidenceScore }>
}

export type VerificationSummary = {
  proofArtifact: ProofArtifact
  confidenceSummary: ConfidenceSummary
}
