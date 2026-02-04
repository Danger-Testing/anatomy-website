import { kv } from '@vercel/kv'
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

const SESSION_TTL_SECONDS = 60 * 30 // 30 minutes

function sessionKey(id: string): string {
  return `session:${id}`
}

export async function createSession(id: string, token: string, config: AgentConfig): Promise<Session> {
  const now = Date.now()
  const session: Session = {
    id,
    token,
    config,
    status: 'editing',
    createdAt: now,
    updatedAt: now,
  }
  await kv.set(sessionKey(id), session, { ex: SESSION_TTL_SECONDS })
  return session
}

export async function getSession(id: string): Promise<Session | null> {
  return await kv.get<Session>(sessionKey(id))
}

export async function verifyToken(id: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false
  const session = await getSession(id)
  if (!session) return false
  return session.token === token
}

export async function updateSessionConfig(id: string, config: AgentConfig): Promise<Session | null> {
  const session = await getSession(id)
  if (!session) return null
  session.config = config
  session.updatedAt = Date.now()
  await kv.set(sessionKey(id), session, { ex: SESSION_TTL_SECONDS })
  return session
}

export async function markSessionReady(id: string): Promise<Session | null> {
  const session = await getSession(id)
  if (!session) return null
  session.status = 'ready'
  session.updatedAt = Date.now()
  await kv.set(sessionKey(id), session, { ex: SESSION_TTL_SECONDS })
  return session
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await kv.del(sessionKey(id))
  return result > 0
}
