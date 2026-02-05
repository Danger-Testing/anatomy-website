import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { identity } = await request.json()

    if (!identity || typeof identity !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Identity content required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Based on this identity description, suggest ONE perfect song that captures the essence of this personality. Be creative and insightful.

Identity:
${identity}

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{"song": "Song Title", "artist": "Artist Name", "reason": "One sentence explaining why this song is perfect"}`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', errorText)
      return NextResponse.json(
        { success: false, error: 'Failed to generate suggestion' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.content?.[0]?.text

    try {
      const suggestion = JSON.parse(content)
      return NextResponse.json({ success: true, suggestion })
    } catch {
      // If parsing fails, return the raw text
      return NextResponse.json({
        success: true,
        suggestion: { song: content, artist: 'Unknown', reason: '' }
      })
    }
  } catch (error) {
    console.error('Song suggestion error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
