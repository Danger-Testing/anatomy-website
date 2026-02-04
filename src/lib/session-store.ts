import { AgentConfig } from '@/lib/types'
import { Redis } from '@upstash/redis'

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

// Get Redis client
function getRedis(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
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

  const redis = getRedis()
  if (redis) {
    await redis.set(sessionKey(id), JSON.stringify(session), { ex: SESSION_TTL_SECONDS })
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
  const redis = getRedis()
  if (redis) {
    const data = await redis.get<string>(sessionKey(id))
    if (!data) return null
    return typeof data === 'string' ? JSON.parse(data) : data
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

  const redis = getRedis()
  if (redis) {
    await redis.set(sessionKey(id), JSON.stringify(session), { ex: SESSION_TTL_SECONDS })
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

  const redis = getRedis()
  if (redis) {
    await redis.set(sessionKey(id), JSON.stringify(session), { ex: SESSION_TTL_SECONDS })
  } else {
    memoryStore.set(sessionKey(id), {
      session,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    })
  }
  return session
}

export async function deleteSession(id: string): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    const result = await redis.del(sessionKey(id))
    return result > 0
  }

  // Local dev: use memory store
  return memoryStore.delete(sessionKey(id))
}
