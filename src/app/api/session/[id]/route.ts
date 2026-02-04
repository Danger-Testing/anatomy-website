import { NextRequest, NextResponse } from 'next/server'
import { AgentConfig } from '@/lib/types'
import { getSession, updateSessionConfig, markSessionReady, verifyToken } from '@/lib/session-store'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!await verifyToken(id, token)) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

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

  if (!await verifyToken(id, token)) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

  const body = await request.json()
  const config: AgentConfig = body.config

  if (!config || !config.files) {
    return NextResponse.json({ success: false, error: 'Invalid config format' }, { status: 400 })
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

  if (!await verifyToken(id, token)) {
    return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 })
  }

  const session = await markSessionReady(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, status: 'ready' })
}
