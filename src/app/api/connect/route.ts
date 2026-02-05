import { NextRequest, NextResponse } from 'next/server'
import { AgentConfig } from '@/lib/types'
import { generateToken, generateSessionId } from '@/lib/auth'
import { createSession } from '@/lib/session-store'

// Rate limiting for session creation by IP
const CONNECT_RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const CONNECT_RATE_LIMIT_MAX = 10 // max sessions per minute per IP
const connectRateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

function checkConnectRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = connectRateLimitStore.get(ip)

  if (entry && now > entry.resetAt) {
    connectRateLimitStore.delete(ip)
  }

  const current = connectRateLimitStore.get(ip)
  if (!current) {
    connectRateLimitStore.set(ip, { count: 1, resetAt: now + CONNECT_RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (current.count >= CONNECT_RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }

  current.count++
  return { allowed: true }
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of connectRateLimitStore.entries()) {
    if (now > entry.resetAt) connectRateLimitStore.delete(key)
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = getClientIp(request)
  const rateLimit = checkConnectRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many sessions created. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    )
  }

  let body: { files?: Record<string, string> } = {}

  try {
    body = await request.json()
  } catch {
    // Allow empty body, will use default config
  }

  const sessionId = generateSessionId()
  const token = generateToken()

  const config: AgentConfig = {
    files: body.files || {
      'IDENTITY.md': '# Identity\n\nDescribe who this agent is.',
      'SOUL.md': '# Soul\n\nDefine the personality and values.',
      'MEMORY.md': '# Memory\n\nPersistent memories and context.',
    }
  }

  await createSession(sessionId, token, config)

  const origin = request.nextUrl.origin

  return NextResponse.json({
    success: true,
    session_id: sessionId,
    token: token,
    editor_url: `${origin}/edit/${sessionId}?token=${token}`,
    pull_url: `${origin}/api/pull/${sessionId}?token=${token}`,
    revoke_url: `${origin}/api/session/${sessionId}?token=${token}`,
    expires_in: '15 minutes'
  })
}
