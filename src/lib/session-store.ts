import { AgentConfig } from '@/lib/types'

export type SessionStatus = 'editing' | 'ready'

export type Session = {
  id: string
  token: string
  config: AgentConfig
  status: SessionStatus
  createdAt: number
  updatedAt: number
}

const SESSION_TTL_MS = 1000 * 60 * 30 // 30 minutes

function getSessionMap(): Map<string, Session> {
  const globalAny = globalThis as typeof globalThis & { __anatomySessions?: Map<string, Session> }
  if (!globalAny.__anatomySessions) {
    globalAny.__anatomySessions = new Map<string, Session>()
  }
  return globalAny.__anatomySessions
}

function pruneExpiredSessions() {
  const sessions = getSessionMap()
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id)
    }
  }
}

export function createSession(id: string, token: string, config: AgentConfig): Session {
  pruneExpiredSessions()
  const now = Date.now()
  const session: Session = {
    id,
    token,
    config,
    status: 'editing',
    createdAt: now,
    updatedAt: now,
  }
  getSessionMap().set(id, session)
  return session
}

export function getSession(id: string): Session | null {
  pruneExpiredSessions()
  return getSessionMap().get(id) || null
}

export function verifyToken(id: string, token: string | null | undefined): boolean {
  if (!token) return false
  const session = getSession(id)
  if (!session) return false
  return session.token === token
}

export function updateSessionConfig(id: string, config: AgentConfig): Session | null {
  const session = getSession(id)
  if (!session) return null
  session.config = config
  session.updatedAt = Date.now()
  return session
}

export function markSessionReady(id: string): Session | null {
  const session = getSession(id)
  if (!session) return null
  session.status = 'ready'
  session.updatedAt = Date.now()
  return session
}

export function deleteSession(id: string): boolean {
  return getSessionMap().delete(id)
}
