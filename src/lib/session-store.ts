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

const SESSION_TTL_SECONDS = 60 * 60 * 24 // 24 hours

// In-memory store for local development
const memoryStore = new Map<string, { session: Session; expiresAt: number }>()

function sessionKey(id: string): string {
  return `session:${id}`
}

// Check if Vercel KV is available
async function getKV() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv')
    return kv
  }
  return null
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

  const kv = await getKV()
  if (kv) {
    await kv.set(sessionKey(id), session, { ex: SESSION_TTL_SECONDS })
  } else {
    // Local dev: use memory store
    memoryStore.set(sessionKey(id), {
      session,
      expiresAt: now + SESSION_TTL_SECONDS * 1000
    })
  }
  return session
}

export async function getSession(id: string): Promise<Session | null> {
  const kv = await getKV()
  if (kv) {
    return await kv.get<Session>(sessionKey(id))
  }

  // Local dev: use memory store
  const entry = memoryStore.get(sessionKey(id))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(sessionKey(id))
    return null
  }
  return entry.session
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

  const kv = await getKV()
  if (kv) {
    await kv.set(sessionKey(id), session, { ex: SESSION_TTL_SECONDS })
  } else {
    memoryStore.set(sessionKey(id), {
      session,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    })
  }
  return session
}

export async function markSessionReady(id: string): Promise<Session | null> {
  const session = await getSession(id)
  if (!session) return null
  session.status = 'ready'
  session.updatedAt = Date.now()

  const kv = await getKV()
  if (kv) {
    await kv.set(sessionKey(id), session, { ex: SESSION_TTL_SECONDS })
  } else {
    memoryStore.set(sessionKey(id), {
      session,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    })
  }
  return session
}

export async function deleteSession(id: string): Promise<boolean> {
  const kv = await getKV()
  if (kv) {
    const result = await kv.del(sessionKey(id))
    return result > 0
  }

  // Local dev: use memory store
  return memoryStore.delete(sessionKey(id))
}
