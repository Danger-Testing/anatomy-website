import { AgentConfig } from '@/lib/types'
import { Redis } from '@upstash/redis'
import { timingSafeEqual } from 'crypto'

export type SessionStatus = 'editing' | 'ready'

// Rate limiting: max attempts per session ID per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 5
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup of expired rate limit entries (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
  // Also cleanup expired sessions in memory store
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.expiresAt) {
      memoryStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

// Validate session ID format (32 hex chars = 128 bits)
export function isValidSessionId(id: string): boolean {
  return typeof id === 'string' && /^[a-f0-9]{32}$/.test(id)
}

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export type Session = {
  id: string
  token: string
  config: AgentConfig
  status: SessionStatus
  createdAt: number
  updatedAt: number
}

const SESSION_TTL_SECONDS = 60 * 15 // 15 minutes

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
  // Validate session ID format to prevent injection
  if (!isValidSessionId(id)) return null

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

export function checkRateLimit(id: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = `ratelimit:${id}`
  const entry = rateLimitStore.get(key)

  // Clean up expired entry
  if (entry && now > entry.resetAt) {
    rateLimitStore.delete(key)
  }

  const current = rateLimitStore.get(key)
  if (!current) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }

  current.count++
  return { allowed: true }
}

export async function verifyToken(id: string, token: string | null | undefined): Promise<boolean | { rateLimited: true; retryAfter: number }> {
  // Validate session ID format first
  if (!isValidSessionId(id)) return false

  // Check rate limit before verification
  const rateLimit = checkRateLimit(id)
  if (!rateLimit.allowed) {
    return { rateLimited: true, retryAfter: rateLimit.retryAfter! }
  }

  if (!token) return false
  const session = await getSession(id)
  if (!session) return false

  // Use constant-time comparison to prevent timing attacks
  return secureCompare(session.token, token)
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
