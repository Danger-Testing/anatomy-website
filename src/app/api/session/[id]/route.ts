import { NextRequest, NextResponse } from 'next/server'
import { AgentConfig } from '@/lib/types'
import { getSession, updateSessionConfig, markSessionReady, verifyToken, deleteSession } from '@/lib/session-store'

type RouteParams = { params: Promise<{ id: string }> }

// Security limits
const MAX_FILES = 20
const MAX_FILE_SIZE = 100000 // 100KB per file
const MAX_FILENAME_LENGTH = 50

// Validate filename to prevent path traversal
function isValidFilename(name: string): boolean {
  if (typeof name !== 'string') return false
  if (name.length === 0 || name.length > MAX_FILENAME_LENGTH) return false
  // Only allow alphanumeric, underscore, hyphen, and .md extension
  // Reject path separators and other dangerous chars
  return /^[a-zA-Z0-9_-]+\.md$/.test(name)
}

function validateConfig(config: AgentConfig): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid config format' }
  }
  if (!config.files || typeof config.files !== 'object') {
    return { valid: false, error: 'Missing files object' }
  }

  const fileEntries = Object.entries(config.files)
  if (fileEntries.length > MAX_FILES) {
    return { valid: false, error: `Too many files (max ${MAX_FILES})` }
  }

  for (const [filename, content] of fileEntries) {
    if (!isValidFilename(filename)) {
      return { valid: false, error: `Invalid filename: ${filename.slice(0, 20)}` }
    }
    if (typeof content !== 'string') {
      return { valid: false, error: 'File content must be string' }
    }
    if (content.length > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large: ${filename} (max ${MAX_FILE_SIZE} bytes)` }
    }
  }

  return { valid: true }
}

async function checkAuth(id: string, token: string | null) {
  const result = await verifyToken(id, token)
  if (typeof result === 'object' && result.rateLimited) {
    return { error: NextResponse.json(
      { success: false, error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
    )}
  }
  if (!result) {
    return { error: NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 }) }
  }
  return { ok: true }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  const auth = await checkAuth(id, token)
  if (auth.error) return auth.error

  const session = await getSession(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    config: session.config,
    status: session.status,
    updated_at: new Date(session.updatedAt).toISOString(),
  })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  const auth = await checkAuth(id, token)
  if (auth.error) return auth.error

  const body = await request.json()
  const config: AgentConfig = body.config

  const validation = validateConfig(config)
  if (!validation.valid) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
  }

  const session = await updateSessionConfig(id, config)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  const auth = await checkAuth(id, token)
  if (auth.error) return auth.error

  const session = await markSessionReady(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, status: 'ready' })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  const auth = await checkAuth(id, token)
  if (auth.error) return auth.error

  const deleted = await deleteSession(id)
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Session revoked' })
}
