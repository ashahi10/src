export type SessionId = string & { readonly __brand: 'SessionId' }
export type Timestamp = number

export type EvidenceRef = {
  type: 'transcript' | 'tool_result' | 'verification' | 'code_anchor' | 'decision_record' | 'external'
  uri: string
  label?: string
  timestamp?: Timestamp
}

export type AuditRecord = {
  recordId: string
  timestamp: Timestamp
  correlationId: string
  sessionId?: SessionId
  action: string
  details: Record<string, unknown>
}
