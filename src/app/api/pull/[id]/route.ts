import { NextRequest, NextResponse } from 'next/server'
import { getSession, deleteSession, verifyToken } from '@/lib/session-store'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/pull/[id] - Agent polls for changes
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!verifyToken(id, token)) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

  const session = getSession(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found or expired' }, { status: 404 })
  }

  // If still editing, tell agent to wait
  if (session.status === 'editing') {
    return NextResponse.json({
      success: true,
      status: 'editing',
      message: 'Human is still editing. Poll again later.',
    })
  }

  // Ready - return config and delete session
  const config = session.config
  deleteSession(id)

  return NextResponse.json({
    success: true,
    status: 'ready',
    config: config,
    message: 'Changes ready. Apply to your local files.',
  })
}
