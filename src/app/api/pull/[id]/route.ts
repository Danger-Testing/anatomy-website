import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyToken } from '@/lib/session-store'

type RouteParams = { params: Promise<{ id: string }> }

interface Understanding {
  summary: string
  essence: string[]
  howToBe: string
}

async function generateUnderstanding(files: { [key: string]: string }): Promise<Understanding | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  // Combine all file contents for analysis
  const allContent = Object.entries(files)
    .map(([filename, content]) => `## ${filename}\n${content}`)
    .join('\n\n---\n\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You're helping an AI agent understand the human they'll be working with. Based on these configuration files the human just edited, create a warm understanding of who this person is.

${allContent}

Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "summary": "A 2-3 sentence warm narrative about who this person is, written as if you're telling the AI agent about their human",
  "essence": ["3-5 key traits or values, as short phrases"],
  "howToBe": "One sentence on how the AI should behave with this person"
}

Be warm and insightful. This is about understanding a real person.`
          }
        ]
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data.content?.[0]?.text

    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token')

  const result = await verifyToken(id, token)
  if (typeof result === 'object' && result.rateLimited) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
    )
  }
  if (!result) {
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
      message: 'Your human is still sharing. Wait for them.',
    })
  }

  const config = session.config

  // Generate understanding from the files
  const understanding = await generateUnderstanding(config.files)

  return NextResponse.json({
    success: true,
    status: 'ready',
    understanding: understanding || {
      summary: 'Your human has shared their configuration with you.',
      essence: [],
      howToBe: 'Review the files to understand their preferences.'
    },
    files: config.files,
    message: 'Your human has shared themselves with you.',
  })
}
