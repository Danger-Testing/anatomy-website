import { NextRequest, NextResponse } from 'next/server'
import { getSession, deleteSession, verifyToken } from '@/lib/session-store'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!await verifyToken(id, token)) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

  const session = await getSession(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found or expired' }, { status: 404 })
  }

  if (session.status === 'editing') {
    return NextResponse.json({
      success: true,
      status: 'editing',
      message: 'Human is still editing. Poll again later.',
    })
  }

  const config = session.config
  // Don't delete immediately - let session expire naturally (24 hours)
  // This allows agent to retry if needed

  return NextResponse.json({
    success: true,
    status: 'ready',
    config: config,
    message: 'Changes ready. Apply to your local files.',
  })
}
