import { NextRequest, NextResponse } from 'next/server'
import { AgentConfig } from '@/lib/types'
import { generateToken, generateSessionId } from '@/lib/auth'
import { createSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
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
    pull_url: `${origin}/api/pull/${sessionId}`,
    expires_in: '30 minutes'
  })
}
